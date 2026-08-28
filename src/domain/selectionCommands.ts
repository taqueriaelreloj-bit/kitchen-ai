import { duplicateObject, EditorObject, EditorProject, updateObject } from './editor';
import { createObjectDragOrigin, moveObjectByPlanDelta } from './objectMovement';

export type SelectionStatus = {
  id: string;
  name: string;
  kind: EditorObject['kind'];
  xIn: number;
  yIn: number;
  widthIn: number;
  depthIn: number;
  heightIn: number;
  rotation: number;
};

export type NudgeOptions = {
  /** Use the current 5-inch project snap while moving. Defaults to precise movement. */
  snap?: boolean;
};

export function selectedObject(project: EditorProject): EditorObject | undefined {
  return project.objects.find(object => object.id === project.selectedId);
}

export function selectedObjectStatus(project: EditorProject): SelectionStatus | undefined {
  const object = selectedObject(project);
  if (!object) return undefined;
  return {
    id: object.id,
    name: object.name,
    kind: object.kind,
    xIn: object.x,
    yIn: object.y,
    widthIn: object.widthIn,
    depthIn: object.depthIn,
    heightIn: object.heightIn,
    rotation: object.rotation,
  };
}

export function nudgeSelectedObject(
  project: EditorProject,
  deltaXIn: number,
  deltaYIn: number,
  options: NudgeOptions = {},
): EditorProject {
  if (!Number.isFinite(deltaXIn) || !Number.isFinite(deltaYIn)) return project;
  const object = selectedObject(project);
  if (!object) return project;
  const origin = createObjectDragOrigin(project, object.id);
  if (!origin) return project;

  // Keyboard/touch nudges are precise by default. Temporarily override the view snap
  // only for the movement calculation, then restore the user's view preference.
  const movementProject: EditorProject = {
    ...project,
    view2d: { ...project.view2d, snap: options.snap ?? false },
  };
  const moved = moveObjectByPlanDelta(movementProject, origin, deltaXIn, deltaYIn);
  return moved === movementProject ? project : { ...moved, view2d: project.view2d };
}

export function moveSelectedObjectTo(
  project: EditorProject,
  xIn: number,
  yIn: number,
  options: NudgeOptions = {},
): EditorProject {
  const object = selectedObject(project);
  if (!object || !Number.isFinite(xIn) || !Number.isFinite(yIn)) return project;
  return nudgeSelectedObject(project, xIn - object.x, yIn - object.y, options);
}

export function rotateSelectedObject(project: EditorProject, deltaDegrees = 90): EditorProject {
  const object = selectedObject(project);
  if (!object || !Number.isFinite(deltaDegrees)) return project;
  const rotation = ((object.rotation + deltaDegrees) % 360 + 360) % 360;
  return updateObject(project, object.id, { rotation });
}

export function duplicateSelectedObject(project: EditorProject): EditorProject {
  const object = selectedObject(project);
  return object ? duplicateObject(project, object.id) : project;
}
