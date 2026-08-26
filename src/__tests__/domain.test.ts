import { generateDesigns } from '../domain/design';
import { estimatePrice } from '../domain/pricing';
import { reconstructRoom, roomArea, updateRoomDimensions } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import { inspectScan, reconstructWithBestProvider } from '../services/reconstruction';
const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, i) => ({ uri: `photo-${i}.jpg`, angle, capturedAt: '2026-08-25T00:00:00.000Z' }));
describe('Kitchen AI domain', () => {
  test('requires a complete four-wall scan', () => expect(() => reconstructRoom(photos.slice(0, 3))).toThrow('cuatro vistas'));
  test('reconstructs a usable room model', () => { const room = reconstructRoom(photos); expect(roomArea(room)).toBe(15.5); expect(room.confidence).toBeGreaterThan(0.8); });
  test('creates three distinct design options', () => { const designs = generateDesigns(reconstructRoom(photos)); expect(designs).toHaveLength(3); expect(new Set(designs.map(d => d.style)).size).toBe(3); });
  test('updates price for premium choices', () => { const room = reconstructRoom(photos); const design = generateDesigns(room)[0]; expect(estimatePrice(room, { ...design, cabinetColor: 'wood' }).total).toBeGreaterThan(estimatePrice(room, design).total); });
  test('rejects incomplete or duplicated scans', () => { expect(inspectScan(photos).complete).toBe(true); expect(inspectScan([...photos.slice(0, 3), photos[0]]).complete).toBe(false); });
  test('uses an available reconstruction provider', async () => { const room = await reconstructWithBestProvider(photos); expect(room.source).toBe('guided-camera'); });
  test('accepts safe manual dimension corrections', () => { const room = updateRoomDimensions(reconstructRoom(photos), { widthM: 4, lengthM: 5, heightM: 2.6 }); expect(roomArea(room)).toBe(20); expect(() => updateRoomDimensions(room, { widthM: 0, lengthM: 5, heightM: 2 })).toThrow('1 y 20'); });
});
