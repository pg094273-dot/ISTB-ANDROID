import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const STB_USER_AGENT =
  'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';
const VLC_USER_AGENT = 'VLC/3.0.18 LibVLC/3.0.18';

interface PendingStream {
  res: Response;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  firstChunk: Uint8Array | null;
  kind: 'hls' | 'mpegts' | 'native';
  finalUrl: string;
  contentType: string;
  mac?: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingStreams = new Map<string, PendingStream>();

function buildStreamHeaders(mac?: string, useStbUa = false, range?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': useStbUa || mac ? STB_USER_AGENT : VLC_USER_AGENT,
    Accept: '*/*',
  };
  if (mac) {
    headers['Cookie'] = `mac=${mac}; stb_lang=en; timezone=UTC`;
    headers['X-User-Agent'] = 'Model: MAG250; Link: WiFi';
  }
  if (range) {
    headers['Range'] = range;
  }
  return headers;
}

async function fetchWithConnectTimeout(
  url: string,
  options: RequestInit,
  connectTimeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), connectTimeoutMs);

  const externalSignal = options.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function rewriteHlsPlaylist(text: string, baseUrl: URL, mac?: string): string {
  const macSuffix = mac ? `&mac=${encodeURIComponent(mac)}` : '';
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_m, uri) => {
          try {
            const abs = new URL(uri, baseUrl).toString();
            return `URI="/api/stream-proxy?url=${encodeURIComponent(abs)}${macSuffix}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }

      try {
        const abs = new URL(trimmed, baseUrl).toString();
        return `/api/stream-proxy?url=${encodeURIComponent(abs)}${macSuffix}`;
      } catch {
        return line;
      }
    })
    .join('\n');
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '5mb' }));

  // Server-side proxy for M3U, Xtream Codes, and Stalker Middleware API requests
  app.post('/api/iptv-proxy', async (req, res) => {
    const { url, headers = {}, method = 'GET' } = req.body || {};

    if (!url || typeof url !== 'string') {
      res.status(400).json({ ok: false, status: 400, error: 'URL de portal no proporcionada.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        res.status(400).json({ ok: false, status: 400, error: 'Solo se admiten URLs HTTP o HTTPS.' });
        return;
      }
    } catch {
      res.status(400).json({ ok: false, status: 400, error: 'La URL del portal no tiene un formato válido.' });
      return;
    }

    try {
      const upstreamHeaders: Record<string, string> = {
        'User-Agent': STB_USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        ...headers,
      };

      const upstreamRes = await fetch(parsedUrl.toString(), {
        method: method === 'POST' ? 'POST' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
      });

      const contentType = upstreamRes.headers.get('content-type') || 'text/plain';
      const text = await upstreamRes.text();

      res.json({
        ok: upstreamRes.ok,
        status: upstreamRes.status,
        contentType,
        body: text,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
      let friendly = `No se pudo conectar con ${parsedUrl.host}`;
      if (message.includes('timeout') || message.includes('AbortError')) {
        friendly = `Tiempo de espera agotado al conectar con ${parsedUrl.host}.`;
      } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
        friendly = `Servidor no encontrado o conexión rechazada (${parsedUrl.host}).`;
      }
      res.json({
        ok: false,
        status: 502,
        error: friendly,
      });
    }
  });

  // Probe stream type AND keep the open upstream response for zero-loss handoff to /api/stream-proxy
  app.post('/api/probe-stream', async (req, res) => {
    const { url, mac } = req.body || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ ok: false, status: 400, error: 'Missing url' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ ok: false, status: 400, error: 'URL de canal no válida' });
      return;
    }

    try {
      let upstreamRes = await fetchWithConnectTimeout(
        parsedUrl.toString(),
        {
          headers: buildStreamHeaders(mac, false),
          redirect: 'follow',
        },
        12000
      );

      if (!upstreamRes.ok && (upstreamRes.status === 403 || upstreamRes.status === 401 || upstreamRes.status === 458)) {
        upstreamRes.body?.cancel().catch(() => {});
        upstreamRes = await fetchWithConnectTimeout(
          parsedUrl.toString(),
          {
            headers: buildStreamHeaders(mac, true),
            redirect: 'follow',
          },
          12000
        );
      }

      if (!upstreamRes.ok) {
        upstreamRes.body?.cancel().catch(() => {});
        res.json({
          ok: false,
          status: upstreamRes.status,
          error: `El servidor de streaming (${parsedUrl.host}) respondió HTTP ${upstreamRes.status}.`,
        });
        return;
      }

      const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
      const finalUrl = upstreamRes.url || parsedUrl.toString();

      let kind: 'hls' | 'mpegts' | 'native' = 'mpegts';
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      let firstChunk: Uint8Array | null = null;

      if (
        contentType.includes('mpegurl') ||
        contentType.includes('m3u') ||
        finalUrl.toLowerCase().includes('.m3u8')
      ) {
        kind = 'hls';
      } else if (
        contentType.includes('video/mp4') ||
        contentType.includes('video/webm') ||
        contentType.includes('video/ogg')
      ) {
        kind = 'native';
      } else if (
        contentType.includes('mp2t') ||
        contentType.includes('video/ts') ||
        finalUrl.toLowerCase().includes('.ts')
      ) {
        kind = 'mpegts';
      } else if (upstreamRes.body) {
        reader = upstreamRes.body.getReader();
        const { value } = await reader.read();
        if (value && value.length > 0) {
          firstChunk = value;
          const headStr = Buffer.from(value.slice(0, 32)).toString('utf8').trimStart();
          if (headStr.startsWith('#EXTM3U') || headStr.startsWith('#EXT-X-')) {
            kind = 'hls';
          } else if (value[0] === 0x47) {
            kind = 'mpegts';
          } else if (contentType.startsWith('video/')) {
            kind = 'native';
          }
        }
      }

      const streamId = crypto.randomUUID();
      const timeoutId = setTimeout(() => {
        const entry = pendingStreams.get(streamId);
        if (entry) {
          pendingStreams.delete(streamId);
          entry.reader?.cancel().catch(() => {});
          entry.res.body?.cancel().catch(() => {});
        }
      }, 15000);

      pendingStreams.set(streamId, {
        res: upstreamRes,
        reader,
        firstChunk,
        kind,
        finalUrl,
        contentType,
        mac,
        timeoutId,
      });

      res.json({
        ok: true,
        status: upstreamRes.status,
        kind,
        streamId,
        finalUrl,
        contentType,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      res.json({
        ok: false,
        status: 502,
        error: msg.includes('AbortError')
          ? `Tiempo de espera agotado al conectar con ${parsedUrl.host}.`
          : `No se pudo conectar con ${parsedUrl.host}.`,
      });
    }
  });

  // Stream proxy supporting both pre-probed streamId handoff and direct url requests
  app.get('/api/stream-proxy', async (req, res) => {
    const streamId = typeof req.query.streamId === 'string' ? req.query.streamId : undefined;
    const targetUrl = typeof req.query.url === 'string' ? req.query.url : undefined;
    const mac = typeof req.query.mac === 'string' ? req.query.mac : undefined;

    let pending: PendingStream | undefined;
    if (streamId) {
      pending = pendingStreams.get(streamId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingStreams.delete(streamId);
      }
    }

    if (!pending && !targetUrl) {
      res.status(400).send('Missing url or expired streamId');
      return;
    }

    const clientAbort = new AbortController();
    req.on('close', () => {
      clientAbort.abort();
    });

    try {
      let upstreamRes: Response;
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      let firstChunk: Uint8Array | null = null;
      let finalUrl: URL;
      let contentType: string;
      let effectiveMac = mac;

      if (pending) {
        upstreamRes = pending.res;
        reader = pending.reader;
        firstChunk = pending.firstChunk;
        finalUrl = new URL(pending.finalUrl);
        contentType = pending.contentType;
        effectiveMac = pending.mac || mac;
      } else {
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(targetUrl!);
          if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            res.status(400).send('Invalid protocol');
            return;
          }
        } catch {
          res.status(400).send('Invalid URL');
          return;
        }

        upstreamRes = await fetchWithConnectTimeout(
          parsedUrl.toString(),
          {
            headers: buildStreamHeaders(effectiveMac, false, req.headers.range),
            redirect: 'follow',
            signal: clientAbort.signal,
          },
          15000
        );

        if (!upstreamRes.ok && (upstreamRes.status === 403 || upstreamRes.status === 401 || upstreamRes.status === 458)) {
          upstreamRes.body?.cancel().catch(() => {});
          upstreamRes = await fetchWithConnectTimeout(
            parsedUrl.toString(),
            {
              headers: buildStreamHeaders(effectiveMac, true, req.headers.range),
              redirect: 'follow',
              signal: clientAbort.signal,
            },
            15000
          );
        }

        if (!upstreamRes.ok && upstreamRes.status !== 206) {
          res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.status}`);
          return;
        }

        finalUrl = new URL(upstreamRes.url || parsedUrl.toString());
        contentType = (upstreamRes.headers.get('content-type') || 'application/octet-stream').toLowerCase();
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');

      const isPlaylist =
        pending?.kind === 'hls' ||
        contentType.includes('mpegurl') ||
        contentType.includes('m3u') ||
        finalUrl.pathname.toLowerCase().endsWith('.m3u8');

      if (isPlaylist) {
        const chunks: Uint8Array[] = [];
        if (firstChunk) chunks.push(firstChunk);
        if (!reader && upstreamRes.body) {
          reader = upstreamRes.body.getReader();
        }
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        }
        const text = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(rewriteHlsPlaylist(text, finalUrl, effectiveMac));
        return;
      }

      res.status(upstreamRes.status);
      res.setHeader('Content-Type', contentType || 'video/mp2t');
      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      if (firstChunk) {
        res.write(Buffer.from(firstChunk));
      }

      if (!reader && upstreamRes.body) {
        reader = upstreamRes.body.getReader();
      }

      if (!reader) {
        res.end();
        return;
      }

      req.on('close', () => {
        reader?.cancel().catch(() => {});
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const okToWrite = res.write(Buffer.from(value));
          if (!okToWrite) {
            await new Promise<void>((resolve) => res.once('drain', resolve));
          }
        }
      }
      res.end();
    } catch {
      if (!res.headersSent) {
        res.status(502).send('Stream proxy error');
      } else {
        res.end();
      }
    }
  });

  // Verify if a URL is publicly accessible (without AI Studio auth redirect) and exposes manifest + SW for PWABuilder
  app.post('/api/check-pwa-url', async (req, res) => {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ ok: false, message: 'URL no proporcionada.' });
      return;
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(url.trim());
    } catch {
      res.status(400).json({ ok: false, message: 'Formato de URL no válido.' });
      return;
    }

    try {
      const rootRes = await fetchWithConnectTimeout(baseUrl.toString(), { redirect: 'manual' }, 8000);
      if (rootRes.status >= 300 && rootRes.status < 400) {
        const loc = rootRes.headers.get('location') || '';
        res.json({
          ok: false,
          status: rootRes.status,
          reason: 'auth_redirect',
          message: `La URL redirige a inicio de sesión (${loc.slice(0, 60)}). PWABuilder no puede leer una URL privada: usa la URL tras pulsar "Deploy" en AI Studio.`,
        });
        return;
      }

      if (!rootRes.ok) {
        res.json({
          ok: false,
          status: rootRes.status,
          reason: 'http_error',
          message: `La URL devolvió HTTP ${rootRes.status}. Asegúrate de haber hecho Deploy de la app primero.`,
        });
        return;
      }

      const manifestUrl = new URL('/manifest.webmanifest', baseUrl).toString();
      const swUrl = new URL('/sw.js', baseUrl).toString();
      const [mRes, sRes] = await Promise.all([
        fetchWithConnectTimeout(manifestUrl, { redirect: 'manual' }, 6000),
        fetchWithConnectTimeout(swUrl, { redirect: 'manual' }, 6000),
      ]);

      if (!mRes.ok || !sRes.ok) {
        res.json({
          ok: false,
          status: 200,
          reason: 'missing_pwa_assets',
          message: `La URL responde, pero faltan archivos públicos (manifest: ${mRes.status}, sw.js: ${sRes.status}). Recuerda usar la URL publicada en producción ("Deploy").`,
        });
        return;
      }

      res.json({
        ok: true,
        status: 200,
        message: 'URL pública verificada: Web Manifest y Service Worker activos. Lista para PWABuilder.',
      });
    } catch {
      res.json({
        ok: false,
        status: 502,
        reason: 'network',
        message: `No se pudo conectar con ${baseUrl.host}.`,
      });
    }
  });

  const server = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server },
      },
      appType: 'spa',
    });

    if (vite.config.server.hmr === false) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (!result) return next();
          const code = result.code
            .replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* HMR disabled: WebSocket transport skipped */'
            )
            .replace(
              'else throw new SendBeforeConnectError("send was called before connect");',
              'else return;'
            );
          res.setHeader('Content-Type', 'application/javascript');
          res.send(code);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`iSTB Android server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
