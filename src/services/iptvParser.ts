import { Channel, Portal } from '../types/iptv';

export const DEMO_CHANNELS: Channel[] = [
  {
    id: 'demo-rtve-la1',
    name: 'RTVE La 1 HD (Directo)',
    category: 'TV España',
    logo: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=120&auto=format&fit=crop&q=80',
    url: 'https://rtvelivestream.rtve.es/rtvesec/la1/la1_main.m3u8',
  },
  {
    id: 'demo-rtve-24h',
    name: 'RTVE Canal 24 Horas',
    category: 'Noticias',
    logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&auto=format&fit=crop&q=80',
    url: 'https://rtvelivestream.rtve.es/rtvesec/24h/24h_main.m3u8',
  },
  {
    id: 'demo-rtve-la2',
    name: 'RTVE La 2 HD',
    category: 'TV España',
    logo: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=120&auto=format&fit=crop&q=80',
    url: 'https://rtvelivestream.rtve.es/rtvesec/la2/la2_main.m3u8',
  },
  {
    id: 'demo-dw',
    name: 'DW English / Deutsch Live',
    category: 'Noticias Internacional',
    logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop&q=80',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
  },
  {
    id: 'demo-redbull',
    name: 'Red Bull TV Deportes Extremos',
    category: 'Deportes',
    logo: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120&auto=format&fit=crop&q=80',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
  },
  {
    id: 'demo-bigbuck',
    name: 'Big Buck Bunny (1080p HD)',
    category: 'Películas & Animación',
    logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120&auto=format&fit=crop&q=80',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'demo-tears',
    name: 'Tears of Steel (4K Test)',
    category: 'Películas & Animación',
    logo: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=120&auto=format&fit=crop&q=80',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  },
];

interface ProxyResponse {
  ok: boolean;
  status: number;
  contentType?: string;
  body?: string;
  error?: string;
}

export function normalizePortalUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

async function proxyFetch(
  url: string,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; text: string }> {
  const normalized = normalizePortalUrl(url);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('La URL introducida no es válida. Asegúrate de incluir http:// o https://');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('La URL debe comenzar por http:// o https://');
  }

  const res = await fetch('/api/iptv-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: parsed.toString(), headers }),
  });

  if (!res.ok) {
    throw new Error(`Error interno del proxy (${res.status})`);
  }

  const payload: ProxyResponse = await res.json();
  if (!payload.ok) {
    throw new Error(
      payload.error || `El servidor remoto respondió con error HTTP ${payload.status}`
    );
  }

  return {
    ok: payload.ok,
    status: payload.status,
    text: payload.body || '',
  };
}

export function getPlayableStreamUrl(url: string, forceProxy = false, mac?: string, streamId?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (streamId) {
    return `${origin}/api/stream-proxy?streamId=${encodeURIComponent(streamId)}`;
  }
  if (!url) return '';
  if (url.startsWith('/api/stream-proxy')) return `${origin}${url}`;
  const macSuffix = mac ? `&mac=${encodeURIComponent(mac)}` : '';
  if (
    forceProxy ||
    (typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http://'))
  ) {
    return `${origin}/api/stream-proxy?url=${encodeURIComponent(url)}${macSuffix}`;
  }
  return url;
}

export interface StreamProbeResult {
  ok: boolean;
  status: number;
  kind?: 'hls' | 'mpegts' | 'native';
  streamId?: string;
  finalUrl?: string;
  contentType?: string;
  error?: string;
}

export async function probeStream(url: string, mac?: string): Promise<StreamProbeResult> {
  try {
    const res = await fetch('/api/probe-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mac }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Error del proxy (${res.status})` };
    }
    return await res.json();
  } catch {
    return { ok: false, status: 502, error: 'No se pudo verificar el flujo de transmisión.' };
  }
}

export function parseM3UContent(text: string): Channel[] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  const channels: Channel[] = [];
  let currentInfo: Partial<Channel> | null = null;
  let extGrpCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^#EXTINF:/i.test(line)) {
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      const nameMatch = line.match(/tvg-name="([^"]*)"/i);

      const commaIndex = line.lastIndexOf(',');
      const rawName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : '';

      currentInfo = {
        name: rawName || nameMatch?.[1] || `Canal ${channels.length + 1}`,
        category: groupMatch?.[1] || extGrpCategory || 'General',
        logo: logoMatch?.[1] || undefined,
        tvgId: idMatch?.[1] || undefined,
        tvgName: nameMatch?.[1] || undefined,
      };
    } else if (/^#EXTGRP:/i.test(line)) {
      const grp = line.substring(8).trim();
      if (grp) {
        extGrpCategory = grp;
        if (currentInfo && (!currentInfo.category || currentInfo.category === 'General')) {
          currentInfo.category = grp;
        }
      }
    } else if (!line.startsWith('#')) {
      if (currentInfo) {
        channels.push({
          id: `m3u-${channels.length + 1}-${Date.now().toString(36)}`,
          name: currentInfo.name || `Canal ${channels.length + 1}`,
          category: currentInfo.category || 'General',
          logo: currentInfo.logo,
          tvgId: currentInfo.tvgId,
          tvgName: currentInfo.tvgName,
          url: line,
        });
        currentInfo = null;
      } else if (/^https?:\/\//i.test(line)) {
        channels.push({
          id: `m3u-${channels.length + 1}-${Date.now().toString(36)}`,
          name: `Canal ${channels.length + 1}`,
          category: extGrpCategory || 'General',
          url: line,
        });
      }
    }
  }

  return channels;
}

