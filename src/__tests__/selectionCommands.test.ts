import { generateDesigns } from '../domain/design';
import { createEditorProject } from '../domain/editor';
import { addOpening, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import {
  duplicateSelectedObject,
  moveSelectedObjectTo,
  nudgeSelectedObject,
  rotateSelectedObject,
  selectedObjectStatus,
} from '../domain/selectionCommands';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({
  uri: `photo-${index}.jpg`,
  angle,
  capturedAt: '2026-08-28T00:00:00.000Z',
}));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];
const selectedProject = () => ({ ...createEditorProject(room, design), selectedId: 'base-1' });

describe('shared selection editing commands', () => {
  test('nudges the selected object precisely without changing the snap preference', () => {
    const project = selectedProject();
    const before = project.objects.find(object => object.id === 'base-1')!;
    const next = nudgeSelectedObject(project, 7, 3);
    const moved = next.objects.find(object => object.id === 'base-1')!;
    expect(moved.x).toBe(before.x + 7);
    expect(moved.y).toBe(before.y + 3);
    expect(next.view2d.snap).toBe(project.view2d.snap);
  });

  test('can apply the existing five-inch snap to a nudge', () => {
    const project = selectedProject();
    const next = nudgeSelectedObject(project, 7, 3, { snap: true });
    const moved = next.objects.find(object => object.id === 'base-1')!;
    expect(moved.x).toBe(155);
    expect(moved.y).toBe(125);
  });

  test('moves the selected object to an absolute plan position', () => {
    const next = moveSelectedObjectTo(selectedProject(), 211, 173);
    const moved = next.objects.find(object => object.id === 'base-1')!;
    expect(moved.x).toBe(211);
    expect(moved.y).toBe(173);
  });

  test('rotates and normalizes the selected object', () => {
    const project = selectedProject();
    const next = rotateSelectedObject(project, -90);
    expect(next.objects.find(object => object.id === 'base-1')?.rotation).toBe(270);
  });

  test('duplicates the selected object and selects the copy', () => {
    const project = selectedProject();
    const next = duplicateSelectedObject(project);
    expect(next.objects).toHaveLength(project.objects.length + 1);
    expect(next.selectedId).toBeTruthy();
    expect(next.selectedId).not.toBe(project.selectedId);
    expect(next.objects.find(object => object.id === next.selectedId)?.name).toContain('Copy');
  });

  test('projects an attached opening nudge along its parent wall', () => {
    let project = { ...createEditorProject(room, design), selectedId: 'wall-north' };
    project = addOpening(project, 'door');
    const doorId = project.selectedId!;
    const before = openingData(project.objects.find(object => object.id === doorId)!);
    const next = nudgeSelectedObject(project, 12, 8);
    const after = openingData(next.objects.find(object => object.id === doorId)!);
    expect(after.parentWallId).toBe(before.parentWallId);
    expect(after.wallOffsetIn).toBeCloseTo((before.wallOffsetIn ?? 0) + 12, 5);
  });

  test('returns status for the selected object and is safe with no selection', () => {
    const project = selectedProject();
    expect(selectedObjectStatus(project)).toMatchObject({ id: 'base-1', xIn: 150, yIn: 120 });
    const empty = { ...project, selectedId: undefined };
    expect(selectedObjectStatus(empty)).toBeUndefined();
    expect(nudgeSelectedObject(empty, 1, 0)).toBe(empty);
    expect(rotateSelectedObject(empty)).toBe(empty);
    expect(duplicateSelectedObject(empty)).toBe(empty);
  });
});
