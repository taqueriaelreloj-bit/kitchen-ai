import { NativeModule, requireNativeModule } from 'expo';
import { SpatialCapabilities } from './KitchenSpatial.types';

declare class KitchenSpatialModule extends NativeModule<{}> {
  getCapabilities(): Promise<SpatialCapabilities>;
}

export default requireNativeModule<KitchenSpatialModule>('KitchenSpatial');
