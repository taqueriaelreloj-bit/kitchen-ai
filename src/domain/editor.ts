import { CABINET_FINISHES, HARDWARE_FINISHES, WALL_PAINTS } from './catalogs';
import { KitchenDesign, RoomModel } from './types';

export type ViewMode = '2d' | '3d';
export type ObjectKind = 'wall' | 'base-cabinet' | 'wall-cabinet' | 'island' | 'door' | 'window' | 'appliance' | 'countertop' | 'hardware';
export type Vec2 = { x: number; y: number };
export type ToeKick = { enabled: boolean; heightIn: number; recessIn: number; color: string; finish: string };
export type CabinetHardware = { style: string; size: string; finishId: string; position: string };
export type EditorObject = {
  id: string; kind: ObjectKind; name: string; x: number; y: number; widthIn: number; depthIn: number; heightIn: number; rotation: number;
  elevationIn?: number; color?: string; finishId?: string; wallPaintId?: string; material?: string; toeKick?: ToeKick; hardware?: CabinetHardware;
};
export type View2DState = { zoom: number; pan: Vec2; grid: boolean; snap: boolean; measurements: boolean };
export type Camera3DState = { distance: number; yaw: number; pitch: number; target: Vec2 };
export type EditorProject = {
  version: 2; id: string; name: string; room: RoomModel; design: KitchenDesign; objects: EditorObject[]; selectedId?: string;
  viewMode: ViewMode; view2d: View2DState; camera3d: Camera3DState; updatedAt: string;
};

const cabinetDefault = CABINET_FINISHES.find(x => x.name === 'Warm White') ?? CABINET_FINISHES[0];
const hardwareDefault = HARDWARE_FINISHES.find(x => x.name === 'Brushed Nickel') ?? HARDWARE_FINISHES[0];
const wallDefault = WALL_PAINTS.find(x => x.name === 'Pure White') ?? WALL_PAINTS[0];
export const DEFAULT_TOE_KICK: ToeKick = { enabled: true, heightIn: 4, recessIn: 3, color: cabinetDefault.baseColor, finish: cabinetDefault.finishType };
export const DEFAULT_HARDWARE: CabinetHardware = { style: 'Bar Pull', size: '5 inches', finishId: hardwareDefault.id, position: 'Center' };

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export function objectDefaults(kind: ObjectKind, partial: Partial<EditorObject> = {}): EditorObject {
  const base: EditorObject = { id: uid(kind), kind, name: kind.replace(/-/g, ' '), x: 120, y: 120, widthIn: 36, depthIn: 24, heightIn: 34.5, rotation: 0 };
  if (kind === 'wall') Object.assign(base, { widthIn: 144, depthIn: 4.5, heightIn: 96, wallPaintId: wallDefault.id, color: wallDefault.approximateHex, material: 'Painted drywall' });
  if (kind === 'base-cabinet') Object.assign(base, { color: cabinetDefault.baseColor, finishId: cabinetDefault.id, toeKick: { ...DEFAULT_TOE_KICK }, hardware: { ...DEFAULT_HARDWARE } });
  if (kind === 'wall-cabinet') Object.assign(base, { depthIn: 12, heightIn: 30, elevationIn: 54, color: cabinetDefault.baseColor, finishId: cabinetDefault.id, hardware: { ...DEFAULT_HARDWARE } });
  if (kind === 'island') Object.assign(base, { widthIn: 84, depthIn: 42, heightIn: 36, color: cabinetDefault.baseColor, finishId: cabinetDefault.id, toeKick: { ...DEFAULT_TOE_KICK }, hardware: { ...DEFAULT_HARDWARE } });
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
  return { version: 2, id: room.id, name, room, design, objects, viewMode: '2d', view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true }, camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 } }, updatedAt: new Date().toISOString() };
}

export function migrateProject(raw: unknown): EditorProject | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Partial<EditorProject> & { room?: RoomModel; design?: KitchenDesign };
  if (!value.room || !value.design) return undefined;
  if (value.version !== 2 || !Array.isArray(value.objects)) return createEditorProject(value.room, value.design);
  const objects = value.objects.map((o) => {
    const fresh = objectDefaults(o.kind ?? 'base-cabinet', o);
    if (fresh.kind === 'base-cabinet' || fresh.kind === 'island') fresh.toeKick = { ...DEFAULT_TOE_KICK, ...(o.toeKick ?? {}), color: o.toeKick?.color ?? o.color ?? DEFAULT_TOE_KICK.color };
    if (fresh.kind.includes('cabinet') || fresh.kind === 'island') fresh.hardware = { ...DEFAULT_HARDWARE, ...(o.hardware ?? {}) };
    if (fresh.kind === 'wall' && !fresh.wallPaintId) fresh.wallPaintId = wallDefault.id;
    return fresh;
  });
  return {
    version: 2, id: value.id ?? value.room.id, name: value.name ?? 'Kitchen Project', room: value.room, design: value.design, objects,
    selectedId: value.selectedId, viewMode: value.viewMode ?? '2d', view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true, ...(value.view2d ?? {}) },
    camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 }, ...(value.camera3d ?? {}) }, updatedAt: value.updatedAt ?? new Date().toISOString(),
  };
}

export const clampZoom = (zoom: number) => Math.min(2, Math.max(.25, Math.round(zoom * 100) / 100));
export function updateObject(project: EditorProject, id: string, patch: Partial<EditorObject>): EditorProject { return { ...project, objects: project.objects.map(o => o.id === id ? { ...o, ...patch } : o), updatedAt: new Date().toISOString() }; }
export function duplicateObject(project: EditorProject, id: string): EditorProject { const source = project.objects.find(o => o.id === id); if (!source) return project; const copy: EditorObject = { ...source, id: uid(source.kind), name: `${source.name} Copy`, x: source.x + 18, y: source.y + 18, toeKick: source.toeKick ? { ...source.toeKick } : undefined, hardware: source.hardware ? { ...source.hardware } : undefined }; return { ...project, objects: [...project.objects, copy], selectedId: copy.id, updatedAt: new Date().toISOString() }; }
export function deleteObject(project: EditorProject, id: string): EditorProject { return { ...project, objects: project.objects.filter(o => o.id !== id), selectedId: project.selectedId === id ? undefined : project.selectedId, updatedAt: new Date().toISOString() }; }
