import React, { useEffect, useState } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Sparkles, 
  Terminal, 
  Tv, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  FileCode2,
  Copy,
  Check,
  Usb,
  Wifi
} from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';

interface ApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
  appUrl: string;
}

export const ApkModal: React.FC<ApkModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  onInstall,
  appUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'tv' | 'direct' | 'pwabuilder' | 'bubblewrap'>('tv');
  const [targetUrl, setTargetUrl] = useState(appUrl);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedAdb, setCopiedAdb] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [pwaCheck, setPwaCheck] = useState<{ checking: boolean; ok?: boolean; message?: string }>({
    checking: false,
  });

  useEffect(() => {
    setTargetUrl(appUrl);
    setPwaCheck({ checking: false });
  }, [appUrl]);

  if (!isOpen) return null;

  const cleanTargetUrl = (targetUrl || appUrl).trim().replace(/\/+$/, '');
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(cleanTargetUrl)}`;

  const bubblewrapScript = `# 1. Instalar la herramienta oficial de Google CLI para Android TWA
npm install -g @bubblewrap/cli

# 2. Inicializar el proyecto con el manifiesto de iSTB
bubblewrap init --manifest ${cleanTargetUrl}/manifest.webmanifest

# 3. Compilar el APK nativo firmado para Android / TV Box
bubblewrap build

# 4. (Opcional) Instalar directamente en tu TV Box por Wi-Fi (ADB)
adb connect IP_DE_TU_TVBOX:5555
adb install -r app-release-signed.apk`;

  const adbScript = `# En tu TV Box: Ajustes -> Información -> pulsa 7 veces en Compilación
