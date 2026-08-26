import { requireOptionalNativeModule } from 'expo';

export type SpatialCapabilities = {
  provider: 'roomplan' | 'arcore-depth' | 'guided-camera';
  roomPlanSupported: boolean;
  arCoreSupported: boolean;
  depthSupported: boolean;
  status: string;
};

type KitchenSpatialNative = { getCapabilities(): Promise<SpatialCapabilities> };
const fallback: SpatialCapabilities = { provider: 'guided-camera', roomPlanSupported: false, arCoreSupported: false, depthSupported: false, status: 'NATIVE_MODULE_UNAVAILABLE' };

export async function getSpatialCapabilities(): Promise<SpatialCapabilities> {
  const native = requireOptionalNativeModule<KitchenSpatialNative>('KitchenSpatial');
  if (!native) return fallback;
  try { return await native.getCapabilities(); } catch { return fallback; }
}
