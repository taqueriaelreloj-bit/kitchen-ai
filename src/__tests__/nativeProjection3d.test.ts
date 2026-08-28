import { Box3D } from '../domain/geometry';
import {
  focusNativeCamera,
  NATIVE_CAMERA_MAX_DISTANCE,
  NATIVE_CAMERA_MAX_PITCH,
  NATIVE_CAMERA_MIN_DISTANCE,
  NATIVE_CAMERA_MIN_PITCH,
  normalizeCamera3D,
  orbitNativeCamera,
  panNativeCamera,
  pinchNativeCamera,
  projectNativeBox,
  projectNativePoint,
  projectNativeScene,
} from '../domain/nativeProjection3d';
import { Camera3DState } from '../domain/editor';

const viewport = { width: 800, height: 600 };
const camera = (): Camera3DState => ({ distance: 520, yaw: 0, pitch: 24, target: { x: 0, y: 0 } });
const box = (id: string, z: number): Box3D => ({
  id,
  sourceId: id,
  kind: 'cabinet',
  center: [0, 1.5, z],
  size: [2, 3, 1],
  rotationY: 0,
  color: '#CCCCCC',
  roughness: .5,
  metalness: 0,
});

describe('native 3D projection', () => {
  test('projects the camera target to the center of the viewport', () => {
    const point = projectNativePoint([0, 2, 0], camera(), viewport);
    expect(point.visible).toBe(true);
    expect(point.x).toBeCloseTo(viewport.width / 2, 5);
    expect(point.y).toBeCloseTo(viewport.height / 2, 5);
  });

  test('near boxes project larger than far boxes', () => {
    const near = projectNativeBox(box('near', 5), camera(), viewport)!;
    const far = projectNativeBox(box('far', -3), camera(), viewport)!;
    expect(near.width).toBeGreaterThan(far.width);
    expect(near.height).toBeGreaterThan(far.height);
    expect(near.depth).toBeLessThan(far.depth);
  });

  test('scene projection draws far boxes before near boxes', () => {
    const result = projectNativeScene([box('near', 5), box('far', -3)], camera(), viewport);
    expect(result.map(item => item.id)).toEqual(['far', 'near']);
  });

  test('orbit changes the projection of an off-center point', () => {
    const point: [number, number, number] = [2, 2, 0];
    const before = projectNativePoint(point, camera(), viewport);
    const after = projectNativePoint(point, orbitNativeCamera(camera(), 180, 0), viewport);
    expect(after.x).not.toBeCloseTo(before.x, 2);
  });

  test('normalizes unsafe camera values', () => {
    const normalized = normalizeCamera3D({ distance: 99999, yaw: 725, pitch: -20, target: { x: Number.NaN, y: Number.POSITIVE_INFINITY } });
    expect(normalized.distance).toBe(NATIVE_CAMERA_MAX_DISTANCE);
    expect(normalized.pitch).toBe(NATIVE_CAMERA_MIN_PITCH);
    expect(normalized.yaw).toBe(5);
    expect(normalized.target).toEqual({ x: 220, y: 170 });
  });

  test('orbit and pinch respect camera limits', () => {
    expect(orbitNativeCamera(camera(), 0, -1000).pitch).toBe(NATIVE_CAMERA_MIN_PITCH);
    expect(orbitNativeCamera(camera(), 0, 1000).pitch).toBe(NATIVE_CAMERA_MAX_PITCH);
    expect(pinchNativeCamera(camera(), 100, 10000, { x: 0, y: 0 }, { x: 0, y: 0 }).distance).toBe(NATIVE_CAMERA_MIN_DISTANCE);
    expect(pinchNativeCamera(camera(), 100, 1, { x: 0, y: 0 }, { x: 0, y: 0 }).distance).toBe(NATIVE_CAMERA_MAX_DISTANCE);
  });

  test('two-finger midpoint movement pans and focus targets an object', () => {
    const panned = panNativeCamera(camera(), 40, -20);
    expect(panned.target).not.toEqual(camera().target);
    const focused = focusNativeCamera(camera(), 240, 180, 60);
    expect(focused.target).toEqual({ x: 240, y: 180 });
    expect(focused.distance).toBeLessThanOrEqual(camera().distance);
  });
});
