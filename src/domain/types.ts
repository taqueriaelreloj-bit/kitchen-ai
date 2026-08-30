export type ScanPhoto = { uri: string; angle: number; capturedAt: string };
export type CaptureSource = 'guided-camera' | 'roomplan' | 'arcore-depth' | 'manual';
export type RoomModel = { id: string; widthM: number; lengthM: number; heightM: number; layout: 'L' | 'U' | 'galley' | 'single-wall'; openings: { type: 'door' | 'window'; wall: number; widthM: number }[]; confidence: number; source: CaptureSource; photos: ScanPhoto[] };
export type KitchenStyle = 'warm' | 'modern' | 'classic';
export type CabinetColor = 'cream' | 'white' | 'navy' | 'wood';
export type Countertop = 'quartz' | 'granite' | 'laminate';
export type KitchenDesign = { id: string; name: string; description: string; style: KitchenStyle; cabinetColor: CabinetColor; countertop: Countertop; accent: string; includesIsland: boolean };
export type PriceEstimate = { cabinets: number; countertops: number; installation: number; fixtures: number; total: number; low: number; high: number };
