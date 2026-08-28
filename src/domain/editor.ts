import { CABINET_FINISHES, HARDWARE_FINISHES, WALL_PAINTS } from './catalogs';
import { KitchenDesign, RoomModel } from './types';

export type ViewMode = '2d' | '3d';
export type BaseCabinetKind = 'base-cabinet' | 'sink-base' | 'drawer-base' | 'corner-cabinet';
export type WallCabinetKind = 'wall-cabinet' | 'glass-upper';
export type TallCabinetKind = 'tall-cabinet' | 'pantry-cabinet' | 'oven-cabinet' | 'refrigerator-cabinet';
export type ObjectKind = 'wall' | BaseCabinetKind | WallCabinetKind | TallCabinetKind | 'island' | 'door' | 'window' | 'appliance' | 'countertop' | 'hardware';
export type Vec2 = { x: number; y: number };
export type ToeKick = { enabled: boolean; heightIn: number; recessIn: number; color: string; finish: string };
export type CabinetHardware = { style: string; size: string; finishId: string; position: string };
export type EditorObject = {
  id: string;
  kind: ObjectKind;
  name: string;
  x: number;
  y: number;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  rotation: number;
  elevationIn?: number;
  color?: string;
  finishId?: string;
  wallPaintId?: string;
  material?: string;
  toeKick?: ToeKick;
  hardware?: CabinetHardware;
};
export type View2DState = { zoom: number; pan: Vec2; grid: boolean; snap: boolean; measurements: boolean };
export type Camera3DState = { distance: number; yaw: number; pitch: number; target: Vec2 };
export type CabinetScope = 'selected' | 'base' | 'wall' | 'island' | 'all';
export type CustomColorTarget = 'wall' | 'cabinet';
export type CustomColor = { id: string; name: string; hex: string; target: CustomColorTarget };
export type CatalogState = {
  favoriteWallPaintIds: string[];
  recentWallPaintIds: string[];
  favoriteCabinetFinishIds: string[];
  recentCabinetFinishIds: string[];
  customColors: CustomColor[];
  compareWallPaintIds: string[];
};
export type EditorProject = {
  version: 2;
  id: string;
  name: string;
  room: RoomModel;
  design: KitchenDesign;
  objects: EditorObject[];
  selectedId?: string;
  viewMode: ViewMode;
  view2d: View2DState;
  camera3d: Camera3DState;
  catalogState: CatalogState;
  updatedAt: string;
};

const BASE_KINDS: BaseCabinetKind[] = ['base-cabinet', 'sink-base', 'drawer-base', 'corner-cabinet'];
const WALL_KINDS: WallCabinetKind[] = ['wall-cabinet', 'glass-upper'];
const TALL_KINDS: TallCabinetKind[] = ['tall-cabinet', 'pantry-cabinet', 'oven-cabinet', 'refrigerator-cabinet'];
export const isBaseCabinetKind = (kind: ObjectKind): kind is BaseCabinetKind => BASE_KINDS.includes(kind as BaseCabinetKind);
export const isWallCabinetKind = (kind: ObjectKind): kind is WallCabinetKind => WALL_KINDS.includes(kind as WallCabinetKind);
export const isTallCabinetKind = (kind: ObjectKind): kind is TallCabinetKind => TALL_KINDS.includes(kind as TallCabinetKind);
export const isCabinetKind = (kind: ObjectKind) => isBaseCabinetKind(kind) || isWallCabinetKind(kind) || isTallCabinetKind(kind) || kind === 'island';
export const isBaseLikeKind = (kind: ObjectKind) => isBaseCabinetKind(kind) || isTallCabinetKind(kind) || kind === 'island';

const cabinetDefault = CABINET_FINISHES.find(x => x.name === 'Warm White') ?? CABINET_FINISHES[0];
const hardwareDefault = HARDWARE_FINISHES.find(x => x.name === 'Brushed Nickel') ?? HARDWARE_FINISHES[0];
const wallDefault = WALL_PAINTS.find(x => x.name === 'Pure White') ?? WALL_PAINTS[0];
export const DEFAULT_TOE_KICK: ToeKick = { enabled: true, heightIn: 4, recessIn: 3, color: cabinetDefault.baseColor, finish: cabinetDefault.finishType };
export const DEFAULT_HARDWARE: CabinetHardware = { style: 'Bar Pull', size: '5 inches', finishId: hardwareDefault.id, position: 'Center' };
export const DEFAULT_CATALOG_STATE: CatalogState = {
  favoriteWallPaintIds: [],
  recentWallPaintIds: [],
  favoriteCabinetFinishIds: [],
  recentCabinetFinishIds: [],
  customColors: [],
  compareWallPaintIds: [],
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const isCabinet = (object: EditorObject) => isCabinetKind(object.kind);
const isBaseLike = (object: EditorObject) => isBaseLikeKind(object.kind);
const copyCatalog = (value?: Partial<CatalogState>): CatalogState => ({
  favoriteWallPaintIds: [...(value?.favoriteWallPaintIds ?? [])],
  recentWallPaintIds: [...(value?.recentWallPaintIds ?? [])],
  favoriteCabinetFinishIds: [...(value?.favoriteCabinetFinishIds ?? [])],
  recentCabinetFinishIds: [...(value?.recentCabinetFinishIds ?? [])],
  customColors: [...(value?.customColors ?? [])],
  compareWallPaintIds: [...(value?.compareWallPaintIds ?? [])].slice(0, 2),
});
const recent = (ids: string[], id: string) => [id, ...ids.filter(value => value !== id)].slice(0, 8);
const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];

