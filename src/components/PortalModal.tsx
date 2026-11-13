import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Tv, 
  Server, 
  Layers, 
  Sparkles, 
  Plus, 
  AlertCircle,
  Check,
  Upload,
  FileText,
  Pencil
} from 'lucide-react';
import { Portal, PortalType } from '../types/iptv';
import { normalizePortalUrl, parseM3UContent } from '../services/iptvParser';

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPortal: (portal: Omit<Portal, 'id' | 'channelCount' | 'addedAt'>, existingId?: string) => Promise<void>;
  onLoadDemoPortal: () => void;
  editingPortal?: Portal | null;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  onClose,
  onAddPortal,
  onLoadDemoPortal,
  editingPortal = null,
}) => {
  const [type, setType] = useState<PortalType>('m3u');
  const [m3uMode, setM3uMode] = useState<'url' | 'file'>('url');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [mac, setMac] = useState('00:1A:79:');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingPortal) {
      setType(editingPortal.type);
      setName(editingPortal.name);
      setUrl(editingPortal.url || '');
      setRawContent(editingPortal.rawContent || '');
      setM3uMode(editingPortal.rawContent ? 'file' : 'url');
      setUser(editingPortal.user || '');
      setPass(editingPortal.pass || '');
      setMac(editingPortal.mac || '00:1A:79:');
    } else {
      setType('m3u');
      setM3uMode('url');
      setName('');
      setUrl('');
      setRawContent('');
      setUser('');
      setPass('');
      setMac('00:1A:79:');
    }
  }, [isOpen, editingPortal]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setRawContent(content);
      if (!name.trim()) {
        setName(file.name.replace(/\.(m3u8?|txt)$/i, ''));
      }
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Por favor indica un nombre identificativo para este portal.');
      return;
    }

    if (type === 'm3u' && m3uMode === 'file') {
      if (!rawContent.trim()) {
        setError('Sube un archivo .m3u / .m3u8 o pega el contenido de la lista.');
        return;
      }
      const parsed = parseM3UContent(rawContent);
      if (parsed.length === 0) {
        setError('El contenido M3U no contiene canales válidos (#EXTINF o URLs).');
        return;
      }
      try {
        setIsSubmitting(true);
        await onAddPortal(
          {
            name: trimmedName,
            type: 'm3u',
            url: 'local://m3u',
            rawContent,
          },
          editingPortal?.id
        );
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al guardar la lista');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const normalizedUrl = normalizePortalUrl(url);
    if (!normalizedUrl) {
      setError('Por favor ingresa la URL del servidor o lista.');
      return;
    }

    if (type === 'xtream' && (!user.trim() || !pass.trim())) {
      setError('Xtream Codes requiere nombre de usuario y contraseña.');
      return;
    }

    if (type === 'stalker' && !mac.trim()) {
      setError('Stalker Middleware requiere la dirección MAC de tu dispositivo.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddPortal(
        {
          name: trimmedName,
          type,
          url: normalizedUrl,
          user: type === 'xtream' ? user.trim() : undefined,
          pass: type === 'xtream' ? pass.trim() : undefined,
          mac: type === 'stalker' ? mac.trim() : undefined,
        },
        editingPortal?.id
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el portal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              {editingPortal ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingPortal ? 'Editar Portal IPTV' : 'Añadir Portal IPTV'}
              </h2>
              <p className="text-xs text-slate-400">
                Compatible con M3U, Xtream Codes y Stalker (MAG)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          
          {!editingPortal && (
            <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-white block">¿Solo quieres probar el reproductor?</span>
                  <span className="text-slate-400">Carga canales demo legales en vivo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLoadDemoPortal();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shrink-0"
              >
                Cargar Demo
              </button>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Portal
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('m3u')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                  type === 'm3u'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Layers className="w-5 h-5 mb-1" />
                <span>Lista M3U</span>
              </button>

              <button
                type="button"
                onClick={() => setType('xtream')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                  type === 'xtream'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Server className="w-5 h-5 mb-1" />
                <span>Xtream Codes</span>
              </button>

              <button
                type="button"
                onClick={() => setType('stalker')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                  type === 'stalker'
                    ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Tv className="w-5 h-5 mb-1" />
                <span>Stalker (MAC)</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del portal
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi IPTV España, Deportes HD..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* M3U Specific */}
          {type === 'm3u' && (
            <div className="space-y-3">
              <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setM3uMode('url')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    m3uMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  URL Remota (.m3u)
                </button>
                <button
                  type="button"
                  onClick={() => setM3uMode('file')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    m3uMode === 'file' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Archivo / Texto M3U
                </button>
              </div>

              {m3uMode === 'url' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    URL de la lista M3U / M3U8
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://proveedor.com/lista.m3u"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Contenido o archivo .m3u / .m3u8
                    </label>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-400 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Elegir archivo</span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".m3u,.m3u8,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <textarea
                    rows={4}
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    placeholder="#EXTM3U&#10;#EXTINF:-1,Mi Canal HD&#10;https://..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}
            </div>
          )}

          {/* Xtream Codes Specific */}
          {type === 'xtream' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL del Servidor Xtream
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://iptv-server.com:8080"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="usuario123"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stalker Specific */}
          {type === 'stalker' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL del Portal Stalker
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://portal.servidor.com/c/"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dirección MAC del dispositivo
                </label>
                <input
                  type="text"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="00:1A:79:3B:4F:2A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              {isSubmitting ? (
                <span>Conectando y cargando canales...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingPortal ? 'Actualizar y Cargar' : 'Guardar y Cargar Portal'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
