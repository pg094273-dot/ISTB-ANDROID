import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  RotateCcw, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { Channel } from '../types/iptv';
import { getPlayableStreamUrl, probeStream } from '../services/iptvParser';

interface PlayerProps {
  channel: Channel;
  channels: Channel[];
  isFavorite: boolean;
  onToggleFavorite: (channel: Channel) => void;
  onClose: () => void;
  onSelectChannel: (channel: Channel) => void;
  resolveChannelUrl?: (channel: Channel) => Promise<string>;
  portalMac?: string;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  channels,
  isFavorite,
  onToggleFavorite,
  onClose,
  onSelectChannel,
  resolveChannelUrl,
  portalMac,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayMutedNotice, setAutoplayMutedNotice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [showControls, setShowControls] = useState(true);
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qualityText, setQualityText] = useState<string>('Auto');
  const [reloadNonce, setReloadNonce] = useState(0);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndex = channels.findIndex((c) => c.id === channel.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < channels.length - 1;

  const attemptPlay = (video: HTMLVideoElement) => {
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          setAutoplayMutedNotice(true);
          video
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              setIsPlaying(false);
            });
        });
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMsg(null);
    setAutoplayMutedNotice(false);
    setQualityText('Auto');

    const video = videoRef.current;
    if (!video) return;

    const cleanupPlayers = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.pause();
          mpegtsRef.current.unload();
          mpegtsRef.current.detachMediaElement();
          mpegtsRef.current.destroy();
        } catch {
          // ignore cleanup error
        }
        mpegtsRef.current = null;
      }
      video.removeAttribute('src');
    };

    cleanupPlayers();

    const playWithHls = (streamUrl: string, rawUrl: string, allowProbeFallback: boolean) => {
      if (cancelled || !video) return;
      cleanupPlayers();

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_ev, data) => {
          if (cancelled) return;
          setIsLoading(false);
          attemptPlay(video);
          if (data.levels && data.levels.length > 0) {
            const highest = data.levels[data.levels.length - 1];
            setQualityText(highest.height ? `${highest.height}p` : 'HLS');
          }
        });

        hls.on(Hls.Events.ERROR, (_ev, data) => {
          if (cancelled || !data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (allowProbeFallback) {
              probeAndPlay(rawUrl, true);
              return;
            }
            hls.destroy();
            setErrorMsg(
              'No se pudo cargar la señal HLS (canal fuera de línea o bloqueo de red del servidor).'
            );
            setIsLoading(false);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            if (allowProbeFallback) {
              probeAndPlay(rawUrl, true);
              return;
            }
            hls.destroy();
            setErrorMsg('El formato de este canal no es compatible con el reproductor HLS.');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.load();
        setIsLoading(false);
        attemptPlay(video);
      } else {
        setErrorMsg('Tu navegador no soporta la reproducción HLS.');
        setIsLoading(false);
      }
    };

    const playWithMpegTs = (proxyUrl: string) => {
      if (cancelled || !video) return;
      cleanupPlayers();

      if (!mpegts.isSupported()) {
        setErrorMsg('Tu navegador no soporta MediaSource Extensions para flujos MPEG-TS (.ts).');
        setIsLoading(false);
        return;
      }

      const player = mpegts.createPlayer(
        {
          type: 'mpegts',
          isLive: true,
          url: proxyUrl,
        },
        {
          enableWorker: false,
          lazyLoadMaxDuration: 3 * 60,
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 3.0,
          liveBufferLatencyMinRemain: 0.5,
        }
      );

      mpegtsRef.current = player;
      setQualityText('MPEG-TS');

      player.on(mpegts.Events.ERROR, (errorType, errorDetail) => {
        if (cancelled) return;
        try {
          player.destroy();
        } catch {
          // ignore destroy error
        }
        if (mpegtsRef.current === player) {
          mpegtsRef.current = null;
        }
        setIsLoading(false);
        setErrorMsg(
          `Error en transmisión MPEG-TS (${String(errorType)}: ${String(errorDetail)}). El canal podría estar inactivo.`
        );
      });

      player.attachMediaElement(video);
      player.load();
      setIsLoading(false);
      attemptPlay(video);
    };

    const playNative = (streamUrl: string) => {
      if (cancelled || !video) return;
      cleanupPlayers();
      setQualityText('Directo');
      video.src = streamUrl;
      video.load();
      setIsLoading(false);
      attemptPlay(video);
    };

    const probeAndPlay = async (rawUrl: string, forceProxy: boolean) => {
      if (cancelled) return;
      let probe = await probeStream(rawUrl, portalMac);

      // If Xtream .m3u8 failed (404/400), automatically retry .ts variant
      if (!probe.ok && /\.m3u8(\?|$)/i.test(rawUrl)) {
        const tsUrl = rawUrl.replace(/\.m3u8(\?|$)/i, '.ts$1');
        const tsProbe = await probeStream(tsUrl, portalMac);
        if (tsProbe.ok) {
          probe = tsProbe;
          rawUrl = tsUrl;
        }
      }

      if (cancelled) return;

      if (!probe.ok) {
        setErrorMsg(
          probe.error || 'No se pudo cargar la señal IPTV (canal fuera de línea o acceso denegado).'
        );
        setIsLoading(false);
        return;
      }

      const targetUrl = probe.finalUrl || rawUrl;
      const handoffUrl = getPlayableStreamUrl(targetUrl, true, portalMac, probe.streamId);

      if (probe.kind === 'hls') {
        const hlsUrl =
          forceProxy || probe.streamId
            ? handoffUrl
            : getPlayableStreamUrl(targetUrl, false, portalMac);
        playWithHls(hlsUrl, targetUrl, false);
      } else if (probe.kind === 'mpegts') {
        playWithMpegTs(handoffUrl);
      } else {
        playNative(handoffUrl);
      }
    };

    async function init() {
      try {
        const resolvedUrl = resolveChannelUrl
          ? await resolveChannelUrl(channel)
          : channel.url;

        if (cancelled) return;

        if (!resolvedUrl) {
          setErrorMsg('Este canal no contiene una URL de transmisión válida.');
          setIsLoading(false);
          return;
        }

        const lower = resolvedUrl.toLowerCase();
        const isDirectHttpsM3u8 =
          lower.startsWith('https://') &&
          (lower.includes('.m3u8') || lower.includes('type=m3u8')) &&
          !portalMac;

        if (isDirectHttpsM3u8) {
          // Fast path for public HTTPS HLS streams (demo channels, etc.); auto-falls back to probe+proxy if CORS fails
          playWithHls(resolvedUrl, resolvedUrl, true);
        } else {
          await probeAndPlay(resolvedUrl, true);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Error al resolver el enlace del canal.'
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanupPlayers();
    };
  }, [channel.id, channel.url, reloadNonce, resolveChannelUrl, portalMac]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4500);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) setAutoplayMutedNotice(false);
    resetControlsTimeout();
  };

  const unmuteFromBanner = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    setAutoplayMutedNotice(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (container as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch {
      // ignore PiP errors on unsupported devices
    }
  };

  const cycleAspectRatio = () => {
    if (aspectRatio === 'contain') setAspectRatio('cover');
    else if (aspectRatio === 'cover') setAspectRatio('fill');
    else setAspectRatio('contain');
    resetControlsTimeout();
  };

  const handlePrev = () => {
    if (hasPrev) onSelectChannel(channels[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectChannel(channels[currentIndex + 1]);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractiveControl =
        target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT');

      if (e.key === 'Escape' || e.key === 'BrowserBack') {
        e.preventDefault();
        if (showChannelDrawer) {
          setShowChannelDrawer(false);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'ChannelUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (hasNext) onSelectChannel(channels[currentIndex + 1]);
        return;
      }

      if (e.key === 'ChannelDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (hasPrev) onSelectChannel(channels[currentIndex - 1]);
        return;
      }

      if (e.key === 'MediaPlayPause') {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (!showChannelDrawer && !isInteractiveControl) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (hasNext) onSelectChannel(channels[currentIndex + 1]);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (hasPrev) onSelectChannel(channels[currentIndex - 1]);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          setShowChannelDrawer(true);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          togglePlay();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showChannelDrawer, hasNext, hasPrev, currentIndex, channels, onSelectChannel, onClose, isPlaying]);

  const getVideoObjectFitClass = () => {
    switch (aspectRatio) {
      case 'cover':
        return 'object-cover';
      case 'fill':
        return 'object-fill';
      case 'contain':
      default:
        return 'object-contain';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Background Video Element */}
      <video
        ref={videoRef}
        playsInline
        className={`w-full h-full ${getVideoObjectFitClass()} bg-black transition-all`}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onError={(e) => {
          if (e.currentTarget.getAttribute('src') && !hlsRef.current && !mpegtsRef.current) {
            setIsLoading(false);
            setErrorMsg('Error al reproducir el flujo de vídeo.');
          }
        }}
      />

      {/* Unmute prompt if browser forced muted autoplay */}
      {autoplayMutedNotice && !errorMsg && (
        <button
          onClick={unmuteFromBanner}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl cursor-pointer transition"
        >
          <VolumeX className="w-4 h-4" />
          <span>Sonido silenciado por el navegador — Toca para activar audio</span>
        </button>
      )}

      {/* Buffering Spinner */}
      {isLoading && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
          <span className="text-white text-sm font-medium tracking-wide">
            Conectando señal en vivo...
          </span>
        </div>
      )}

      {/* Error Message Screen */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-20">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Señal no disponible</h3>
          <p className="text-sm text-slate-400 max-w-md mb-5 leading-relaxed">
            {errorMsg}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setReloadNonce((n) => n + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reintentar conexión
            </button>
            {hasNext && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer transition"
              >
                <span>Siguiente canal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              Cerrar reproductor
            </button>
          </div>
        </div>
      )}

      {/* Top Overlay Bar */}
      <div
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 flex items-center justify-between z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title="Volver"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h1 className="text-base sm:text-lg font-bold text-white drop-shadow">
                {channel.name}
              </h1>
              <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[11px] font-mono border border-blue-500/40">
                {qualityText}
              </span>
            </div>
            <p className="text-xs text-slate-300 drop-shadow">
              {channel.category || 'General'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(channel)}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition cursor-pointer ${
              isFavorite
                ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                : 'bg-black/60 border-white/10 text-white hover:bg-black/80'
            }`}
            title="Favorito"
          >
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowChannelDrawer(!showChannelDrawer)}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title="Lista de canales"
          >
            <Layers className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Controls (Prev / Play / Next) */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 pointer-events-none transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={handlePrev}
          disabled={!hasPrev}
          className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl transition cursor-pointer"
          title="Canal anterior"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        <button
          onClick={togglePlay}
          className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 transition transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pausa' : 'Reproducir'}
        >
          {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-white" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />}
        </button>

        <button
          onClick={handleNext}
          disabled={!hasNext}
          className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl transition cursor-pointer"
          title="Siguiente canal"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 flex items-center justify-between z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title={isMuted ? 'Desactivar silencio' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <span className="text-xs font-mono text-slate-300 px-2 py-1 rounded bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            DIRECTO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cycleAspectRatio}
            className="px-3 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center gap-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold transition cursor-pointer"
            title="Cambiar relación de aspecto"
          >
            <span className="capitalize">{aspectRatio}</span>
          </button>

          <button
            onClick={togglePiP}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title="Picture-in-Picture"
          >
            <Tv className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Channel Drawer */}
      {showChannelDrawer && (
        <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-40 flex flex-col p-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Canales ({channels.length})
            </h3>
            <button
              onClick={() => setShowChannelDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {channels.slice(0, 300).map((c) => {
              const active = c.id === channel.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectChannel(c);
                    setShowChannelDrawer(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      c.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{c.category || 'General'}</div>
                  </div>
                  {active && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