function matchesScope(object: EditorObject, scope: CabinetScope, selectedId?: string) {
  if (scope === 'selected') return object.id === selectedId && isCabinet(object);
  if (scope === 'base') return isBaseCabinetKind(object.kind) || isTallCabinetKind(object.kind);
  if (scope === 'wall') return isWallCabinetKind(object.kind);
  if (scope === 'island') return object.kind === 'island';
  return isCabinet(object);
}

function cabinetBase(base: EditorObject, name: string, extra: Partial<EditorObject> = {}) {
  Object.assign(base, { name, color: cabinetDefault.baseColor, finishId: cabinetDefault.id, toeKick: { ...DEFAULT_TOE_KICK }, hardware: { ...DEFAULT_HARDWARE }, ...extra });
}

export function objectDefaults(kind: ObjectKind, partial: Partial<EditorObject> = {}): EditorObject {
  const base: EditorObject = { id: uid(kind), kind, name: kind.replace(/-/g, ' '), x: 120, y: 120, widthIn: 36, depthIn: 24, heightIn: 34.5, rotation: 0 };
  if (kind === 'wall') Object.assign(base, { widthIn: 144, depthIn: 4.5, heightIn: 96, wallPaintId: wallDefault.id, color: wallDefault.approximateHex, material: 'Painted drywall' });
  if (kind === 'base-cabinet') cabinetBase(base, 'Base Cabinet');
  if (kind === 'sink-base') cabinetBase(base, 'Sink Base', { widthIn: 36 });
  if (kind === 'drawer-base') cabinetBase(base, 'Drawer Base', { widthIn: 30 });
  if (kind === 'corner-cabinet') cabinetBase(base, 'Corner Cabinet', { widthIn: 36, depthIn: 36 });
  if (kind === 'wall-cabinet') cabinetBase(base, 'Wall Cabinet', { depthIn: 12, heightIn: 30, elevationIn: 54, toeKick: undefined });
  if (kind === 'glass-upper') cabinetBase(base, 'Glass Upper', { depthIn: 12, heightIn: 30, elevationIn: 54, toeKick: undefined, material: 'Glass front' });
  if (kind === 'tall-cabinet') cabinetBase(base, 'Tall Cabinet', { widthIn: 24, depthIn: 24, heightIn: 84 });
  if (kind === 'pantry-cabinet') cabinetBase(base, 'Pantry Cabinet', { widthIn: 24, depthIn: 24, heightIn: 84 });
  if (kind === 'oven-cabinet') cabinetBase(base, 'Oven Cabinet', { widthIn: 30, depthIn: 24, heightIn: 84, material: 'Oven tower' });
  if (kind === 'refrigerator-cabinet') cabinetBase(base, 'Refrigerator Cabinet', { widthIn: 36, depthIn: 24, heightIn: 84, material: 'Refrigerator surround' });
  if (kind === 'island') cabinetBase(base, 'Island', { widthIn: 84, depthIn: 42, heightIn: 36 });
  if (kind === 'door') Object.assign(base, { widthIn: 36, depthIn: 4.5, heightIn: 80 });
  if (kind === 'window') Object.assign(base, { widthIn: 48, depthIn: 4.5, heightIn: 48, elevationIn: 36 });
  if (kind === 'appliance') Object.assign(base, { widthIn: 36, depthIn: 30, heightIn: 70, color: '#9FA7A8', material: 'Stainless Steel' });
  if (kind === 'countertop') Object.assign(base, { widthIn: 72, depthIn: 25.5, heightIn: 1.5, color: '#EAE6DC', material: 'Quartz' });
  return { ...base, ...partial };
}

