import { EditorObject } from './editor';

export type MicrowaveModelId =
  | 'microwave-countertop-24-stainless'
  | 'microwave-over-range-30-stainless';

export type MicrowaveInstallation = 'countertop' | 'over-the-range';

export type MicrowaveCatalogItem = {
  id: MicrowaveModelId;
  category: 'microwave';
  name: string;
  shortName: string;
  style: string;
  finish: string;
  color: string;
  material: string;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  modelUri: string;
  thumbnailUri: string;
  pbr: true;
  units: 'meters';
  upAxis: 'Y';
  origin: 'floor-center';
  features: string[];
  installation: MicrowaveInstallation;
  defaultElevationIn: number;
  hasExtractor: boolean;
  venting?: ('recirculating' | 'ducted')[];
  dimensionsLocked: true;
};

export const MICROWAVE_CATALOG: MicrowaveCatalogItem[] = [
  {
    id: 'microwave-countertop-24-stainless',
    category: 'microwave',
    name: '24 in Stainless Countertop Microwave',
    shortName: 'Countertop Microwave',
    style: 'Contemporary countertop',
    finish: 'Brushed stainless steel',
    color: '#AEB5B8',
    material: 'Brushed Stainless Steel',
    widthIn: 24,
    heightIn: 14,
    depthIn: 18,
    modelUri: 'assets/models/microwaves/microwave-countertop-24-stainless.gltf',
    thumbnailUri: 'assets/models/microwaves/thumbnails/microwave-countertop-24-stainless.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['Black glass door', 'Digital controls', 'Countertop installation'],
    installation: 'countertop',
    defaultElevationIn: 36,
    hasExtractor: false,
    dimensionsLocked: true,
  },
  {
    id: 'microwave-over-range-30-stainless',
    category: 'microwave',
    name: '30 in Over-the-Range Microwave with Extractor',
    shortName: 'Microwave + Extractor',
    style: 'Over-the-range',
    finish: 'Brushed stainless steel',
    color: '#AEB5B8',
    material: 'Brushed Stainless Steel',
    widthIn: 30,
    heightIn: 16.5,
    depthIn: 16,
    modelUri: 'assets/models/microwaves/microwave-over-range-30-stainless.gltf',
    thumbnailUri: 'assets/models/microwaves/thumbnails/microwave-over-range-30-stainless.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['Integrated extractor fan', 'Grease filters', 'Cooktop light'],
    installation: 'over-the-range',
    defaultElevationIn: 54,
    hasExtractor: true,
    venting: ['recirculating', 'ducted'],
    dimensionsLocked: true,
  },
];

export function microwaveById(id?: string) {
  return MICROWAVE_CATALOG.find(item => item.id === id);
}

export function isMicrowaveObject(object?: EditorObject): object is EditorObject & { kind: 'appliance' } {
  if (!object || object.kind !== 'appliance') return false;
  const key = `${object.productId ?? ''} ${object.variantId ?? ''} ${object.name}`.toLowerCase();
  return key.includes('microwave') || key.includes('microondas');
}

export function createCatalogMicrowave(
  id: MicrowaveModelId,
  partial: Partial<EditorObject> = {},
): EditorObject {
  const item = microwaveById(id);
  if (!item) throw new Error(`Unknown microwave catalog id: ${id}`);
  return {
    id: `appliance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'appliance',
    name: item.name,
    x: 144,
    y: 120,
    widthIn: item.widthIn,
    heightIn: item.heightIn,
    depthIn: item.depthIn,
    rotation: 0,
    elevationIn: item.defaultElevationIn,
    color: item.color,
    finishId: item.id,
    productId: item.id,
    variantId: item.id,
    applianceType: 'generic',
    material: item.material,
    dimensionsLocked: true,
    ...partial,
  };
}