export async function fetchM3U(url: string): Promise<Channel[]> {
  const res = await proxyFetch(url);
  const channels = parseM3UContent(res.text);
  if (channels.length === 0) {
    throw new Error('La lista M3U no contiene canales válidos (#EXTINF o URLs de vídeo).');
  }
  return channels;
}

export async function fetchXtream(portal: Portal): Promise<Channel[]> {
  let base = normalizePortalUrl(portal.url)
    .replace(/\/player_api\.php.*$/i, '')
    .replace(/\/get\.php.*$/i, '')
    .replace(/\/+$/, '');

  const username = encodeURIComponent((portal.user || '').trim());
  const password = encodeURIComponent((portal.pass || '').trim());

  // 1. Auth check
  const authUrl = `${base}/player_api.php?username=${username}&password=${password}`;
  const authRes = await proxyFetch(authUrl);

  let authData: { user_info?: { auth?: number | string; status?: string } };
  try {
    authData = JSON.parse(authRes.text);
  } catch {
    throw new Error('El servidor Xtream no devolvió una respuesta JSON válida.');
  }

  if (!authData.user_info || Number(authData.user_info.auth) === 0) {
    throw new Error('Credenciales inválidas de Xtream Codes');
  }

  // 2. Fetch live categories and streams in parallel
  const catsUrl = `${base}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
  const streamsUrl = `${base}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

  const [catsRes, streamRes] = await Promise.all([
    proxyFetch(catsUrl).catch(() => null),
    proxyFetch(streamsUrl),
  ]);

  const categoryMap: Record<string, string> = {};
  if (catsRes) {
    try {
      const cats: Array<{ category_id: string | number; category_name?: string }> = JSON.parse(catsRes.text);
      if (Array.isArray(cats)) {
        cats.forEach((c) => {
          if (c.category_id && c.category_name) {
            categoryMap[String(c.category_id)] = c.category_name;
          }
        });
      }
    } catch {
      // ignore optional categories parse error
    }
  }

  interface XtreamStream {
    stream_id: number | string;
    name?: string;
    category_id?: string | number;
    category_name?: string;
    stream_icon?: string;
  }

  let streams: XtreamStream[];
  try {
    streams = JSON.parse(streamRes.text);
  } catch {
    throw new Error('No se pudo leer la lista de canales de Xtream.');
  }

  if (!Array.isArray(streams) || streams.length === 0) {
    throw new Error('El servidor Xtream no devolvió canales en vivo.');
  }

  return streams.map((s) => ({
    id: `x-${s.stream_id}`,
    name: s.name || `Canal ${s.stream_id}`,
    category:
      s.category_name ||
      (s.category_id !== undefined ? categoryMap[String(s.category_id)] : undefined) ||
      'General',
    logo: s.stream_icon || undefined,
    // Force .m3u8 HLS output on Xtream servers so browser & Android WebView can play natively via hls.js
    url: `${base}/live/${encodeURIComponent(portal.user || '')}/${encodeURIComponent(portal.pass || '')}/${s.stream_id}.m3u8`,
  }));
}

