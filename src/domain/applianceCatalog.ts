import { EditorObject } from './editor';

export type RefrigeratorModelId =
  | 'refrigerator-french-door-stainless'
  | 'refrigerator-panel-ready-built-in'
  | 'refrigerator-smart-black'
  | 'refrigerator-retro-blue';

export type GasRangeModelId =
  | 'gas-range-32-4-burner'
  | 'gas-range-36-4-burner-griddle'
  | 'gas-range-42-4-burner-griddle';

export type ApplianceModelId = RefrigeratorModelId | GasRangeModelId;
export type GasRangeFinishId =
  | 'stainless-steel'
  | 'black'
  | 'white'
  | 'matte-black'
  | 'matte-white'
  | 'red'
  | 'blue'
  | 'green'
  | 'cream-ivory';

export type GasRangeOvenType = 'single' | 'double-side-by-side' | 'single-wide';

export type GasRangeFinish = {
  id: GasRangeFinishId;
  name: string;
  color: string;
  material: string;
  metalness: number;
  roughness: number;
};

export type ApplianceCatalogItem = {
  id: ApplianceModelId;
  category: 'refrigerator' | 'gas-range';
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
  defaultFinishId?: GasRangeFinishId;
  fuelType?: 'gas';
  burnerCount?: number;
  knobCount?: number;
  hasCenterGriddle?: boolean;
  griddleHandle?: boolean;
  griddleControlKnob?: boolean;
  ovenType?: GasRangeOvenType;
  ovenDoorCount?: number;
  dimensionsLocked?: boolean;
};

export const GAS_RANGE_FINISHES: GasRangeFinish[] = [
  { id: 'stainless-steel', name: 'Stainless Steel', color: '#AEB3B7', material: 'Brushed Stainless Steel', metalness: .94, roughness: .32 },
  { id: 'black', name: 'Black', color: '#111315', material: 'Gloss Black Enamel', metalness: .08, roughness: .24 },
  { id: 'white', name: 'White', color: '#F4F4F2', material: 'Gloss White Enamel', metalness: .04, roughness: .26 },
  { id: 'matte-black', name: 'Matte Black', color: '#202124', material: 'Matte Black Enamel', metalness: .04, roughness: .78 },
  { id: 'matte-white', name: 'Matte White', color: '#E9E7E2', material: 'Matte White Enamel', metalness: .02, roughness: .72 },
  { id: 'red', name: 'Red', color: '#B51F2E', material: 'Red Enamel', metalness: .06, roughness: .28 },
  { id: 'blue', name: 'Blue', color: '#1D3F68', material: 'Blue Enamel', metalness: .06, roughness: .29 },
  { id: 'green', name: 'Green', color: '#214D3A', material: 'Green Enamel', metalness: .06, roughness: .3 },
  { id: 'cream-ivory', name: 'Cream / Ivory', color: '#E8DDC7', material: 'Cream Ivory Enamel', metalness: .03, roughness: .34 },
];

export const DEFAULT_GAS_RANGE_FINISH_ID: GasRangeFinishId = 'stainless-steel';

