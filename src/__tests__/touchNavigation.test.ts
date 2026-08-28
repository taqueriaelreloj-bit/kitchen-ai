import { View2DState } from '../domain/editor';
import { pan2DView, pinch2DView } from '../domain/touchNavigation';

const view = (): View2DState => ({
  zoom: 1,
  pan: { x: 20, y: 30 },
  grid: true,
  snap: true,
  measurements: true,
});

describe('touch navigation math', () => {
  test('pans without changing zoom or design-view flags', () => {
    const start = view();
    const next = pan2DView(start, 45, -12);
    expect(next.pan).toEqual({ x: 65, y: 18 });
    expect(next.zoom).toBe(1);
    expect(next.grid).toBe(true);
    expect(start.pan).toEqual({ x: 20, y: 30 });
  });

  test('pinch keeps the world point beneath the fingers stable', () => {
    const start = view();
    const startMid = { x: 180, y: 220 };
    const currentMid = { x: 210, y: 245 };
    const next = pinch2DView(start, 100, startMid, 150, currentMid);
    const worldBefore = {
      x: (startMid.x - start.pan.x) / start.zoom,
      y: (startMid.y - start.pan.y) / start.zoom,
    };
    const worldAfter = {
      x: (currentMid.x - next.pan.x) / next.zoom,
      y: (currentMid.y - next.pan.y) / next.zoom,
    };
    expect(next.zoom).toBe(1.5);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  test('pinch respects the shared zoom limits', () => {
    const start = view();
    expect(pinch2DView(start, 100, { x: 0, y: 0 }, 1000, { x: 0, y: 0 }).zoom).toBe(2);
    expect(pinch2DView(start, 100, { x: 0, y: 0 }, 1, { x: 0, y: 0 }).zoom).toBe(.25);
  });
});