# Luego activa "Depuración USB" o "Depuración de red" y ejecuta en tu PC:
adb connect IP_DE_TU_TVBOX:5555
adb install -r app-release-signed.apk`;

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleCheckPwaUrl = async () => {
    setPwaCheck({ checking: true });
    try {
      const res = await fetch('/api/check-pwa-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanTargetUrl }),
      });
      const data = await res.json();
      setPwaCheck({
        checking: false,
        ok: Boolean(data.ok),
        message: data.message || 'No se pudo comprobar la URL.',
      });
    } catch {
      setPwaCheck({
        checking: false,
        ok: false,
        message: 'Error al verificar la URL.',
      });
    }
  };

  const handleDownloadConfig = () => {
    setDownloadingZip(true);
    let parsedHost = '';
    try {
      parsedHost = new URL(cleanTargetUrl).host;
    } catch {
      parsedHost = 'localhost';
    }

    const twaConfig = {
      packageId: "com.istb.iptvplayer.android",
      host: parsedHost,
      name: "iSTB Android – IPTV Player",
      launcherName: "iSTB TV",
      themeColor: "#0f172a",
      navigationColor: "#0f172a",
      backgroundColor: "#0f172a",
      startUrl: "/",
      iconUrl: `${cleanTargetUrl}/icons/icon-512.png`,
      maskableIconUrl: `${cleanTargetUrl}/icons/icon-maskable-512.png`,
      appVersionName: "1.0.0",
      appVersionCode: 1,
      shortcuts: [],
      generatorApp: "bubblewrap",
      webManifestUrl: `${cleanTargetUrl}/manifest.webmanifest`,
      fallbackType: "customtabs",
      features: {
        locationDelegation: { enabled: false },
        playBilling: { enabled: false }
      },
      alphaDependencies: { enabled: false },
      enableSiteSettingsShortcut: true,
      isChromeOSOnly: false,
      isMetaQuest: false,
      fullScopeUrl: `${cleanTargetUrl}/`
    };

    const blob = new Blob([JSON.stringify(twaConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twa-manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadingZip(false), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-lg">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Instalar en TV Box y Android
                <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                  Android TV / APK
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guía completa para instalar iSTB como APK en tu TV Box, Google TV, Fire TV o móvil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target URL Bar */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">URL App:</span>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full bg-transparent text-xs font-mono text-sky-300 focus:outline-none"
              placeholder="https://..."
            />
          </div>
          <button
            onClick={() => copyText(cleanTargetUrl, setCopiedUrl)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer shrink-0"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'URL copiada' : 'Copiar URL'}</span>
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'tv'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Box / Android TV
          </button>
          <button
            onClick={() => setActiveTab('pwabuilder')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'pwabuilder'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Generar .APK (PWABuilder)
          </button>
          <button
            onClick={() => setActiveTab('bubblewrap')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'bubblewrap'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            CLI / ADB
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'direct'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Móvil WebAPK
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === 'tv' && (
            <div className="space-y-4 text-xs">
              {/* Important AI Studio URL note */}
              {cleanTargetUrl.includes('ais-dev-') && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 leading-relaxed">
                  <strong>Importante para TV Box:</strong> estás viendo la URL privada de desarrollo (<code className="font-mono">ais-dev-...</code>). Para que tu TV Box o PWABuilder entren sin pedir inicio de sesión de Google, usa la <strong>URL pública compartida</strong> de la app (pulsando <em>Share App</em> en AI Studio) y pégala arriba.
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 text-sm font-bold">
                  <Tv className="w-4 h-4" />
                  Control con mando a distancia activado (D-Pad)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  La app ya incluye navegación por mando de TV Box: usa las <strong>flechas</strong> para moverte entre canales, <strong>OK / Enter</strong> para reproducir, <strong>Arriba/Abajo</strong> en el reproductor para abrir la lista rápida, <strong>CH+/CH-</strong> o <strong>Izquierda/Derecha</strong> para cambiar de canal y <strong>Atrás / Back</strong> para salir.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Método 1 (Recomendado): Instalar archivo .APK en tu TV Box
                    </span>
                    <button
                      onClick={() => setActiveTab('pwabuilder')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition cursor-pointer shrink-0"
                    >
                      Ir a generar APK
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                    <li>
                      En tu PC o móvil, abre la pestaña <strong>Generar .APK (PWABuilder)</strong> de esta ventana y descarga el paquete Android (<code className="text-sky-300">.apk</code>).
                    </li>
                    <li>
                      Pasa el <code className="text-sky-300">.apk</code> a tu TV Box mediante un <strong>pendrive USB</strong> o con la app gratuita <strong>Send Files to TV</strong> (disponible en Google Play de tu TV Box y móvil).
                    </li>
                    <li>
                      En el TV Box, abre un explorador de archivos (como <em>X-plore</em> o <em>File Manager+</em>) y pulsa el archivo <code className="text-sky-300">.apk</code>. Si te lo pide, habilita <em>&ldquo;Instalar aplicaciones de orígenes desconocidos&rdquo;</em>.
                    </li>
                  </ol>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    Método 2 (Más rápido sin APK): Usar la app &ldquo;Downloader&rdquo; o &ldquo;TV Bro&rdquo;
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                    <li>
                      Instala <strong>TV Bro</strong> (navegador diseñado para TV Box con mando) o <strong>Downloader</strong> desde Google Play Store en tu TV Box.
                    </li>
                    <li>
                      Escanea el QR con tu móvil o escribe la URL pública de iSTB y guárdala en favoritos / pantalla de inicio del TV Box.
                    </li>
                    <li>
                      Al reproducir desde la red doméstica del TV Box, tus listas Stalker/Xtream funcionarán directamente sin las restricciones de IPs en la nube.
                    </li>
                  </ol>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <Usb className="w-4 h-4 text-amber-400" />
                      Método 3: Enviar el APK por red Wi-Fi desde PC (ADB)
                    </span>
                    <button
                      onClick={() => copyText(adbScript, setCopiedAdb)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition cursor-pointer"
                    >
                      {copiedAdb ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAdb ? 'Copiado' : 'Copiar ADB'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
                    {adbScript}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      Instalación Oficial WebAPK de Android
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                    Instalar directamente en Android sin descargas externas
                  </h3>
                  <p className="text-xs text-slate-300">
                    Android genera automáticamente un paquete APK nativo (<code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded text-[11px]">org.chromium.webapk</code>) con icono en el menú de aplicaciones, pantalla completa y soporte sin conexión.
                  </p>
                </div>
                {isInstallable && (
                  <button
                    onClick={onInstall}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Instalar en este dispositivo
                  </button>
                )}
                {isInstalled && (
                  <div className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Ya instalada como App nativa
                  </div>
                )}
              </div>

              {/* QR Code section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <QRCodeDisplay url={cleanTargetUrl} />

                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Pasos en tu teléfono Android:
                  </h4>
                  <ol className="space-y-2.5 text-slate-300 list-decimal list-inside">
                    <li className="leading-relaxed">
                      Escanea el <strong>código QR</strong> con la cámara de tu móvil o abre la URL en <strong>Chrome</strong> / <strong>Samsung Internet</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Toca el menú <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">⋮</span> en la esquina superior de Chrome.
                    </li>
                    <li className="leading-relaxed">
                      Selecciona <strong className="text-blue-400">&ldquo;Instalar aplicación&rdquo;</strong> o <strong className="text-blue-400">&ldquo;Agregar a pantalla de inicio&rdquo;</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Android creará el <strong>APK real</strong> en tu cajón de aplicaciones de forma instantánea.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pwabuilder' && (
            <div className="space-y-4">
              {cleanTargetUrl.includes('ais-dev-') && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                  <strong>¿PWABuilder te marca errores en Manifest y Service Worker?</strong> Es porque la URL <code className="font-mono">ais-dev-...</code> es privada (pide inicio de sesión de Google) y PWABuilder no puede entrar. Primero pulsa <strong>Deploy / Publicar</strong> en AI Studio para obtener tu URL pública (sin login), pégala arriba y vuelve a pulsar <strong>Abrir PWABuilder</strong>.
                </div>
              )}

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Generación de archivo .APK descargable (PWABuilder de Microsoft)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  PWABuilder analiza la URL pública de tu app, toma los iconos 512x512 y el manifiesto PWA configurados y empaqueta un <strong>archivo .APK instalable</strong> listo para copiar a tu TV Box por USB o con <em>Send Files to TV</em>.
                </p>

                <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs min-w-0">
                    <span className="text-slate-400">URL que analizará PWABuilder:</span>
                    <div className="font-mono text-sky-400 truncate max-w-sm">{cleanTargetUrl}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={handleCheckPwaUrl}
                      disabled={pwaCheck.checking}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer disabled:opacity-60"
                    >
                      {pwaCheck.checking ? 'Comprobando...' : 'Verificar URL'}
                    </button>
                    <a
                      href={pwaBuilderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      <span>Abrir PWABuilder</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {pwaCheck.message && (
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      pwaCheck.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {pwaCheck.message}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="font-bold text-slate-200 mb-1">1. Publica la App (Deploy)</div>
                  <p className="text-slate-400">Despliega la app en AI Studio (o Vercel/Cloud Run) para tener una URL HTTPS pública sin login.</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="font-bold text-slate-200 mb-1">2. Package for Stores</div>
                  <p className="text-slate-400">Analiza esa URL en PWABuilder, pulsa &ldquo;Package for Stores&rdquo;, elige <strong>Android</strong> y descarga el ZIP.</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="font-bold text-slate-200 mb-1">3. Instala en el TV Box</div>
                  <p className="text-slate-400">Extrae el archivo <code className="text-sky-300">.apk</code> del ZIP e instálalo en el TV Box por USB, Send Files to TV o ADB.</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileCode2 className="w-4 h-4 text-blue-400" />
                  <span>Configuración TWA lista para Android / TV Box</span>
                </div>
                <button
                  onClick={handleDownloadConfig}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingZip ? 'Descargando...' : 'Descargar twa-manifest.json'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bubblewrap' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span>Compilar APK localmente con Bubblewrap + ADB (Google TWA)</span>
                  </div>
                  <button
                    onClick={() => copyText(bubblewrapScript, setCopiedCli)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition cursor-pointer"
                  >
                    {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCli ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>
                
                <pre className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800">
                  {bubblewrapScript}
                </pre>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Ventajas de Bubblewrap / Trusted Web Activity en TV Box:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Genera un APK súper ligero (menos de 2 MB) compatible con Android TV 8+.</li>
                  <li>Actualizaciones automáticas transparentes: los cambios en tu lista y reproductor se actualizan sin tener que reinstalar el APK.</li>
                  <li>Aceleración por hardware completa para vídeo IPTV (HLS / m3u8 y MPEG-TS) y decodificación H.264/HEVC.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Compatible con Android TV Box, Google TV, Fire TV y móviles</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

