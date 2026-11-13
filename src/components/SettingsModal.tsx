import React, { useRef, useState } from 'react';
import { 
  X, 
  Settings, 
  Trash2, 
  Download, 
  Upload, 
  Smartphone, 
  Shield, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Portal, FavoriteItem } from '../types/iptv';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  portals: Portal[];
  favorites: FavoriteItem[];
  onImportData: (data: { portals: Portal[]; favorites: FavoriteItem[] }) => void;
  onResetAll: () => void;
  onOpenApkModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  portals,
  favorites,
  onImportData,
  onResetAll,
  onOpenApkModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    const backup = {
      app: 'iSTB Android',
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      portals,
      favorites,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `istb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.portals && Array.isArray(parsed.portals)) {
          onImportData({
            portals: parsed.portals,
            favorites: parsed.favorites || [],
          });
          setStatusMsg({ type: 'success', text: 'Copia de seguridad restaurada correctamente.' });
        } else {
          setStatusMsg({ type: 'error', text: 'El archivo no contiene un formato de respaldo válido de iSTB.' });
        }
      } catch {
        setStatusMsg({ type: 'error', text: 'Error al leer el archivo JSON.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Ajustes & Configuración
              </h2>
              <p className="text-xs text-slate-400">
                Gestión de datos, copias de seguridad y opciones para Android
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* APK Quick Banner */}
          <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Instalar APK en tu móvil o Android TV
                </h3>
                <p className="text-[11px] text-slate-300">
                  Genera el paquete APK descargable o instala como WebAPK directa.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenApkModal();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
            >
              Ver APK
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Copia de Seguridad y Portales
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>Exportar JSON</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Restaurar JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
            {statusMsg && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>

          {/* System & Storage status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Estado del Sistema y Almacenamiento
            </h4>
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Portales registrados:</span>
                <span className="font-bold text-white">{portals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Canales favoritos:</span>
                <span className="font-bold text-amber-400">{favorites.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Almacenamiento local:</span>
                <span className="font-mono text-emerald-400">IndexedDB & Cache Activo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Motor de reproducción:</span>
                <span className="font-mono text-sky-400">HLS.js + HTML5 Video</span>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Zona de Peligro
            </h4>
            {confirmReset ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                <p className="text-xs text-rose-200">
                  ¿Seguro que deseas eliminar todos los portales y canales favoritos guardados?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onResetAll();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Sí, borrar todo
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Restablecer y borrar todos los datos locales</span>
              </button>
            )}
          </div>

          {/* Legal note */}
          <div className="text-[11px] text-slate-500 bg-slate-950/30 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-slate-400 mb-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Aviso de responsabilidad
            </div>
            iSTB Android es una herramienta reproductora multimedia. No distribuye ni comercializa contenido protegido por derechos de autor. El usuario es el único responsable de las listas y credenciales utilizadas.
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
