import { EditorObject } from './editor';

export type ApplianceModelId =
  | 'refrigerator-french-door-stainless'
  | 'refrigerator-panel-ready-built-in'
  | 'refrigerator-smart-black'
  | 'refrigerator-retro-blue';

export type ApplianceCatalogItem = {
  id: ApplianceModelId;
  category: 'refrigerator';
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
};

export const REFRIGERATOR_CATALOG: ApplianceCatalogItem[] = [
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

export function refrigeratorById(id?: string) {
  return REFRIGERATOR_CATALOG.find(item => item.id === id);
}

export function createCatalogRefrigerator(
  id: ApplianceModelId,
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
    material: item.material,
    ...partial,
  };
}