export const REFRIGERATOR_CATALOG: (ApplianceCatalogItem & { id: RefrigeratorModelId; category: 'refrigerator' })[] = [
  {
    id: 'refrigerator-french-door-stainless',
    category: 'refrigerator',
    name: '36 in French-Door Stainless Refrigerator',
    shortName: 'Stainless French Door',
    style: 'Contemporary',
    finish: 'Brushed stainless steel',
    color: '#AEB6B8',
    material: 'Brushed Stainless Steel',
    widthIn: 36,
    heightIn: 70,
    depthIn: 30,
    modelUri: 'assets/models/refrigerators/refrigerator-french-door-stainless.gltf',
    thumbnailUri: 'assets/models/refrigerators/thumbnails/refrigerator-french-door-stainless.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['French doors', 'Bottom freezer', 'Water and ice dispenser'],
  },
  {
    id: 'refrigerator-panel-ready-built-in',
    category: 'refrigerator',
    name: '36 in Panel-Ready Built-In Refrigerator',
    shortName: 'Panel-Ready Built-In',
    style: 'Transitional / built-in',
    finish: 'Panel-ready matte white',
    color: '#F1F2F1',
    material: 'Panel Ready Matte White',
    widthIn: 36,
    heightIn: 84,
    depthIn: 24,
    modelUri: 'assets/models/refrigerators/refrigerator-panel-ready-built-in.gltf',
    thumbnailUri: 'assets/models/refrigerators/thumbnails/refrigerator-panel-ready-built-in.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['Integrated panels', 'Hidden handle channels', 'Toe-kick ventilation'],
  },
  {
    id: 'refrigerator-smart-black',
    category: 'refrigerator',
    name: '36 in Black Glass Smart Refrigerator',
    shortName: 'Black Smart Refrigerator',
    style: 'Modern smart appliance',
    finish: 'Black glass and black stainless',
    color: '#17191A',
    material: 'Black Glass Smart Appliance',
    widthIn: 36,
    heightIn: 70,
    depthIn: 30,
    modelUri: 'assets/models/refrigerators/refrigerator-smart-black.gltf',
    thumbnailUri: 'assets/models/refrigerators/thumbnails/refrigerator-smart-black.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['Smart display', 'French doors', 'Bottom freezer'],
  },
  {
    id: 'refrigerator-retro-blue',
    category: 'refrigerator',
    name: '24 in Retro Pastel Blue Refrigerator',
    shortName: 'Retro Pastel Blue',
    style: 'Retro / mid-century',
    finish: 'Pastel blue enamel with chrome',
    color: '#9FCBE4',
    material: 'Pastel Blue Enamel',
    widthIn: 24,
    heightIn: 63,
    depthIn: 26,
    modelUri: 'assets/models/refrigerators/refrigerator-retro-blue.gltf',
    thumbnailUri: 'assets/models/refrigerators/thumbnails/refrigerator-retro-blue.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['Top freezer', 'Rounded retro body', 'Chrome pull handles'],
  },
];

export const GAS_RANGE_CATALOG: (ApplianceCatalogItem & { id: GasRangeModelId; category: 'gas-range' })[] = [
  {
    id: 'gas-range-32-4-burner',
    category: 'gas-range',
    name: '32" Gas Range – 4 Burners',
    shortName: '32" 4-Burner Range',
    style: 'Professional residential',
    finish: 'Brushed stainless steel',
    color: '#AEB3B7',
    material: 'Brushed Stainless Steel',
    widthIn: 32,
    heightIn: 36,
    depthIn: 28,
    modelUri: 'parametric://gas-ranges/gas-range-32-4-burner',
    thumbnailUri: 'assets/models/gas-ranges/thumbnails/gas-range-32-4-burner.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['4 gas burners', 'Single oven', 'Cast-iron grates'],
    defaultFinishId: DEFAULT_GAS_RANGE_FINISH_ID,
    fuelType: 'gas',
    burnerCount: 4,
    knobCount: 4,
    hasCenterGriddle: false,
    griddleHandle: false,
    griddleControlKnob: false,
    ovenType: 'single',
    ovenDoorCount: 1,
    dimensionsLocked: true,
  },
  {
    id: 'gas-range-36-4-burner-griddle',
    category: 'gas-range',
    name: '36" Gas Range – 4 Burners + Center Griddle',
    shortName: '36" Range + Griddle',
    style: 'Professional residential',
    finish: 'Brushed stainless steel',
    color: '#AEB3B7',
    material: 'Brushed Stainless Steel',
    widthIn: 36,
    heightIn: 36,
    depthIn: 28,
    modelUri: 'parametric://gas-ranges/gas-range-36-4-burner-griddle',
    thumbnailUri: 'assets/models/gas-ranges/thumbnails/gas-range-36-4-burner-griddle.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['4 gas burners', 'Center griddle with handle', 'Dedicated GRIDDLE knob', 'Two oven doors'],
    defaultFinishId: DEFAULT_GAS_RANGE_FINISH_ID,
    fuelType: 'gas',
    burnerCount: 4,
    knobCount: 5,
    hasCenterGriddle: true,
    griddleHandle: true,
    griddleControlKnob: true,
    ovenType: 'double-side-by-side',
    ovenDoorCount: 2,
    dimensionsLocked: true,
  },
  {
    id: 'gas-range-42-4-burner-griddle',
    category: 'gas-range',
    name: '42" Gas Range – 4 Burners + Center Griddle',
    shortName: '42" Range + Griddle',
    style: 'Luxury professional',
    finish: 'Brushed stainless steel',
    color: '#AEB3B7',
    material: 'Brushed Stainless Steel',
    widthIn: 42,
    heightIn: 36,
    depthIn: 28,
    modelUri: 'parametric://gas-ranges/gas-range-42-4-burner-griddle',
    thumbnailUri: 'assets/models/gas-ranges/thumbnails/gas-range-42-4-burner-griddle.svg',
    pbr: true,
    units: 'meters',
    upAxis: 'Y',
    origin: 'floor-center',
    features: ['4 gas burners', 'Large center griddle with handle', 'Dedicated GRIDDLE knob', 'Extra-wide oven'],
    defaultFinishId: DEFAULT_GAS_RANGE_FINISH_ID,
    fuelType: 'gas',
    burnerCount: 4,
    knobCount: 5,
    hasCenterGriddle: true,
    griddleHandle: true,
    griddleControlKnob: true,
    ovenType: 'single-wide',
    ovenDoorCount: 1,
    dimensionsLocked: true,
  },
];

