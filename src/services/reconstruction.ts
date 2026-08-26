import { reconstructRoom } from '../domain/room';
import { CaptureSource, RoomModel, ScanPhoto } from '../domain/types';

export type ScanQuality = { score: number; complete: boolean; issues: string[] };
export interface ReconstructionProvider {
  source: CaptureSource;
  isAvailable(): Promise<boolean>;
  reconstruct(photos: ScanPhoto[]): Promise<RoomModel>;
}

export function inspectScan(photos: ScanPhoto[]): ScanQuality {
  const issues: string[] = [];
  const angles = new Set(photos.map(photo => photo.angle));
  const uris = new Set(photos.map(photo => photo.uri));
  if (photos.length < 4) issues.push('Faltan vistas de la cocina.');
  if (angles.size < 4) issues.push('Hay paredes repetidas.');
  if (uris.size < photos.length) issues.push('Hay fotografías duplicadas.');
  const score = Math.max(0, 100 - issues.length * 30 - Math.max(0, 4 - photos.length) * 10);
  return { score, complete: issues.length === 0, issues };
}

export const guidedCameraProvider: ReconstructionProvider = {
  source: 'guided-camera',
  async isAvailable() { return true; },
  async reconstruct(photos) {
    const quality = inspectScan(photos);
    if (!quality.complete) throw new Error(quality.issues[0]);
    return reconstructRoom(photos);
  },
};

// Native providers implement this same contract once their Expo modules are added.
// Selection stays outside the UI so RoomPlan/ARCore will not require a flow rewrite.
export async function reconstructWithBestProvider(photos: ScanPhoto[], providers: ReconstructionProvider[] = [guidedCameraProvider]) {
  for (const provider of providers) if (await provider.isAvailable()) return provider.reconstruct(photos);
  throw new Error('Este dispositivo no tiene un método de escaneo disponible.');
}
