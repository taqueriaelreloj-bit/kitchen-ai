import { EditorProject, updateObject } from './editor';
import { moveOpeningAlongWall, openingData } from './openings';

export const OBJECT_SNAP_IN = 5;
export type ObjectDragOrigin = {
  id: string;
  x: number;
  y: number;
  wallOffsetIn: number;
};

export function createObjectDragOrigin(project: EditorProject, id: string): ObjectDragOrigin | undefined {
  const object = project.objects.find(item => item.id === id);
  if (!object) return undefined;
  return {
    id,
    x: object.x,
    y: object.y,
    wallOffsetIn: openingData(object).wallOffsetIn ?? 0,
  };
}

export function moveObjectByPlanDelta(project: EditorProject, origin: ObjectDragOrigin, dx: number, dy: number): EditorProject {
  const object = project.objects.find(item => item.id === origin.id);
  if (!object) return project;
  const data = openingData(object);
  const parent = data.parentWallId ? project.objects.find(item => item.id === data.parentWallId && item.kind === 'wall') : undefined;
  if (parent && (object.kind === 'door' || object.kind === 'window')) {
    const radians = parent.rotation * Math.PI / 180;
    const along = dx * Math.cos(radians) + dy * Math.sin(radians);
    return moveOpeningAlongWall(project, object.id, origin.wallOffsetIn + along);
  }
  const snap = (value: number) => project.view2d.snap ? Math.round(value / OBJECT_SNAP_IN) * OBJECT_SNAP_IN : value;
  return updateObject(project, object.id, { x: snap(origin.x + dx), y: snap(origin.y + dy) });
}
