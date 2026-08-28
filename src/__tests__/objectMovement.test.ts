import { generateDesigns } from '../domain/design';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { createObjectDragOrigin, moveObjectByPlanDelta } from '../domain/objectMovement';
import { attachOpening, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({ uri: `p-${index}`, angle, capturedAt: '2026-08-28T00:00:00.000Z' }));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];

describe('shared object movement', () => {
  test('moves regular objects with the shared 5 inch snap', () => {
    const project = createEditorProject(room, design);
    const origin = createObjectDragOrigin(project, 'base-1')!;
    const next = moveObjectByPlanDelta(project, origin, 13, 7);
    const moved = next.objects.find(object => object.id === 'base-1')!;
    expect(moved.x).toBe(165);
    expect(moved.y).toBe(125);
    expect(project.objects.find(object => object.id === 'base-1')?.x).toBe(150);
  });

  test('moves without rounding when snap is disabled', () => {
    const project = createEditorProject(room, design);
    const noSnap = { ...project, view2d: { ...project.view2d, snap: false } };
    const origin = createObjectDragOrigin(noSnap, 'base-1')!;
    const moved = moveObjectByPlanDelta(noSnap, origin, 13, 7).objects.find(object => object.id === 'base-1')!;
    expect(moved.x).toBe(163);
    expect(moved.y).toBe(127);
  });

  test('slides attached openings along their wall instead of detaching them', () => {
    let project = createEditorProject(room, design);
    const door = objectDefaults('door', { id: 'drag-door' });
    project = { ...project, objects: [...project.objects, door] };
    project = attachOpening(project, door.id, 'wall-west', 24);
    const origin = createObjectDragOrigin(project, door.id)!;
    const next = moveObjectByPlanDelta(project, origin, 0, 10);
    const moved = next.objects.find(object => object.id === door.id)!;
    expect(openingData(moved).parentWallId).toBe('wall-west');
    expect(openingData(moved).wallOffsetIn).toBeCloseTo(34, 5);
  });

  test('returns the same project for an unknown object', () => {
    const project = createEditorProject(room, design);
    expect(createObjectDragOrigin(project, 'missing')).toBeUndefined();
    expect(moveObjectByPlanDelta(project, { id: 'missing', x: 0, y: 0, wallOffsetIn: 0 }, 10, 10)).toBe(project);
  });
});
