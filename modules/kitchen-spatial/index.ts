// Re-export the native module. On web, it will be resolved to KitchenSpatialModule.web.ts
// and on native platforms to KitchenSpatialModule.ts
export { default } from './src/KitchenSpatialModule';
export * from './src/KitchenSpatial.types';
