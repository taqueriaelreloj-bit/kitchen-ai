import { registerWebModule, NativeModule } from 'expo';
import { SpatialCapabilities } from './KitchenSpatial.types';

class KitchenSpatialModule extends NativeModule<{}> {
  async getCapabilities(): Promise<SpatialCapabilities> {
    return { provider: 'guided-camera', roomPlanSupported: false, arCoreSupported: false, depthSupported: false, status: 'WEB_FALLBACK' };
  }
}

export default registerWebModule(KitchenSpatialModule, 'KitchenSpatial');
