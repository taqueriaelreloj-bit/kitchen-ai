import { generateDesigns } from '../domain/design';
import { createEditorProject, updateObject } from '../domain/editor';
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  commitEditorTransaction,
  createEditorHistory,
  previewEditorProject,
  recordEditorProject,
  redoEditorHistory,
  undoEditorHistory,
} from '../domain/editorHistory';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({ uri: `history-${index}`, angle, capturedAt: '2026-08-28T00:00:00.000Z' }));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];
const base = () => createEditorProject(room, design);

describe('shared editor history engine', () => {
  test('records, undoes and redoes design changes', () => {
    const a = base();
    const b = updateObject(a, 'base-1', { widthIn: 42 });
    const c = updateObject(b, 'base-1', { color: '#112233' });
    let history = createEditorHistory(a);
    history = recordEditorProject(history, b);
    history = recordEditorProject(history, c);
    expect(canUndoEditorHistory(history)).toBe(true);
    history = undoEditorHistory(history);
    expect(history.present.objects.find(object => object.id === 'base-1')?.widthIn).toBe(42);
    expect(canRedoEditorHistory(history)).toBe(true);
    history = redoEditorHistory(history);
    expect(history.present.objects.find(object => object.id === 'base-1')?.color).toBe('#112233');
  });

  test('camera previews do not create history or erase redo', () => {
    const a = base();
    const b = updateObject(a, 'base-1', { widthIn: 42 });
    let history = recordEditorProject(createEditorHistory(a), b);
    history = undoEditorHistory(history);
    const preview = { ...history.present, camera3d: { ...history.present.camera3d, yaw: 55 } };
    history = previewEditorProject(history, preview);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(1);
    history = redoEditorHistory(history);
    expect(history.present.objects.find(object => object.id === 'base-1')?.widthIn).toBe(42);
  });

  test('a drag transaction creates exactly one Undo entry', () => {
    const a = base();
    const intermediate = updateObject(a, 'base-1', { x: 170 });
    const finalProject = updateObject(intermediate, 'base-1', { x: 220 });
    let history = createEditorHistory(a);
    history = previewEditorProject(history, intermediate);
    history = previewEditorProject(history, finalProject);
    history = commitEditorTransaction(history, a, finalProject);
    expect(history.past).toHaveLength(1);
    history = undoEditorHistory(history);
    expect(history.present.objects.find(object => object.id === 'base-1')?.x).toBe(150);
  });

  test('new edits clear redo and history respects its maximum size', () => {
    let history = createEditorHistory(base());
    for (let index = 0; index < 8; index++) history = recordEditorProject(history, updateObject(history.present, 'base-1', { widthIn: 30 + index }), 3);
    expect(history.past).toHaveLength(3);
    history = undoEditorHistory(history);
    expect(history.future).toHaveLength(1);
    history = recordEditorProject(history, updateObject(history.present, 'base-1', { heightIn: 40 }), 3);
    expect(history.future).toHaveLength(0);
  });

  test('undo and redo are safe when their stacks are empty', () => {
    const history = createEditorHistory(base());
    expect(undoEditorHistory(history)).toBe(history);
    expect(redoEditorHistory(history)).toBe(history);
    expect(canUndoEditorHistory(history)).toBe(false);
    expect(canRedoEditorHistory(history)).toBe(false);
  });
});
