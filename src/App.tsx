/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Tv, 
  Smartphone, 
  Sparkles, 
  Layers, 
  Plus, 
  Download, 
  Star, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil
} from 'lucide-react';
import { Channel, FavoriteItem, Portal, ActiveTab } from './types/iptv';
import { 
  DEMO_CHANNELS, 
  fetchM3U, 
  fetchXtream, 
  fetchStalker,
  parseM3UContent,
  resolveStalkerStreamUrl
} from './services/iptvParser';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ChannelList } from './components/ChannelList';
import { PortalsView } from './components/PortalsView';
import { FavoritesView } from './components/FavoritesView';
import { Player } from './components/Player';
import { ApkModal } from './components/ApkModal';
import { PortalModal } from './components/PortalModal';
import { SettingsModal } from './components/SettingsModal';

const STORAGE_PORTALS_KEY = 'istb_portals_v2';
const STORAGE_FAVS_KEY = 'istb_favorites_v2';
const STORAGE_ACTIVE_PORTAL_KEY = 'istb_active_portal_v2';

export default function App() {
  const [portals, setPortals] = useState<Portal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PORTALS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePortalId, setActivePortalId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_PORTAL_KEY) || null;
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Cache channels per portal to prevent redundant network calls
  const channelsCacheRef = useRef<Record<string, Channel[]>>({});

  // Modals
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<Portal | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // PWA hooks
  const { isInstallable, isInstalled, install: installPwa } = usePWAInstall();
  const isOnline = useOnlineStatus();

  // Active portal reference
  const currentPortal = portals.find((p) => p.id === activePortalId) || null;

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Persist portals
  useEffect(() => {
    localStorage.setItem(STORAGE_PORTALS_KEY, JSON.stringify(portals));
  }, [portals]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(favorites));
  }, [favorites]);

  // Persist active portal
  useEffect(() => {
    if (activePortalId) {
      localStorage.setItem(STORAGE_ACTIVE_PORTAL_KEY, activePortalId);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_PORTAL_KEY);
    }
  }, [activePortalId]);

  const loadDemoPortal = useCallback(() => {
    const demo: Portal = {
      id: 'demo-portal',
      name: 'Portales y Canales Demo (Públicos)',
      type: 'm3u',
      url: 'https://iptv-org.github.io/iptv/index.m3u',
      channelCount: DEMO_CHANNELS.length,
      addedAt: Date.now(),
    };

    channelsCacheRef.current['demo-portal'] = DEMO_CHANNELS;
    setPortals((prev) => {
      const exists = prev.some((p) => p.id === 'demo-portal');
      return exists ? prev : [demo, ...prev];
    });
    setActivePortalId('demo-portal');
    setChannels(DEMO_CHANNELS);
    setPortalError(null);
    setActiveTab('home');
  }, []);

  // Auto-initialize demo portal if empty on first launch
  useEffect(() => {
    if (portals.length === 0) {
      loadDemoPortal();
    }
  }, [portals.length, loadDemoPortal]);

  const fetchPortalChannels = useCallback(async (portal: Portal): Promise<Channel[]> => {
    if (portal.id === 'demo-portal') {
      return DEMO_CHANNELS;
    }
    if (portal.type === 'm3u') {
      if (portal.rawContent) {
        const parsed = parseM3UContent(portal.rawContent);
        if (parsed.length === 0) {
          throw new Error('La lista M3U local no contiene canales válidos.');
        }
        return parsed;
      }
      return fetchM3U(portal.url);
    }
    if (portal.type === 'xtream') {
      return fetchXtream(portal);
    }
    if (portal.type === 'stalker') {
      return fetchStalker(portal);
    }
    return [];
  }, []);

  // Load channels whenever activePortalId changes
  useEffect(() => {
    if (!currentPortal) {
      setChannels([]);
      setPortalError(null);
      return;
    }

    // Use cached channels if just loaded via handleAddPortal
    const cached = channelsCacheRef.current[currentPortal.id];
    if (cached && cached.length > 0) {
      setChannels(cached);
      setPortalError(null);
      setIsLoadingChannels(false);
      return;
    }

    let isMounted = true;
    setIsLoadingChannels(true);
    setPortalError(null);

    async function load() {
      try {
        if (!currentPortal) return;
        const fetched = await fetchPortalChannels(currentPortal);

        if (isMounted) {
          channelsCacheRef.current[currentPortal.id] = fetched;
          setChannels(fetched);
          setPortalError(null);
          setPortals((prev) =>
            prev.map((p) =>
              p.id === currentPortal.id ? { ...p, channelCount: fetched.length } : p
            )
          );
        }
      } catch (err: unknown) {
        if (isMounted) {
          setChannels([]);
          setPortalError(
            err instanceof Error
              ? err.message
              : 'No se pudo conectar con el portal IPTV.'
          );
        }
      } finally {
        if (isMounted) setIsLoadingChannels(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [activePortalId, currentPortal?.id, fetchPortalChannels]);

  const handleAddPortal = async (
    newPortalData: Omit<Portal, 'id' | 'channelCount' | 'addedAt'>,
    existingId?: string
  ) => {
    const tempPortal: Portal = {
      ...newPortalData,
      id: existingId || `p-${Date.now()}`,
      channelCount: 0,
      addedAt: Date.now(),
    };

    // Fetch and verify before saving; PortalModal will catch and display errors inline
    const fetched = await fetchPortalChannels(tempPortal);
    tempPortal.channelCount = fetched.length;
    channelsCacheRef.current[tempPortal.id] = fetched;

    setPortals((prev) => {
      if (existingId) {
        return prev.map((p) => (p.id === existingId ? tempPortal : p));
      }
      return [tempPortal, ...prev];
    });
    setChannels(fetched);
    setPortalError(null);
    setActivePortalId(tempPortal.id);
    setActiveTab('home');
    showToast(
      'success',
      existingId
        ? `Portal "${tempPortal.name}" actualizado (${fetched.length} canales).`
        : `Portal "${tempPortal.name}" añadido (${fetched.length} canales).`
    );
  };

  const handleRefreshPortal = async (portal: Portal) => {
    setIsLoadingChannels(true);
    setPortalError(null);
    try {
      const fetched = await fetchPortalChannels(portal);
      channelsCacheRef.current[portal.id] = fetched;
      if (activePortalId === portal.id) {
        setChannels(fetched);
      }
      setPortals((prev) =>
        prev.map((p) => (p.id === portal.id ? { ...p, channelCount: fetched.length } : p))
      );
      showToast('success', `Canales actualizados (${fetched.length} canales).`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido al recargar';
      if (activePortalId === portal.id) {
        setChannels([]);
        setPortalError(msg);
      }
      showToast('error', msg);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleSelectPortal = (portal: Portal) => {
    setActiveTab('home');
    if (portal.id === activePortalId) {
      // If clicking the already-active portal and it has 0 channels or an error, reload it
      const cached = channelsCacheRef.current[portal.id];
      if (!cached || cached.length === 0 || portalError) {
        handleRefreshPortal(portal);
      }
      return;
    }
    setPortalError(null);
    setActivePortalId(portal.id);
  };

  const resolveChannelUrl = useCallback(
    async (channel: Channel): Promise<string> => {
      if (currentPortal && currentPortal.type === 'stalker') {
        return resolveStalkerStreamUrl(currentPortal, channel);
      }
      return channel.url;
    },
    [currentPortal]
  );

  const handleDeletePortal = (portalId: string) => {
    delete channelsCacheRef.current[portalId];
    const remaining = portals.filter((p) => p.id !== portalId);
    setPortals(remaining);
    if (activePortalId === portalId) {
      setPortalError(null);
      if (remaining.length > 0) {
        setActivePortalId(remaining[0].id);
      } else {
        setActivePortalId(null);
        setChannels([]);
      }
    }
  };

  const handleToggleFavorite = (channel: Channel) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.channelId === channel.id);
      if (exists) {
        return prev.filter((f) => f.channelId !== channel.id);
      } else {
        return [
          {
            channelId: channel.id,
            portalId: currentPortal?.id || 'demo',
            name: channel.name,
            category: channel.category,
            logo: channel.logo,
            url: channel.url,
          },
          ...prev,
        ];
      }
    });
  };

  const handleRemoveFavorite = (channelId: string) => {
    setFavorites((prev) => prev.filter((f) => f.channelId !== channelId));
  };

  const handleResetAll = () => {
    channelsCacheRef.current = {};
    setPortals([]);
    setFavorites([]);
    setActivePortalId(null);
    setChannels([]);
    setPortalError(null);
    localStorage.removeItem(STORAGE_PORTALS_KEY);
    localStorage.removeItem(STORAGE_FAVS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_PORTAL_KEY);
    showToast('success', 'Todos los datos locales han sido restablecidos.');
  };

  const handleImportData = (data: { portals: Portal[]; favorites: FavoriteItem[] }) => {
    channelsCacheRef.current = {};
    setPortals(data.portals);
    setFavorites(data.favorites);
    setPortalError(null);
    if (data.portals.length > 0) {
      setActivePortalId(data.portals[0].id);
    }
  };

  // Live URL for APK generation
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-5xtrjevu7qwkksuh5ywwmi-612629596998.europe-west2.run.app';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-6">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-semibold text-white flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Modo Sin Conexión — La aplicación está funcionando desde el Service Worker en caché local.</span>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-semibold backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentPortal={currentPortal}
        onOpenPortalModal={() => {
          setEditingPortal(null);
          setIsPortalModalOpen(true);
        }}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstallPwa={installPwa}
        isOnline={isOnline}
      />

      {/* Hero / APK Promo Banner */}
      <section className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/70 border-b border-slate-800/80 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Smartphone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  ¿Quieres el APK para Android de esta app?
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Listo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Genera el paquete <strong>.apk nativo</strong> con PWABuilder, compila con Bubblewrap o instala directamente como <strong>WebAPK</strong> en tu móvil o Smart TV.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto">
            <button
              onClick={() => setIsApkModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Abrir Generador de APK</span>
            </button>
            {isInstallable && (
              <button
                onClick={installPwa}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Instalar PWA</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Desktop Tabs */}
        <div className="hidden md:flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Canales ({channels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'portals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mis Portales ({portals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Favoritos ({favorites.length})</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                setEditingPortal(null);
                setIsPortalModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Añadir Lista IPTV</span>
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'home' && (
          <>
            {portalError && !isLoadingChannels ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/50 rounded-3xl border border-rose-500/30 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-white">
                    No se pudo cargar el portal &ldquo;{currentPortal?.name}&rdquo;
                  </h3>
                  <p className="text-xs text-rose-300 leading-relaxed">
                    {portalError}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {currentPortal && (
                    <button
                      onClick={() => handleRefreshPortal(currentPortal)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reintentar</span>
                    </button>
                  )}
                  {currentPortal && currentPortal.id !== 'demo-portal' && (
                    <button
                      onClick={() => {
                        setEditingPortal(currentPortal);
                        setIsPortalModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar portal</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('portals')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Gestionar portales</span>
                  </button>
                  <button
                    onClick={loadDemoPortal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cargar canales demo</span>
                  </button>
                </div>
              </div>
            ) : (
              <ChannelList
                channels={channels}
                favorites={favorites.map((f) => f.channelId)}
                onSelectChannel={(ch) => setSelectedChannel(ch)}
                onToggleFavorite={handleToggleFavorite}
                isLoading={isLoadingChannels}
              />
            )}
          </>
        )}

        {activeTab === 'portals' && (
          <PortalsView
            portals={portals}
            currentPortalId={activePortalId}
            onSelectPortal={handleSelectPortal}
            onRefreshPortal={handleRefreshPortal}
            onEditPortal={(portal) => {
              setEditingPortal(portal);
              setIsPortalModalOpen(true);
            }}
            onDeletePortal={handleDeletePortal}
            onOpenAddModal={() => {
              setEditingPortal(null);
              setIsPortalModalOpen(true);
            }}
            onLoadDemoPortal={loadDemoPortal}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onSelectChannel={(ch) => setSelectedChannel(ch)}
            onRemoveFavorite={handleRemoveFavorite}
            onGoToChannels={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto py-4">
            <SettingsModal
              isOpen={true}
              onClose={() => setActiveTab('home')}
              portals={portals}
              favorites={favorites}
              onImportData={handleImportData}
              onResetAll={handleResetAll}
              onOpenApkModal={() => setIsApkModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedChannel && (
        <Player
          channel={selectedChannel}
          channels={channels}
          isFavorite={favorites.some((f) => f.channelId === selectedChannel.id)}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setSelectedChannel(null)}
          onSelectChannel={(ch) => setSelectedChannel(ch)}
          resolveChannelUrl={resolveChannelUrl}
          portalMac={currentPortal?.type === 'stalker' ? currentPortal.mac : undefined}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        favoritesCount={favorites.length}
        portalsCount={portals.length}
      />

      {/* Modals */}
      <ApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={installPwa}
        appUrl={appUrl}
      />

      <PortalModal
        isOpen={isPortalModalOpen}
        onClose={() => {
          setIsPortalModalOpen(false);
          setEditingPortal(null);
        }}
        onAddPortal={handleAddPortal}
        onLoadDemoPortal={loadDemoPortal}
        editingPortal={editingPortal}
      />

      {activeTab !== 'settings' && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          portals={portals}
          favorites={favorites}
          onImportData={handleImportData}
          onResetAll={handleResetAll}
          onOpenApkModal={() => setIsApkModalOpen(true)}
        />
      )}

    </div>
  );
}
