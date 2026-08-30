import {
  APPLIANCE_CATALOG,
  ApplianceModelId,
  GasRangeModelId,
  RefrigeratorModelId,
  createCatalogGasRange,
  createCatalogRefrigerator,
} from './applianceCatalog';
import {
  MICROWAVE_CATALOG,
  MicrowaveModelId,
  createCatalogMicrowave,
} from './microwaveCatalog';
import { EditorObject, EditorProject, ObjectKind, objectDefaults } from './editor';
import { OBJECT_SNAP_IN } from './objectMovement';
import { PLAN_DISPLAY_SCALE, projectPlanBounds } from './viewFitting';

export const KITCHEN_CATALOG_DRAG_MIME = 'application/x-kitchen-ai-catalog-item';

export type DragCatalogCategoryId = 'lowers' | 'uppers' | 'tall' | 'refrigerators' | 'gas-ranges' | 'microwaves';
export type DragCatalogItemKind = 'cabinet' | 'appliance';
export type DragApplianceModelId = ApplianceModelId | MicrowaveModelId;

export type DragCatalogItem = {
  id: string;
  categoryId: DragCatalogCategoryId;
  kind: DragCatalogItemKind;
  objectKind: ObjectKind;
  name: string;
  shortName: string;
  description: string;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  previewColor: string;
  applianceModelId?: DragApplianceModelId;
};

export type DragCatalogCategory = {
  id: DragCatalogCategoryId;
  label: string;
  helper: string;
  icon: string;
  items: DragCatalogItem[];
};

const cabinetItem = (
  id: string,
  categoryId: Extract<DragCatalogCategoryId, 'lowers' | 'uppers' | 'tall'>,
  objectKind: ObjectKind,
  name: string,
  shortName: string,
  widthIn: number,
  heightIn: number,
  depthIn: number,
  description: string,
): DragCatalogItem => ({
  id,
  categoryId,
  kind: 'cabinet',
  objectKind,
  name,
  shortName,
  description,
  widthIn,
  heightIn,
  depthIn,
  previewColor: categoryId === 'uppers' ? '#EAE6DA' : '#D8D2C4',
});

const LOWER_ITEMS: DragCatalogItem[] = [
  cabinetItem('lower-base-12', 'lowers', 'base-cabinet', '12 in Base Cabinet', 'Base 12', 12, 34.5, 24, 'Single-door lower cabinet'),
  cabinetItem('lower-base-18', 'lowers', 'base-cabinet', '18 in Base Cabinet', 'Base 18', 18, 34.5, 24, 'Single-door lower cabinet'),
  cabinetItem('lower-base-24', 'lowers', 'base-cabinet', '24 in Base Cabinet', 'Base 24', 24, 34.5, 24, 'Standard two-door base'),
  cabinetItem('lower-base-30', 'lowers', 'base-cabinet', '30 in Base Cabinet', 'Base 30', 30, 34.5, 24, 'Wide two-door base'),
  cabinetItem('lower-base-36', 'lowers', 'base-cabinet', '36 in Base Cabinet', 'Base 36', 36, 34.5, 24, 'Extra-wide two-door base'),
  cabinetItem('lower-drawer-18', 'lowers', 'drawer-base', '18 in Drawer Base', 'Drawers 18', 18, 34.5, 24, 'Three-drawer lower cabinet'),
  cabinetItem('lower-drawer-24', 'lowers', 'drawer-base', '24 in Drawer Base', 'Drawers 24', 24, 34.5, 24, 'Three-drawer lower cabinet'),
  cabinetItem('lower-drawer-30', 'lowers', 'drawer-base', '30 in Drawer Base', 'Drawers 30', 30, 34.5, 24, 'Wide drawer storage'),
  cabinetItem('lower-drawer-36', 'lowers', 'drawer-base', '36 in Drawer Base', 'Drawers 36', 36, 34.5, 24, 'Extra-wide drawer storage'),
  cabinetItem('lower-sink-30', 'lowers', 'sink-base', '30 in Sink Base', 'Sink 30', 30, 34.5, 24, 'Sink cabinet without top drawers'),
  cabinetItem('lower-sink-33', 'lowers', 'sink-base', '33 in Sink Base', 'Sink 33', 33, 34.5, 24, 'Sink cabinet without top drawers'),
  cabinetItem('lower-sink-36', 'lowers', 'sink-base', '36 in Sink Base', 'Sink 36', 36, 34.5, 24, 'Standard wide sink cabinet'),
  cabinetItem('lower-corner-36', 'lowers', 'corner-cabinet', '36 in Corner Base', 'Corner 36', 36, 34.5, 36, 'Corner cabinet footprint'),
];