export function createEditorProject(room: RoomModel, design: KitchenDesign, name = 'Kitchen Project'): EditorProject {
  const wallW = Math.max(96, room.widthM * 39.3701);
  const wallL = Math.max(96, room.lengthM * 39.3701);
  const cabinetColor = ({ cream: '#E9DFC9', white: '#F9F9F6', navy: '#334B62', wood: '#A66D43' } as const)[design.cabinetColor];
  const objects: EditorObject[] = [
    objectDefaults('wall', { id: 'wall-north', name: 'North Wall', x: 120, y: 80, widthIn: wallW }),
    objectDefaults('wall', { id: 'wall-west', name: 'West Wall', x: 80, y: 120, widthIn: wallL, rotation: 90 }),
    objectDefaults('base-cabinet', { id: 'base-1', name: 'Base Cabinet', x: 150, y: 120, color: cabinetColor, toeKick: { ...DEFAULT_TOE_KICK, color: cabinetColor } }),
    objectDefaults('wall-cabinet', { id: 'upper-1', name: 'Wall Cabinet', x: 150, y: 82, color: cabinetColor }),
  ];
  if (design.includesIsland) objects.push(objectDefaults('island', { id: 'island-1', name: 'Island', x: 260, y: 235, color: cabinetColor, toeKick: { ...DEFAULT_TOE_KICK, color: cabinetColor } }));
  return {
    version: 2,
    id: room.id,
    name,
    room,
    design,
    objects,
    viewMode: '2d',
    view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true },
    camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 } },
    catalogState: copyCatalog(DEFAULT_CATALOG_STATE),
    updatedAt: now(),
  };
}

export function migrateProject(raw: unknown): EditorProject | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Partial<EditorProject> & { room?: RoomModel; design?: KitchenDesign };
  if (!value.room || !value.design) return undefined;
  if (value.version !== 2 || !Array.isArray(value.objects)) return createEditorProject(value.room, value.design);
  const objects = value.objects.map(object => {
    const fresh = objectDefaults(object.kind ?? 'base-cabinet', object);
    if (isBaseLikeKind(fresh.kind)) fresh.toeKick = { ...DEFAULT_TOE_KICK, ...(object.toeKick ?? {}), color: object.toeKick?.color ?? object.color ?? DEFAULT_TOE_KICK.color };
    if (isCabinetKind(fresh.kind)) fresh.hardware = { ...DEFAULT_HARDWARE, ...(object.hardware ?? {}) };
    if (isWallCabinetKind(fresh.kind)) fresh.toeKick = undefined;
    if (fresh.kind === 'wall' && !fresh.wallPaintId) fresh.wallPaintId = wallDefault.id;
    return fresh;
  });
  return {
    version: 2,
    id: value.id ?? value.room.id,
    name: value.name ?? 'Kitchen Project',
    room: value.room,
    design: value.design,
    objects,
    selectedId: value.selectedId,
    viewMode: value.viewMode ?? '2d',
    view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true, ...(value.view2d ?? {}) },
    camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 }, ...(value.camera3d ?? {}) },
    catalogState: copyCatalog(value.catalogState),
    updatedAt: value.updatedAt ?? now(),
  };
}

export const clampZoom = (zoom: number) => Math.min(2, Math.max(0.25, Math.round(zoom * 100) / 100));
export function updateObject(project: EditorProject, id: string, patch: Partial<EditorObject>): EditorProject { return { ...project, objects: project.objects.map(object => object.id === id ? { ...object, ...patch } : object), updatedAt: now() }; }
export function duplicateObject(project: EditorProject, id: string): EditorProject { const source = project.objects.find(object => object.id === id); if (!source) return project; const copy: EditorObject = { ...source, id: uid(source.kind), name: `${source.name} Copy`, x: source.x + 18, y: source.y + 18, toeKick: source.toeKick ? { ...source.toeKick } : undefined, hardware: source.hardware ? { ...source.hardware } : undefined }; return { ...project, objects: [...project.objects, copy], selectedId: copy.id, updatedAt: now() }; }
export function deleteObject(project: EditorProject, id: string): EditorProject { return { ...project, objects: project.objects.filter(object => object.id !== id), selectedId: project.selectedId === id ? undefined : project.selectedId, updatedAt: now() }; }

export function applyWallPaint(project: EditorProject, paintId: string, allWalls = false): EditorProject {
  const paint = WALL_PAINTS.find(item => item.id === paintId);
  if (!paint) return project;
  const state = copyCatalog(project.catalogState);
  state.recentWallPaintIds = recent(state.recentWallPaintIds, paint.id);
  return { ...project, objects: project.objects.map(object => object.kind === 'wall' && (allWalls || object.id === project.selectedId) ? { ...object, wallPaintId: paint.id, color: paint.approximateHex } : object), catalogState: state, updatedAt: now() };
}

