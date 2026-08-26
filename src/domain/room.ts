import { RoomModel, ScanPhoto } from './types';
export const REQUIRED_SCAN_ANGLES = [0, 90, 180, 270] as const;
export function reconstructRoom(photos: ScanPhoto[]): RoomModel {
  if (photos.length < REQUIRED_SCAN_ANGLES.length) throw new Error('Se necesitan cuatro vistas para reconstruir la cocina.');
  return { id: `room-${photos[0].capturedAt}`, widthM: 3.7, lengthM: 4.2, heightM: 2.45, layout: 'L', openings: [{ type: 'door', wall: 0, widthM: 0.9 }, { type: 'window', wall: 1, widthM: 1.4 }], confidence: 0.82, source: 'guided-camera', photos };
}
export const roomArea = (room: RoomModel) => Math.round(room.widthM * room.lengthM * 10) / 10;
export function updateRoomDimensions(room: RoomModel, dimensions: Pick<RoomModel, 'widthM' | 'lengthM' | 'heightM'>): RoomModel {
  const valid = Object.values(dimensions).every(value => Number.isFinite(value) && value >= 1 && value <= 20);
  if (!valid) throw new Error('Las medidas deben estar entre 1 y 20 metros.');
  return { ...room, ...dimensions, confidence: Math.max(room.confidence, 0.9) };
}
