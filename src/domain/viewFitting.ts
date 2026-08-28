import { Camera3DState, clampZoom, EditorObject, EditorProject, View2DState } from './editor';

export type ViewportSize = { width: number; height: number };
export type Bounds2D = { left: number; top: number; right: number; bottom: number; width: number; height: number; centerX: number; centerY: number };
export const PLAN_DISPLAY_SCALE = .45;

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const safeViewport = (viewport: ViewportSize) => ({ width: Math.max(120, finite(viewport.width, 800)), height: Math.max(120, finite(viewport.height, 600)) });

function rotatedBounds(x: number, y: number, width: number, height: number, rotation: number): Bounds2D {
  const radians = rotation * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const rotatedWidth = width * cosine + height * sine;
  const rotatedHeight = width * sine + height * cosine;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const left = centerX - rotatedWidth / 2;
  const top = centerY - rotatedHeight / 2;
  return { left, top, right: left + rotatedWidth, bottom: top + rotatedHeight, width: rotatedWidth, height: rotatedHeight, centerX, centerY };
}

export function objectDisplayBounds(object: EditorObject): Bounds2D {
  const width = Math.max(10, object.widthIn * PLAN_DISPLAY_SCALE);
  const depthMinimum = object.kind === 'wall' ? 4 : 8;
  const depth = Math.max(depthMinimum, object.depthIn * PLAN_DISPLAY_SCALE);
  return rotatedBounds(object.x, object.y, width, depth, object.rotation);
}

export function objectPlanBounds(object: EditorObject): Bounds2D {
  return rotatedBounds(object.x, object.y, Math.max(.1, object.widthIn), Math.max(.1, object.depthIn), object.rotation);
}

function unionBounds(items: Bounds2D[], fallback: Bounds2D): Bounds2D {
  if (!items.length) return fallback;
  const left = Math.min(...items.map(item => item.left));
  const top = Math.min(...items.map(item => item.top));
  const right = Math.max(...items.map(item => item.right));
  const bottom = Math.max(...items.map(item => item.bottom));
  return { left, top, right, bottom, width: Math.max(1, right - left), height: Math.max(1, bottom - top), centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

export function projectDisplayBounds(project: EditorProject): Bounds2D {
  return unionBounds(project.objects.map(objectDisplayBounds), { left: 0, top: 0, right: 900, bottom: 650, width: 900, height: 650, centerX: 450, centerY: 325 });
}

export function projectPlanBounds(project: EditorProject): Bounds2D {
  const roomWidth = Math.max(96, project.room.widthM * 39.3701);
  const roomLength = Math.max(96, project.room.lengthM * 39.3701);
  return unionBounds(project.objects.map(objectPlanBounds), { left: 120, top: 120, right: 120 + roomWidth, bottom: 120 + roomLength, width: roomWidth, height: roomLength, centerX: 120 + roomWidth / 2, centerY: 120 + roomLength / 2 });
}

export function fit2DView(project: EditorProject, viewportValue: ViewportSize, padding = 44): View2DState {
  const viewport = safeViewport(viewportValue);
  const bounds = projectDisplayBounds(project);
  const availableWidth = Math.max(40, viewport.width - padding * 2);
  const availableHeight = Math.max(40, viewport.height - padding * 2);
  const zoom = clampZoom(Math.min(availableWidth / bounds.width, availableHeight / bounds.height));
  return {
    ...project.view2d,
    zoom,
    pan: {
      x: viewport.width / 2 - bounds.centerX * zoom,
      y: viewport.height / 2 - bounds.centerY * zoom,
    },
  };
}

export function center2DView(project: EditorProject, viewportValue: ViewportSize): View2DState {
  const viewport = safeViewport(viewportValue);
  const bounds = projectDisplayBounds(project);
  return {
    ...project.view2d,
    pan: {
      x: viewport.width / 2 - bounds.centerX * project.view2d.zoom,
      y: viewport.height / 2 - bounds.centerY * project.view2d.zoom,
    },
  };
}

const clampDistance = (distance: number) => Math.min(1100, Math.max(180, distance));

export function fit3DCamera(project: EditorProject): Camera3DState {
  const bounds = projectPlanBounds(project);
  const maximumHeight = Math.max(36, ...project.objects.map(object => (object.elevationIn ?? 0) + object.heightIn));
  const span = Math.max(bounds.width, bounds.height);
  return {
    ...project.camera3d,
    target: { x: bounds.centerX, y: bounds.centerY },
    distance: clampDistance(span * 3.2 + maximumHeight * 1.8),
  };
}

export function center3DCamera(project: EditorProject): Camera3DState {
  const bounds = projectPlanBounds(project);
  return { ...project.camera3d, target: { x: bounds.centerX, y: bounds.centerY } };
}
