import { clampZoom, Vec2, View2DState } from './editor';

export function pan2DView(start: View2DState, dx: number, dy: number): View2DState {
  return { ...start, pan: { x: start.pan.x + dx, y: start.pan.y + dy } };
}

export function pinch2DView(
  start: View2DState,
  startDistance: number,
  startMidpoint: Vec2,
  currentDistance: number,
  currentMidpoint: Vec2,
): View2DState {
  const safeStartDistance = Math.max(1, startDistance);
  const nextZoom = clampZoom(start.zoom * (Math.max(1, currentDistance) / safeStartDistance));
  const ratio = nextZoom / start.zoom;
  return {
    ...start,
    zoom: nextZoom,
    pan: {
      x: currentMidpoint.x - (startMidpoint.x - start.pan.x) * ratio,
      y: currentMidpoint.y - (startMidpoint.y - start.pan.y) * ratio,
    },
  };
}