const UPPER_ITEMS: DragCatalogItem[] = [
  cabinetItem('upper-wall-12x30', 'uppers', 'wall-cabinet', '12 in Wall Cabinet', 'Upper 12', 12, 30, 12, '30 in high upper cabinet'),
  cabinetItem('upper-wall-18x30', 'uppers', 'wall-cabinet', '18 in Wall Cabinet', 'Upper 18', 18, 30, 12, '30 in high upper cabinet'),
  cabinetItem('upper-wall-24x30', 'uppers', 'wall-cabinet', '24 in Wall Cabinet', 'Upper 24', 24, 30, 12, '30 in high upper cabinet'),
  cabinetItem('upper-wall-30x30', 'uppers', 'wall-cabinet', '30 in Wall Cabinet', 'Upper 30', 30, 30, 12, '30 in high double-door upper'),
  cabinetItem('upper-wall-36x30', 'uppers', 'wall-cabinet', '36 in Wall Cabinet', 'Upper 36', 36, 30, 12, '30 in high double-door upper'),
  cabinetItem('upper-wall-24x36', 'uppers', 'wall-cabinet', '24 × 36 in Wall Cabinet', 'Upper 24 × 36', 24, 36, 12, 'Tall upper cabinet'),
  cabinetItem('upper-wall-30x36', 'uppers', 'wall-cabinet', '30 × 36 in Wall Cabinet', 'Upper 30 × 36', 30, 36, 12, 'Tall double-door upper'),
  cabinetItem('upper-wall-36x36', 'uppers', 'wall-cabinet', '36 × 36 in Wall Cabinet', 'Upper 36 × 36', 36, 36, 12, 'Tall double-door upper'),
  cabinetItem('upper-glass-24x30', 'uppers', 'glass-upper', '24 in Glass Upper', 'Glass 24', 24, 30, 12, 'Decorative glass-front upper'),
  cabinetItem('upper-glass-30x30', 'uppers', 'glass-upper', '30 in Glass Upper', 'Glass 30', 30, 30, 12, 'Decorative glass-front upper'),
  cabinetItem('upper-glass-36x30', 'uppers', 'glass-upper', '36 in Glass Upper', 'Glass 36', 36, 30, 12, 'Wide glass-front upper'),
];

const TALL_ITEMS: DragCatalogItem[] = [
  cabinetItem('tall-pantry-18x84', 'tall', 'pantry-cabinet', '18 in Pantry Cabinet', 'Pantry 18', 18, 84, 24, 'Full-height pantry storage'),
  cabinetItem('tall-pantry-24x84', 'tall', 'pantry-cabinet', '24 in Pantry Cabinet', 'Pantry 24', 24, 84, 24, 'Full-height pantry storage'),
  cabinetItem('tall-pantry-30x84', 'tall', 'pantry-cabinet', '30 in Pantry Cabinet', 'Pantry 30', 30, 84, 24, 'Wide full-height pantry'),
  cabinetItem('tall-utility-24x84', 'tall', 'tall-cabinet', '24 in Utility Cabinet', 'Utility 24', 24, 84, 24, 'Full-height utility storage'),
  cabinetItem('tall-oven-30x84', 'tall', 'oven-cabinet', '30 in Oven Cabinet', 'Oven Tower 30', 30, 84, 24, 'Built-in oven tower'),
  cabinetItem('tall-fridge-surround-36x84', 'tall', 'refrigerator-cabinet', '36 in Refrigerator Cabinet', 'Fridge Surround', 36, 84, 24, 'Full-height refrigerator surround'),
];

const APPLIANCE_ITEMS: DragCatalogItem[] = [...APPLIANCE_CATALOG, ...MICROWAVE_CATALOG].map(item => ({
  id: item.id,
  categoryId: item.category === 'refrigerator'
    ? 'refrigerators'
    : item.category === 'microwave'
      ? 'microwaves'
      : 'gas-ranges',
  kind: 'appliance',
  objectKind: 'appliance',
  name: item.name,
  shortName: item.shortName,
  description: item.features.slice(0, 2).join(' · '),
  widthIn: item.widthIn,
  heightIn: item.heightIn,
  depthIn: item.depthIn,
  previewColor: item.color,
  applianceModelId: item.id,
}));

export const DRAG_CATALOG_ITEMS: DragCatalogItem[] = [
  ...LOWER_ITEMS,
  ...UPPER_ITEMS,
  ...TALL_ITEMS,
  ...APPLIANCE_ITEMS,
];