function getStalkerEndpointCandidates(portalUrl: string): string[] {
  const normalized = normalizePortalUrl(portalUrl).replace(/\/+$/, '');
  const withoutUi = normalized
    .replace(/\/c$/i, '')
    .replace(/\/server\/load\.php$/i, '')
    .replace(/\/portal\.php$/i, '');

  let origin = withoutUi;
  try {
    origin = new URL(withoutUi).origin;
  } catch {
    // keep withoutUi
  }

  const candidates = [
    `${withoutUi}/server/load.php`,
    `${withoutUi}/portal.php`,
    `${withoutUi}/stalker_portal/server/load.php`,
    `${origin}/stalker_portal/server/load.php`,
    `${origin}/server/load.php`,
    `${origin}/portal.php`,
  ];

  return Array.from(new Set(candidates));
}

function parseStalkerJson(raw: string): any {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonText = jsonStart > 0 ? trimmed.slice(jsonStart) : trimmed;
  return JSON.parse(jsonText);
}

export async function fetchStalker(portal: Portal): Promise<Channel[]> {
  const rawMac = (portal.mac || '').trim();
  const mac = encodeURIComponent(rawMac);

  const stbHeaders: Record<string, string> = {
    Cookie: `mac=${rawMac}; stb_lang=en; timezone=UTC`,
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
  };

  const endpointCandidates = getStalkerEndpointCandidates(portal.url);

  let activeEndpoint = endpointCandidates[0];
  let handshakeText = '';
  let lastError = 'No se pudo establecer conexión con el portal Stalker';

  for (const endpoint of endpointCandidates) {
    try {
      const res = await proxyFetch(
        `${endpoint}?type=stb&action=handshake&token=&JsHttpRequest=1-xml&mac=${mac}`,
        stbHeaders
      );
      if (res.text && (res.text.includes('token') || res.text.includes('js'))) {
        activeEndpoint = endpoint;
        handshakeText = res.text;
        break;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }

  if (!handshakeText) {
    throw new Error(lastError);
  }

  let token = '';
  try {
    const parsed = parseStalkerJson(handshakeText);
    if (typeof parsed.js === 'string') {
      const match = parsed.js.match(/token\s*=\s*"([^"]+)"/);
      token = match ? match[1] : '';
    } else if (parsed.js && typeof parsed.js === 'object' && parsed.js.token) {
      token = parsed.js.token;
    }
  } catch {
    const match = handshakeText.match(/token\s*=\s*"([^"]+)"/);
    token = match ? match[1] : '';
  }

  const authHeaders: Record<string, string> = {
    ...stbHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Many Stalker portals require get_profile immediately after handshake
  await proxyFetch(
    `${activeEndpoint}?type=stb&action=get_profile&hd=1&stb_type=MAG250&sn=0000000000000&JsHttpRequest=1-xml`,
    authHeaders
  ).catch(() => null);

  // Fetch genres/categories for mapping
  const genreMap: Record<string, string> = {};
  try {
    const genresRes = await proxyFetch(
      `${activeEndpoint}?type=itv&action=get_genres&JsHttpRequest=1-xml`,
      authHeaders
    );
    const genresData = parseStalkerJson(genresRes.text);
    const genreList = Array.isArray(genresData.js) ? genresData.js : [];
    genreList.forEach((g: { id?: string | number; title?: string }) => {
      if (g.id && g.title) genreMap[String(g.id)] = g.title;
    });
  } catch {
    // ignore optional genres failure
  }

  interface StalkerChannel {
    id: string | number;
    name?: string;
    category?: string;
    tv_genre_id?: string | number;
    logo?: string;
    picon?: string;
    cmd?: string;
    url?: string;
  }

  const extractList = (rawText: string): StalkerChannel[] => {
    const parsed = parseStalkerJson(rawText);
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed.js && !Array.isArray(parsed.js) && Array.isArray(parsed.js.data)) {
      return parsed.js.data;
    }
    if (Array.isArray(parsed.js)) return parsed.js;
    return [];
  };

  let list: StalkerChannel[] = [];

  try {
    const channelsRes = await proxyFetch(
      `${activeEndpoint}?type=itv&action=get_all_channels&force_ch_link_check=&JsHttpRequest=1-xml`,
      authHeaders
    );
    list = extractList(channelsRes.text);
  } catch {
    list = [];
  }

  // Fallback to paginated get_ordered_list if get_all_channels returned empty
  if (list.length === 0) {
    for (let page = 1; page <= 5; page++) {
      try {
        const pageRes = await proxyFetch(
          `${activeEndpoint}?type=itv&action=get_ordered_list&genre=*&force_ch_link_check=&fav=0&sortby=number&hd=0&p=${page}&JsHttpRequest=1-xml`,
          authHeaders
        );
        const pageItems = extractList(pageRes.text);
        if (pageItems.length === 0) break;
        list.push(...pageItems);
      } catch {
        break;
      }
    }
  }

  if (list.length === 0) {
    throw new Error(
      'El portal Stalker conectó pero no devolvió canales. Verifica que la MAC esté autorizada y la URL sea correcta.'
    );
  }

  return list.map((c) => {
    const rawCmd = c.cmd || c.url || '';
    const cleanedUrl = rawCmd.replace(/^(ffmpeg|ffrt\d*)\s+/i, '').trim();
    const genreName = c.tv_genre_id !== undefined ? genreMap[String(c.tv_genre_id)] : undefined;
    return {
      id: `stalker-${c.id}`,
      name: c.name || `Canal ${c.id}`,
      category: c.category || genreName || 'General',
      logo: c.picon || c.logo || undefined,
      url: cleanedUrl,
      cmd: rawCmd,
    };
  });
}

