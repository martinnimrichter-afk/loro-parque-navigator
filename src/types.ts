export type Lang = 'en' | 'es' | 'de' | 'cs' | 'pl' | 'fr';

export interface LocalName { en: string; es?: string; de?: string; cs?: string; pl?: string; fr?: string; }

export type PoiCategory = 'animal' | 'show' | 'food' | 'toilets' | 'shop' | 'info' | 'water' | 'entrance';

export interface Poi {
  id: string;
  category: PoiCategory;
  name: LocalName;
  lat: number;
  lon: number;
}

export interface GraphNode { id: number; lat: number; lon: number; }

/** edges: [fromNodeId, toNodeId, distanceMeters] — undirected */
export interface Graph { nodes: GraphNode[]; edges: [number, number, number][]; }

export interface Venue { id: string; name: LocalName; lat: number; lon: number; }

export interface ShowEntry { venueId: string; times: string[]; validFrom?: string; validTo?: string; }

export interface ShowsData { updated: string; timezone: string; venues: Venue[]; shows: ShowEntry[]; }
