import React from 'react';
import { Star, Tv, Play, Trash2 } from 'lucide-react';
import { Channel, FavoriteItem } from '../types/iptv';

interface FavoritesViewProps {
  favorites: FavoriteItem[];
  onSelectChannel: (channel: Channel) => void;
  onRemoveFavorite: (channelId: string) => void;
  onGoToChannels: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onSelectChannel,
  onRemoveFavorite,
  onGoToChannels,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Canales Favoritos ({favorites.length})
          </h2>
          <p className="text-xs text-slate-400">
            Tus canales guardados para acceso rápido desde cualquier portal
          </p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-900/40 rounded-3xl border border-slate-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">
            No tienes canales favoritos aún
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
            Pulsa en la estrella ☆ de cualquier canal de tu lista para tenerlo siempre a mano aquí.
          </p>
          <button
            onClick={onGoToChannels}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <Tv className="w-4 h-4" />
            <span>Explorar canales</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {favorites.map((fav) => (
            <div
              key={fav.channelId}
              onClick={() =>
                onSelectChannel({
                  id: fav.channelId,
                  name: fav.name,
                  category: fav.category,
                  logo: fav.logo,
                  url: fav.url,
                })
              }
              className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/50 rounded-2xl p-3 flex items-center justify-between gap-3 transition shadow-sm hover:shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden border border-slate-800">
                  {fav.logo ? (
                    <img
                      src={fav.logo}
                      alt={fav.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-extrabold text-xs text-amber-400">
                      {fav.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition truncate">
                    {fav.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {fav.category || 'General'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onRemoveFavorite(fav.channelId)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Quitar de favoritos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    onSelectChannel({
                      id: fav.channelId,
                      name: fav.name,
                      category: fav.category,
                      logo: fav.logo,
                      url: fav.url,
                    })
                  }
                  className="p-2 rounded-xl bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition"
                  title="Reproducir canal"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
