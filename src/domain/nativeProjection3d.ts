import { Camera3DState, Vec2 } from './editor';
import { Box3D } from './geometry';

export type ViewportSize = { width: number; height: number };
export type ProjectedPoint = { x: number; y: number; depth: number; visible: boolean };
export type ProjectedBox = {
  id: string;
  sourceId?: string;
  kind: Box3D['kind'];
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  roughness: number;
  metalness: number;
};

type Vec3 = [number, number, number];
const CAMERA_NEAR = .05;
export const NATIVE_CAMERA_MIN_DISTANCE = 180;
export const NATIVE_CAMERA_MAX_DISTANCE = 1100;
export const NATIVE_CAMERA_MIN_PITCH = 8;
export const NATIVE_CAMERA_MAX_PITCH = 78;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (value: Vec3): Vec3 => {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
};
const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const radians = (degrees: number) => degrees * Math.PI / 180;

export function normalizeCamera3D(camera: Camera3DState): Camera3DState {
  const yaw = ((finite(camera.yaw, -28) + 180) % 360 + 360) % 360 - 180;
  return {
    distance: clamp(finite(camera.distance, 520), NATIVE_CAMERA_MIN_DISTANCE, NATIVE_CAMERA_MAX_DISTANCE),
    yaw,
    pitch: clamp(finite(camera.pitch, 30), NATIVE_CAMERA_MIN_PITCH, NATIVE_CAMERA_MAX_PITCH),
    target: {
      x: finite(camera.target.x, 220),
      y: finite(camera.target.y, 170),
    },
  };
}

function cameraBasis(cameraValue: Camera3DState) {
  const camera = normalizeCamera3D(cameraValue);
  const yaw = radians(camera.yaw);
  const pitch = radians(camera.pitch);
  const distance = camera.distance / 42;
  const target: Vec3 = [camera.target.x / 24, 2, camera.target.y / 24];
  const eye: Vec3 = [
    target[0] + Math.cos(pitch) * Math.sin(yaw) * distance,
    target[1] + Math.sin(pitch) * distance,
    target[2] + Math.cos(pitch) * Math.cos(yaw) * distance,
  ];
  const forward = normalize(subtract(target, eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  return { eye, forward, right, up };
}

export function projectNativePoint(point: Vec3, camera: Camera3DState, viewport: ViewportSize): ProjectedPoint {
  const safeViewport = { width: Math.max(1, viewport.width), height: Math.max(1, viewport.height) };
  const basis = cameraBasis(camera);
  const relative = subtract(point, basis.eye);
  const cameraX = dot(relative, basis.right);
  const cameraY = dot(relative, basis.up);
  const depth = dot(relative, basis.forward);
  const focal = safeViewport.height / (2 * Math.tan(Math.PI / 8));
  if (depth <= CAMERA_NEAR) return { x: 0, y: 0, depth, visible: false };
  return {
    x: safeViewport.width / 2 + cameraX * focal / depth,
    y: safeViewport.height / 2 - cameraY * focal / depth,
    depth,
    visible: true,
  };
}

function boxCorners(box: Box3D): Vec3[] {
  const [sizeX, sizeY, sizeZ] = box.size;
  const cosine = Math.cos(box.rotationY);
  const sine = Math.sin(box.rotationY);
  const result: Vec3[] = [];
  for (const localX of [-sizeX / 2, sizeX / 2]) {
    for (const localY of [-sizeY / 2, sizeY / 2]) {
      for (const localZ of [-sizeZ / 2, sizeZ / 2]) {
        result.push([
          box.center[0] + cosine * localX + sine * localZ,
          box.center[1] + localY,
          box.center[2] - sine * localX + cosine * localZ,
        ]);
      }
    }
  }
  return result;
}

export function projectNativeBox(box: Box3D, camera: Camera3DState, viewport: ViewportSize): ProjectedBox | undefined {
  const points = boxCorners(box).map(point => projectNativePoint(point, camera, viewport)).filter(point => point.visible);
  if (!points.length) return undefined;
  const minX = Math.min(...points.map(point => point.x));
  const maxX = Math.max(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const maxY = Math.max(...points.map(point => point.y));
  const width = Math.max(2, maxX - minX);
  const height = Math.max(2, maxY - minY);
  const marginX = viewport.width * 1.5;
  const marginY = viewport.height * 1.5;
  if (maxX < -marginX || minX > viewport.width + marginX || maxY < -marginY || minY > viewport.height + marginY) return undefined;
  return {
    id: box.id,
    sourceId: box.sourceId,
    kind: box.kind,
    x: minX,
    y: minY,
    width,
    height,
    depth: points.reduce((sum, point) => sum + point.depth, 0) / points.length,
    color: box.color,
    roughness: box.roughness,
    metalness: box.metalness,
  };
}

export function projectNativeScene(boxes: Box3D[], camera: Camera3DState, viewport: ViewportSize): ProjectedBox[] {
  return boxes
    .map(box => projectNativeBox(box, camera, viewport))
    .filter((box): box is ProjectedBox => Boolean(box))
    .sort((a, b) => b.depth - a.depth);
}

export function orbitNativeCamera(camera: Camera3DState, dx: number, dy: number): Camera3DState {
  return normalizeCamera3D({
    ...camera,
    yaw: camera.yaw + dx * .28,
    pitch: camera.pitch + dy * .2,
  });
}

export function panNativeCamera(cameraValue: Camera3DState, dx: number, dy: number): Camera3DState {
  const camera = normalizeCamera3D(cameraValue);
  const yaw = radians(camera.yaw);
  const scale = Math.max(.16, camera.distance / 1450);
  const right: Vec2 = { x: Math.cos(yaw), y: -Math.sin(yaw) };
  const forward: Vec2 = { x: Math.sin(yaw), y: Math.cos(yaw) };
  return normalizeCamera3D({
    ...camera,
    target: {
      x: camera.target.x - dx * scale * right.x + dy * scale * forward.x,
      y: camera.target.y - dx * scale * right.y + dy * scale * forward.y,
    },
  });
}

export function pinchNativeCamera(
  cameraValue: Camera3DState,
  startDistance: number,
  currentDistance: number,
  startMidpoint: Vec2,
  currentMidpoint: Vec2,
): Camera3DState {
  const camera = normalizeCamera3D(cameraValue);
  const ratio = Math.max(.05, currentDistance / Math.max(1, startDistance));
  const zoomed = normalizeCamera3D({ ...camera, distance: camera.distance / ratio });
  return panNativeCamera(zoomed, currentMidpoint.x - startMidpoint.x, currentMidpoint.y - startMidpoint.y);
}

export function focusNativeCamera(cameraValue: Camera3DState, xIn: number, yIn: number, spanIn = 48): Camera3DState {
  const camera = normalizeCamera3D(cameraValue);
  return normalizeCamera3D({
    ...camera,
    target: { x: xIn, y: yIn },
    distance: Math.min(camera.distance, Math.max(240, spanIn * 5)),
  });
}