export const APPLIANCE_CATALOG: ApplianceCatalogItem[] = [...REFRIGERATOR_CATALOG, ...GAS_RANGE_CATALOG];

export function refrigeratorById(id?: string) {
  return REFRIGERATOR_CATALOG.find(item => item.id === id);
}

export function gasRangeById(id?: string) {
  return GAS_RANGE_CATALOG.find(item => item.id === id);
}

export function applianceById(id?: string) {
  return APPLIANCE_CATALOG.find(item => item.id === id);
}

export function gasRangeFinishById(id?: string) {
  return GAS_RANGE_FINISHES.find(finish => finish.id === id) ?? GAS_RANGE_FINISHES[0];
}

export function isGasRangeObject(object?: EditorObject): object is EditorObject & { kind: 'appliance' } {
  if (!object || object.kind !== 'appliance') return false;
  const key = `${object.applianceType ?? ''} ${object.productId ?? ''} ${object.variantId ?? ''} ${object.name}`.toLowerCase();
  return object.applianceType === 'gas-range' || key.includes('gas-range') || key.includes('gas range');
}

export function gasRangeFinishPatch(finishId: GasRangeFinishId): Partial<EditorObject> {
  const finish = gasRangeFinishById(finishId);
  return { finishId: finish.id, color: finish.color, material: finish.material };
}

export function createCatalogRefrigerator(
  id: RefrigeratorModelId,
  partial: Partial<EditorObject> = {},
): EditorObject {
  const item = refrigeratorById(id);
  if (!item) throw new Error(`Unknown refrigerator catalog id: ${id}`);
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
    color: item.color,
    finishId: item.id,
    productId: item.id,
    variantId: item.id,
    applianceType: 'refrigerator',
    material: item.material,
    ...partial,
  };
}

export function createCatalogGasRange(
  id: GasRangeModelId,
  partial: Partial<EditorObject> = {},
): EditorObject {
  const item = gasRangeById(id);
  if (!item) throw new Error(`Unknown gas range catalog id: ${id}`);
  const finish = gasRangeFinishById(item.defaultFinishId);
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
    color: finish.color,
    finishId: finish.id,
    productId: item.id,
    variantId: item.id,
    applianceType: 'gas-range',
    fuelType: 'gas',
    burnerCount: item.burnerCount ?? 4,
    knobCount: item.knobCount ?? 4,
    hasCenterGriddle: item.hasCenterGriddle ?? false,
    griddleHandle: item.griddleHandle ?? false,
    griddleControlKnob: item.griddleControlKnob ?? false,
    ovenType: item.ovenType,
    ovenDoorCount: item.ovenDoorCount,
    dimensionsLocked: true,
    material: finish.material,
    ...partial,
  };
}
