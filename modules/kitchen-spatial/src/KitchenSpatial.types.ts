export type SpatialProvider = 'roomplan' | 'arcore-depth' | 'guided-camera';
export type SpatialCapabilities = {
  provider: SpatialProvider;
  roomPlanSupported: boolean;
  arCoreSupported: boolean;
  depthSupported: boolean;
  status: string;
};
