import React from 'react';
import { Home, Tv, Star, Smartphone, Settings } from 'lucide-react';
import { ActiveTab } from '../types/iptv';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenApkModal: () => void;
  favoritesCount: number;
  portalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenApkModal,
  favoritesCount,
  portalsCount,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 md:hidden">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'home'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button
          onClick={() => onTabChange('portals')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'portals'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px]">Portales</span>
          {portalsCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-slate-800 text-[9px] text-slate-300 font-mono flex items-center justify-center border border-slate-700">
              {portalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('favorites')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'favorites'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px]">Favoritos</span>
          {favoritesCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-mono flex items-center justify-center border border-amber-500/40">
              {favoritesCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenApkModal}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
        >
          <div className="relative">
            <Smartphone className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-[10px] font-bold">APK</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'settings'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