const itemsFor = (categoryId: DragCatalogCategoryId) => DRAG_CATALOG_ITEMS.filter(item => item.categoryId === categoryId);

export const DRAG_CATALOG_CATEGORIES: DragCatalogCategory[] = [
  { id: 'lowers', label: 'Lowers', helper: 'Base, drawer, sink and corner cabinets', icon: '▤', items: itemsFor('lowers') },
  { id: 'uppers', label: 'Uppers', helper: 'Wall and glass-front cabinets', icon: '▥', items: itemsFor('uppers') },
  { id: 'tall', label: 'Tall', helper: 'Pantry, utility and appliance towers', icon: '▯', items: itemsFor('tall') },
  { id: 'refrigerators', label: 'Refrigerators', helper: 'Professional refrigerator models', icon: '▧', items: itemsFor('refrigerators') },
  { id: 'gas-ranges', label: 'Gas Ranges', helper: 'Professional gas range models', icon: '▦', items: itemsFor('gas-ranges') },
  { id: 'microwaves', label: 'Microwaves', helper: 'Countertop and over-the-range models', icon: '▭', items: itemsFor('microwaves') },
];

export function dragCatalogItemById(id?: string) {
  return DRAG_CATALOG_ITEMS.find(item => item.id === id);
}

export function createDragCatalogObject(itemId: string, partial: Partial<EditorObject> = {}): EditorObject | undefined {
  const item = dragCatalogItemById(itemId);
  if (!item) return undefined;
  if (item.kind === 'appliance') {
    let object: EditorObject;
    if (item.categoryId === 'refrigerators') {
      object = createCatalogRefrigerator(item.applianceModelId as RefrigeratorModelId);
    } else if (item.categoryId === 'microwaves') {
      object = createCatalogMicrowave(item.applianceModelId as MicrowaveModelId);
    } else {
      object = createCatalogGasRange(item.applianceModelId as GasRangeModelId);
    }
    return { ...object, ...partial };
  }
  return objectDefaults(item.objectKind, {
    name: item.name,
    widthIn: item.widthIn,
    heightIn: item.heightIn,
    depthIn: item.depthIn,
    productId: item.id,
    variantId: item.id,
    ...partial,
  });
}

export function serializeDragCatalogItem(itemId: string): string {
  return JSON.stringify({ source: 'kitchen-ai', version: 1, itemId });
}

export function parseDragCatalogItem(serialized?: string): DragCatalogItem | undefined {
  if (!serialized) return undefined;
  try {
    const value = JSON.parse(serialized) as { source?: unknown; version?: unknown; itemId?: unknown };
    if (value.source !== 'kitchen-ai' || value.version !== 1 || typeof value.itemId !== 'string') return undefined;
    return dragCatalogItemById(value.itemId);
  } catch {
    return undefined;
  }
}

const snapCoordinate = (value: number, enabled: boolean) => enabled
  ? Math.round(value / OBJECT_SNAP_IN) * OBJECT_SNAP_IN
  : Math.round(value * 100) / 100;

export function addDragCatalogItemAtPlanPoint(
  project: EditorProject,
  itemId: string,
  point: { x: number; y: number },
): EditorProject {
  const object = createDragCatalogObject(itemId);
  if (!object) return project;
  const placed: EditorObject = {
    ...object,
    x: snapCoordinate(point.x - object.widthIn / 2, project.view2d.snap),
    y: snapCoordinate(point.y - object.depthIn / 2, project.view2d.snap),
  };
  return {
    ...project,
    objects: [...project.objects, placed],
    selectedId: placed.id,
    updatedAt: new Date().toISOString(),
  };
}

export function addDragCatalogItemNearCenter(project: EditorProject, itemId: string): EditorProject {
  const bounds = projectPlanBounds(project);
  const stagger = (project.objects.length % 5) * 8;
  return addDragCatalogItemAtPlanPoint(project, itemId, {
    x: bounds.centerX + stagger,
    y: bounds.centerY + stagger,
  });
}

export function workspaceClientPointToPlan(
  project: EditorProject,
  clientPoint: { x: number; y: number },
  workspaceOrigin: { x: number; y: number },
) {
  const zoom = Math.max(.01, project.view2d.zoom);
  const displayScale = zoom * PLAN_DISPLAY_SCALE;
  return {
    x: (clientPoint.x - workspaceOrigin.x - project.view2d.pan.x) / displayScale,
    y: (clientPoint.y - workspaceOrigin.y - project.view2d.pan.y) / displayScale,
  };
}
