import React, { useState } from 'react';
import { 
  Tv, 
  Server, 
  Layers, 
  Plus, 
  Trash2, 
  RotateCw, 
  Sparkles, 
  ChevronRight,
  Pencil
} from 'lucide-react';
import { Portal } from '../types/iptv';

interface PortalsViewProps {
  portals: Portal[];
  currentPortalId: string | null;
  onSelectPortal: (portal: Portal) => void;
  onRefreshPortal: (portal: Portal) => void;
  onEditPortal: (portal: Portal) => void;
  onDeletePortal: (portalId: string) => void;
  onOpenAddModal: () => void;
  onLoadDemoPortal: () => void;
}

export const PortalsView: React.FC<PortalsViewProps> = ({
  portals,
  currentPortalId,
  onSelectPortal,
  onRefreshPortal,
  onEditPortal,
  onDeletePortal,
  onOpenAddModal,
  onLoadDemoPortal,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-400" />
            Portales IPTV Registrados ({portals.length})
          </h2>
          <p className="text-xs text-slate-400">
            Administra tus listas M3U, servidores Xtream Codes y middleware Stalker MAG
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={onLoadDemoPortal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Cargar Demo Legal</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Portal</span>
          </button>
        </div>
      </div>

      {/* Portals list */}
      {portals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/40 rounded-3xl border border-slate-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Tv className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">
            No tienes ningún portal añadido
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            Añade una lista remota M3U/M3U8, credenciales de Xtream Codes o portal Stalker, o carga la lista demo para probar el reproductor.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={onLoadDemoPortal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Cargar lista demo legal</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir mi propia lista</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {portals.map((portal) => {
            const isActive = portal.id === currentPortalId;
            return (
              <div
                key={portal.id}
                onClick={() => onSelectPortal(portal)}
                className={`relative group p-4 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border-blue-500/80 shadow-lg shadow-blue-900/10'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-md shrink-0 ${
                        portal.type === 'm3u'
                          ? 'bg-blue-600 text-white'
                          : portal.type === 'xtream'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {portal.type === 'm3u' ? (
                        <Layers className="w-6 h-6" />
                      ) : portal.type === 'xtream' ? (
                        <Server className="w-6 h-6" />
                      ) : (
                        <Tv className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-blue-400 transition">
                          {portal.name}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate max-w-[220px] sm:max-w-xs mt-0.5">
                        {portal.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onRefreshPortal(portal)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Recargar canales"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    {portal.id !== 'demo-portal' && (
                      <button
                        onClick={() => onEditPortal(portal)}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Editar portal"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {confirmDeleteId === portal.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onDeletePortal(portal.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(portal.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Eliminar portal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-semibold tracking-wider text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {portal.type}
                    </span>
                    <span>•</span>
                    <span>{portal.channelCount} canales</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition">
                    <span>{isActive ? 'Ver canales' : 'Cargar'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