export async function resolveStalkerStreamUrl(portal: Portal, channel: Channel): Promise<string> {
  const cmd = channel.cmd || channel.url;
  if (!cmd) return channel.url;

  const rawMac = (portal.mac || '').trim();
  const stbHeaders: Record<string, string> = {
    Cookie: `mac=${rawMac}; stb_lang=en; timezone=UTC`,
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
  };

  const endpointCandidates = getStalkerEndpointCandidates(portal.url);
  for (const endpoint of endpointCandidates) {
    try {
      const hsRes = await proxyFetch(
        `${endpoint}?type=stb&action=handshake&token=&JsHttpRequest=1-xml&mac=${encodeURIComponent(rawMac)}`,
        stbHeaders
      );
      const hsData = parseStalkerJson(hsRes.text);
      let token = '';
      if (typeof hsData.js === 'string') {
        const m = hsData.js.match(/token\s*=\s*"([^"]+)"/);
        token = m ? m[1] : '';
      } else if (hsData.js && typeof hsData.js === 'object' && hsData.js.token) {
        token = hsData.js.token;
      }

      const authHeaders = {
        ...stbHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      await proxyFetch(
        `${endpoint}?type=stb&action=get_profile&hd=1&stb_type=MAG250&sn=0000000000000&JsHttpRequest=1-xml`,
        authHeaders
      ).catch(() => null);

      const linkRes = await proxyFetch(
        `${endpoint}?type=itv&action=create_link&cmd=${encodeURIComponent(cmd)}&series=&forced_storage=0&disable_ad=0&download=0&JsHttpRequest=1-xml`,
        authHeaders
      );
      const linkData = parseStalkerJson(linkRes.text);
      const resolved = linkData?.js?.cmd || '';
      if (resolved) {
        const cleaned = resolved.replace(/^(ffmpeg|ffrt\d*)\s+/i, '').trim();
        if (cleaned && !cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
          return cleaned;
        }
      }
    } catch {
      // try next candidate
    }
  }

  return channel.url;
}
