export type PortalType = 'm3u' | 'xtream' | 'stalker';

export interface Channel {
  id: string;
  name: string;
  category: string;
  logo?: string;
  url: string;
  cmd?: string;
  tvgId?: string;
  tvgName?: string;
}

export interface Portal {
  id: string;
  name: string;
  type: PortalType;
  url: string;
  rawContent?: string;
  user?: string;
  pass?: string;
  mac?: string;
  channelCount: number;
  addedAt: number;
}

export interface FavoriteItem {
  channelId: string;
  portalId: string;
  name: string;
  category: string;
  logo?: string;
  url: string;
  cmd?: string;
}

export type ActiveTab = 'home' | 'portals' | 'favorites' | 'settings';
