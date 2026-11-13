import React from 'react';
import { 
  Tv, 
  Smartphone, 
  Plus, 
  Download, 
  Settings, 
  Wifi, 
  WifiOff, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Portal } from '../types/iptv';

interface HeaderProps {
  currentPortal: Portal | null;
  onOpenPortalModal: () => void;
  onOpenApkModal: () => void;
  onOpenSettingsModal: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstallPwa: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPortal,
  onOpenPortalModal,
  onOpenApkModal,
  onOpenSettingsModal,
  isInstallable,
  isInstalled,
  onInstallPwa,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black tracking-wider">
              <Tv className="w-5 h-5" />
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
              title={isOnline ? 'En línea' : 'Modo sin conexión'}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>iSTB</span>
                <span className="text-sky-400">Android</span>
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PWA / APK
              </span>
            </div>
            {currentPortal ? (
              <p className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {currentPortal.name} ({currentPortal.channelCount} canales)
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Reproductor IPTV & Generador APK
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* APK Hub Button */}
          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            title="Crear y descargar APK para Android"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden xs:inline">Crear APK</span>
          </button>

          {/* In-app Install Button if available */}
          {isInstallable && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              title="Instalar como aplicación nativa en tu dispositivo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}

          {/* Add Portal Button */}
          <button
            onClick={onOpenPortalModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
            title="Añadir portal M3U, Xtream o Stalker"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Añadir portal</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Ajustes y respaldo"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
