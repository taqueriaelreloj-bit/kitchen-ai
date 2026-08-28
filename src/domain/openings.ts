import { EditorObject, EditorProject, ObjectKind, objectDefaults, updateObject } from './editor';

export type SwingDirection = 'Left In' | 'Right In' | 'Left Out' | 'Right Out';
export type OpeningAttachment = {
  parentWallId?: string;
  wallOffsetIn?: number;
  sillHeightIn?: number;
  swingDirection?: SwingDirection;
};
export type AttachedOpening = EditorObject & OpeningAttachment;

export const isOpening = (object: EditorObject) => object.kind === 'door' || object.kind === 'window';
export const openingData = (object: EditorObject): OpeningAttachment => object as AttachedOpening;

function clampOffset(wall: EditorObject, opening: EditorObject, offsetIn: number) {
  const max = Math.max(0, wall.widthIn - opening.widthIn);
  return Math.min(max, Math.max(0, Math.round(offsetIn * 10) / 10));
}

export function openingWorldPosition(wall: EditorObject, opening: EditorObject, offsetIn: number) {
  const offset = clampOffset(wall, opening, offsetIn);
  const radians = wall.rotation * Math.PI / 180;
  return {
    x: wall.x + Math.cos(radians) * offset,
    y: wall.y + Math.sin(radians) * offset,
    rotation: wall.rotation,
    depthIn: wall.depthIn,
    wallOffsetIn: offset,
  };
}

export function attachOpening(project: EditorProject, openingId: string, wallId: string, offsetIn?: number): EditorProject {
  const opening = project.objects.find(object => object.id === openingId && isOpening(object));
  const wall = project.objects.find(object => object.id === wallId && object.kind === 'wall');
  if (!opening || !wall) return project;
  const current = openingData(opening);
  const offset = offsetIn ?? current.wallOffsetIn ?? Math.min(24, Math.max(0, wall.widthIn - opening.widthIn));
  const position = openingWorldPosition(wall, opening, offset);
  return updateObject(project, opening.id, {
    ...position,
    parentWallId: wall.id,
    sillHeightIn: opening.kind === 'window' ? current.sillHeightIn ?? opening.elevationIn ?? 36 : 0,
    elevationIn: opening.kind === 'window' ? current.sillHeightIn ?? opening.elevationIn ?? 36 : 0,
    swingDirection: opening.kind === 'door' ? current.swingDirection ?? 'Left In' : undefined,
  } as Partial<EditorObject>);
}

export function addOpening(project: EditorProject, kind: Extract<ObjectKind, 'door' | 'window'>, wallId?: string): EditorProject {
  const selectedWall = project.objects.find(object => object.id === (wallId ?? project.selectedId) && object.kind === 'wall');
  const wall = selectedWall ?? project.objects.find(object => object.kind === 'wall');
  const opening = objectDefaults(kind, {
    name: kind === 'door' ? 'Door' : 'Window',
    sillHeightIn: kind === 'window' ? 36 : 0,
    elevationIn: kind === 'window' ? 36 : 0,
    swingDirection: kind === 'door' ? 'Left In' : undefined,
  } as Partial<EditorObject>);
  let next: EditorProject = { ...project, objects: [...project.objects, opening], selectedId: opening.id, updatedAt: new Date().toISOString() };
  if (wall) next = attachOpening(next, opening.id, wall.id, Math.min(24, Math.max(0, wall.widthIn - opening.widthIn)));
  return { ...next, selectedId: opening.id };
}

export function moveOpeningAlongWall(project: EditorProject, openingId: string, offsetIn: number): EditorProject {
  const opening = project.objects.find(object => object.id === openingId && isOpening(object));
  if (!opening) return project;
  const parentWallId = openingData(opening).parentWallId;
  if (!parentWallId) return project;
  return attachOpening(project, opening.id, parentWallId, offsetIn);
}

export function setWindowSillHeight(project: EditorProject, openingId: string, sillHeightIn: number): EditorProject {
  const opening = project.objects.find(object => object.id === openingId && object.kind === 'window');
  if (!opening) return project;
  const sill = Math.max(0, Math.min(96, Math.round(sillHeightIn * 10) / 10));
  return updateObject(project, opening.id, { sillHeightIn: sill, elevationIn: sill } as Partial<EditorObject>);
}

export function setDoorSwing(project: EditorProject, openingId: string, swingDirection: SwingDirection): EditorProject {
  const opening = project.objects.find(object => object.id === openingId && object.kind === 'door');
  return opening ? updateObject(project, opening.id, { swingDirection } as Partial<EditorObject>) : project;
}

export function openingsForWall(objects: EditorObject[], wallId: string): AttachedOpening[] {
  return objects.filter(object => isOpening(object) && openingData(object).parentWallId === wallId) as AttachedOpening[];
}