export function applyCabinetFinish(project: EditorProject, finishId: string, scope: CabinetScope): EditorProject {
  const finish = CABINET_FINISHES.find(item => item.id === finishId);
  if (!finish) return project;
  const state = copyCatalog(project.catalogState);
  state.recentCabinetFinishIds = recent(state.recentCabinetFinishIds, finish.id);
  return { ...project, objects: project.objects.map(object => {
    if (!matchesScope(object, scope, project.selectedId)) return object;
    return { ...object, finishId: finish.id, color: finish.baseColor, toeKick: object.toeKick ? { ...object.toeKick, color: finish.baseColor, finish: finish.finishType } : object.toeKick };
  }), catalogState: state, updatedAt: now() };
}

export function applyHardware(project: EditorProject, patch: Partial<CabinetHardware>, scope: CabinetScope): EditorProject { return { ...project, objects: project.objects.map(object => matchesScope(object, scope, project.selectedId) ? { ...object, hardware: { ...(object.hardware ?? DEFAULT_HARDWARE), ...patch } } : object), updatedAt: now() }; }
export function removeHardware(project: EditorProject, scope: CabinetScope): EditorProject { return applyHardware(project, { style: 'No Hardware' }, scope); }
export function applyToeKick(project: EditorProject, patch: Partial<ToeKick>, allBaseCabinets = false): EditorProject { return { ...project, objects: project.objects.map(object => { const target = isBaseLike(object) && (allBaseCabinets || object.id === project.selectedId); return target ? { ...object, toeKick: { ...(object.toeKick ?? DEFAULT_TOE_KICK), ...patch } } : object; }), updatedAt: now() }; }

export function toggleWallPaintFavorite(project: EditorProject, paintId: string): EditorProject {
  if (!WALL_PAINTS.some(item => item.id === paintId)) return project;
  const state = copyCatalog(project.catalogState);
  state.favoriteWallPaintIds = toggle(state.favoriteWallPaintIds, paintId);
  return { ...project, catalogState: state, updatedAt: now() };
}

export function toggleCabinetFinishFavorite(project: EditorProject, finishId: string): EditorProject {
  if (!CABINET_FINISHES.some(item => item.id === finishId)) return project;
  const state = copyCatalog(project.catalogState);
  state.favoriteCabinetFinishIds = toggle(state.favoriteCabinetFinishIds, finishId);
  return { ...project, catalogState: state, updatedAt: now() };
}

export function toggleCompareWallPaint(project: EditorProject, paintId: string): EditorProject {
  if (!WALL_PAINTS.some(item => item.id === paintId)) return project;
  const state = copyCatalog(project.catalogState);
  if (state.compareWallPaintIds.includes(paintId)) state.compareWallPaintIds = state.compareWallPaintIds.filter(id => id !== paintId);
  else state.compareWallPaintIds = [...state.compareWallPaintIds, paintId].slice(-2);
  return { ...project, catalogState: state, updatedAt: now() };
}

function normalizeHex(value: string) {
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return '#FFFFFF';
}

export function saveCustomColor(project: EditorProject, hex: string, target: CustomColorTarget, name = 'Custom Color'): EditorProject {
  const normalized = normalizeHex(hex);
  const id = `custom-${target}-${normalized.slice(1).toLowerCase()}`;
  const custom: CustomColor = { id, name, hex: normalized, target };
  const state = copyCatalog(project.catalogState);
  state.customColors = [custom, ...state.customColors.filter(item => item.id !== id)].slice(0, 24);
  return { ...project, catalogState: state, updatedAt: now() };
}

export function applyCustomWallColor(project: EditorProject, customColorId: string, allWalls = false): EditorProject {
  const custom = project.catalogState.customColors.find(item => item.id === customColorId && item.target === 'wall');
  if (!custom) return project;
  return { ...project, objects: project.objects.map(object => object.kind === 'wall' && (allWalls || object.id === project.selectedId) ? { ...object, wallPaintId: custom.id, color: custom.hex } : object), updatedAt: now() };
}

export function applyCustomCabinetColor(project: EditorProject, customColorId: string, scope: CabinetScope): EditorProject {
  const custom = project.catalogState.customColors.find(item => item.id === customColorId && item.target === 'cabinet');
  if (!custom) return project;
  return { ...project, objects: project.objects.map(object => matchesScope(object, scope, project.selectedId) ? { ...object, finishId: custom.id, color: custom.hex, toeKick: object.toeKick ? { ...object.toeKick, color: custom.hex } : object.toeKick } : object), updatedAt: now() };
}

export function reset2DView(project: EditorProject): EditorProject { return { ...project, view2d: { ...project.view2d, zoom: 1, pan: { x: 0, y: 0 } } }; }
export function reset3DView(project: EditorProject): EditorProject { return { ...project, camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 } } }; }
