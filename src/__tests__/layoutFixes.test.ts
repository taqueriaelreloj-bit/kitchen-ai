import { validateKitchenLayout } from '../domain/designValidation';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { canAutoFixLayoutIssue, fixLayoutIssue, focusLayoutIssue } from '../domain/layoutFixes';
import { openingData } from '../domain/openings';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({
  uri: `photo-${index}.jpg`,
  angle,
  capturedAt: '2026-08-28T00:00:00.000Z',
}));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];
const project = () => createEditorProject(room, design);

describe('layout issue fixes', () => {
  test.each([
    ['missing-sink', 'sink-base'],
    ['missing-range', 'appliance'],
    ['missing-refrigerator', 'appliance'],
  ] as const)('auto-fixes %s', (issueId, expectedKind) => {
    const source = project();
    const issue = validateKitchenLayout(source).find(item => item.id === issueId)!;
    expect(canAutoFixLayoutIssue(issue)).toBe(true);
    const next = fixLayoutIssue(source, issue);
    expect(next).not.toBe(source);
    expect(next.objects.length).toBe(source.objects.length + 1);
    expect(next.objects.find(object => object.id === next.selectedId)?.kind).toBe(expectedKind);
    expect(validateKitchenLayout(next).some(item => item.id === issueId)).toBe(false);
  });

  test('attaches an unattached opening to the first wall', () => {
    const source = project();
    const door = objectDefaults('door', { id: 'unattached-door', name: 'Patio Door' });
    const withDoor = { ...source, objects: [...source.objects, door] };
    const issue = validateKitchenLayout(withDoor).find(item => item.id === 'opening-wall-unattached-door')!;
    const next = fixLayoutIssue(withDoor, issue);
    expect(openingData(next.objects.find(object => object.id === door.id)!).parentWallId).toBe('wall-north');
    expect(next.selectedId).toBe(door.id);
  });

  test('focuses non-automatic issues without changing design objects', () => {
    const source = project();
    const issue = { id: 'manual', severity: 'warning' as const, title: 'Manual', detail: 'Move it', objectIds: ['base-1'] };
    expect(canAutoFixLayoutIssue(issue)).toBe(false);
    const next = focusLayoutIssue(source, issue);
    expect(next.selectedId).toBe('base-1');
    expect(next.objects).toBe(source.objects);
  });
});
