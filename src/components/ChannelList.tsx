import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  Star, 
  Tv, 
  LayoutGrid, 
  List, 
  Play
} from 'lucide-react';
import { Channel } from '../types/iptv';

const PAGE_SIZE = 120;

interface ChannelListProps {
  channels: Channel[];
  favorites: string[]; // array of channel IDs
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
  isLoading?: boolean;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  favorites,
  onSelectChannel,
  onToggleFavorite,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [channels, search, selectedCategory]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [channels]);

  // Filter channels based on search and selected category
  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q));

      const matchCat =
        selectedCategory === 'all' ||
        c.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [channels, search, selectedCategory]);

  const visibleChannels = useMemo(
    () => filteredChannels.slice(0, visibleLimit),
    [filteredChannels, visibleLimit]
  );

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, channel: Channel) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectChannel(channel);
      return;
    }

    if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp'
    ) {
      const container = e.currentTarget.parentElement;
      if (!container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>('[data-channel-card="true"]'));
      const idx = items.indexOf(e.currentTarget);
      if (idx === -1) return;

      let step = 1;
      if (viewMode === 'grid') {
        const w = window.innerWidth;
        const cols = w >= 1024 ? 5 : w >= 768 ? 4 : w >= 640 ? 3 : 2;
        if (e.key === 'ArrowDown') step = cols;
        else if (e.key === 'ArrowUp') step = -cols;
        else if (e.key === 'ArrowLeft') step = -1;
        else step = 1;
      } else {
        if (e.key === 'ArrowDown') step = 1;
        else if (e.key === 'ArrowUp') step = -1;
        else return;
      }

      const nextIdx = idx + step;
      if (nextIdx >= 0 && nextIdx < items.length) {
        e.preventDefault();
        items[nextIdx].focus();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o categoría..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded"
            >
              Borrar
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vista en cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vista en lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Horizontal Filter Scroller */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Todos ({channels.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-10 h-10 rounded-full border-3 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
          <p className="text-xs">Cargando canales del portal...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredChannels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/50 rounded-3xl border border-slate-800/80 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Tv className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 mb-1">
            No se encontraron canales
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {search
              ? `No hay ningún canal que coincida con "${search}". Intenta con otro término.`
              : 'Este portal no contiene canales o las categorías seleccionadas están vacías.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-blue-400 hover:bg-slate-700 font-medium transition cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && visibleChannels.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visibleChannels.map((channel) => {
            const isFav = favorites.includes(channel.id);
            return (
              <div
                key={channel.id}
                role="button"
                tabIndex={0}
                data-channel-card="true"
                onClick={() => onSelectChannel(channel)}
                onKeyDown={(e) => handleCardKeyDown(e, channel)}
                className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:scale-[1.02] rounded-2xl overflow-hidden flex flex-col transition shadow-sm hover:shadow-xl cursor-pointer outline-none"
              >
                {/* Channel Thumb / Logo Banner */}
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center p-3 overflow-hidden">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).parentElement?.querySelector('.logo-fallback');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                      className="w-full h-full object-contain filter group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : null}
                  <div
                    className={`logo-fallback w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 items-center justify-center text-white font-extrabold text-base shadow-md ${
                      channel.logo ? 'hidden' : 'flex'
                    }`}
                  >
                    {channel.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px] transition duration-200">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                      <Play className="w-5 h-5 fill-white translate-x-0.5" />
                    </div>
                  </div>

                  {/* Star Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(channel);
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition cursor-pointer z-10 ${
                      isFav
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-black/50 text-slate-400 hover:text-white border border-white/10'
                    }`}
                    title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Channel Meta */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition truncate" title={channel.name}>
                    {channel.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span className="truncate max-w-[120px]">{channel.category || 'General'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && visibleChannels.length > 0 && (
        <div className="divide-y divide-slate-800/80 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {visibleChannels.map((channel) => {
            const isFav = favorites.includes(channel.id);
            return (
              <div
                key={channel.id}
                role="button"
                tabIndex={0}
                data-channel-card="true"
                onClick={() => onSelectChannel(channel)}
                onKeyDown={(e) => handleCardKeyDown(e, channel)}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-800/50 focus-visible:bg-slate-800/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 transition cursor-pointer group outline-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden border border-slate-800">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="font-bold text-xs text-blue-400">
                        {channel.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition truncate">
                      {channel.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {channel.category || 'General'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(channel);
                    }}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      isFav
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectChannel(channel);
                    }}
                    className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition"
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Pagination */}
      {!isLoading && filteredChannels.length > visibleLimit && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-slate-400">
            Mostrando {visibleChannels.length} de {filteredChannels.length} canales
          </p>
          <button
            onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            Mostrar más canales (+{Math.min(PAGE_SIZE, filteredChannels.length - visibleLimit)})
          </button>
        </div>
      )}
    </div>
  );
};
