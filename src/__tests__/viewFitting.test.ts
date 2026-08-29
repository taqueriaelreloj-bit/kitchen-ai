import { generateDesigns } from '../domain/design';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import {
  center2DView,
  center3DCamera,
  fit2DView,
  fit3DCamera,
  objectDisplayBounds,
  projectDisplayBounds,
  projectPlanBounds,
} from '../domain/viewFitting';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({ uri: `fit-${index}`, angle, capturedAt: '2026-08-28T00:00:00.000Z' }));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];

describe('project view fitting', () => {
  test('rotated display bounds scale coordinates and footprint consistently', () => {
    const object = objectDefaults('base-cabinet', { x: 10, y: 20, widthIn: 100, depthIn: 20, rotation: 90 });
    const bounds = objectDisplayBounds(object);
    expect(bounds.width).toBeCloseTo(40, 5);
    expect(bounds.height).toBeCloseTo(200, 5);
    expect(bounds.centerX).toBeCloseTo(120, 5);
    expect(bounds.centerY).toBeCloseTo(60, 5);
  });

  test('Fit Plan keeps the complete design inside the viewport', () => {
    const project = createEditorProject(room, design);
    const viewport = { width: 720, height: 460 };
    const view = fit2DView(project, viewport, 40);
    const bounds = projectDisplayBounds(project);
    const screen = {
      left: bounds.left * view.zoom + view.pan.x,
      right: bounds.right * view.zoom + view.pan.x,
      top: bounds.top * view.zoom + view.pan.y,
      bottom: bounds.bottom * view.zoom + view.pan.y,
    };
    expect(screen.left).toBeGreaterThanOrEqual(39);
    expect(screen.top).toBeGreaterThanOrEqual(39);
    expect(screen.right).toBeLessThanOrEqual(viewport.width - 39);
    expect(screen.bottom).toBeLessThanOrEqual(viewport.height - 39);
  });

  test('a 10 by 11 kitchen fills a useful portion of the imported-project viewport', () => {
    const project = createLuisTenByElevenKitchen();
    const viewport = { width: 900, height: 620 };
    const view = fit2DView(project, viewport, 44);
    const bounds = projectDisplayBounds(project);
    const screenWidth = bounds.width * view.zoom;
    const screenHeight = bounds.height * view.zoom;
    expect(screenWidth).toBeGreaterThan(350);
    expect(screenHeight).toBeGreaterThan(350);
    expect(screenWidth).toBeLessThanOrEqual(viewport.width - 88 + 1);
    expect(screenHeight).toBeLessThanOrEqual(viewport.height - 88 + 1);
  });

  test('Center Plan preserves zoom and moves the bounds center to viewport center', () => {
    const source = createEditorProject(room, design);
    const project = { ...source, view2d: { ...source.view2d, zoom: 1.35, pan: { x: 99, y: -50 } } };
    const viewport = { width: 640, height: 420 };
    const view = center2DView(project, viewport);
    const bounds = projectDisplayBounds(project);
    expect(view.zoom).toBe(1.35);
    expect(bounds.centerX * view.zoom + view.pan.x).toBeCloseTo(viewport.width / 2, 5);
    expect(bounds.centerY * view.zoom + view.pan.y).toBeCloseTo(viewport.height / 2, 5);
  });

  test('Fit View targets the project center and uses viewport-aware camera distance', () => {
    const project = createLuisTenByElevenKitchen();
    const bounds = projectPlanBounds(project);
    const camera = fit3DCamera(project, { width: 960, height: 640 });
    expect(camera.target.x).toBeCloseTo(bounds.centerX, 5);
    expect(camera.target.y).toBeCloseTo(bounds.centerY, 5);
    expect(camera.distance).toBeGreaterThanOrEqual(120);
    expect(camera.distance).toBeLessThanOrEqual(1100);
    expect(camera.pitch).toBe(32);
  });

  test('Center 3D keeps camera orientation and distance', () => {
    const source = createEditorProject(room, design);
    const project = { ...source, camera3d: { ...source.camera3d, distance: 777, yaw: 31, pitch: 42 } };
    const centered = center3DCamera(project);
    expect(centered.distance).toBe(777);
    expect(centered.yaw).toBe(31);
    expect(centered.pitch).toBe(42);
  });

  test('empty projects produce safe finite views', () => {
    const source = createEditorProject(room, design);
    const project = { ...source, objects: [] };
    const view = fit2DView(project, { width: 500, height: 320 });
    const camera = fit3DCamera(project, { width: 500, height: 320 });
    expect(Number.isFinite(view.zoom)).toBe(true);
    expect(Number.isFinite(view.pan.x)).toBe(true);
    expect(Number.isFinite(camera.distance)).toBe(true);
  });
});
