import { useCallback, useRef, useState } from 'react';
import { EditorProject } from '../domain/editor';
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  commitEditorTransaction,
  createEditorHistory,
  EditorHistoryState,
  previewEditorProject,
  recordEditorProject,
  redoEditorHistory,
  undoEditorHistory,
} from '../domain/editorHistory';

export function useEditorHistory(initialProject: EditorProject, onProjectChange: (project: EditorProject) => void, limit = 60) {
  const [history, setHistoryState] = useState<EditorHistoryState>(() => createEditorHistory(initialProject));
  const historyRef = useRef(history);

  const setHistory = useCallback((next: EditorHistoryState) => {
    historyRef.current = next;
    setHistoryState(next);
  }, []);

  const apply = useCallback((next: EditorProject, record = true) => {
    const current = historyRef.current;
    const updated = record ? recordEditorProject(current, next, limit) : previewEditorProject(current, next);
    setHistory(updated);
    if (next !== current.present) onProjectChange(next);
  }, [limit, onProjectChange, setHistory]);

  const preview = useCallback((next: EditorProject) => {
    setHistory(previewEditorProject(historyRef.current, next));
  }, [setHistory]);

  const commitHistory = useCallback((snapshot: EditorProject, finalProject: EditorProject) => {
    const current = historyRef.current;
    const updated = commitEditorTransaction(current, snapshot, finalProject, limit);
    setHistory(updated);
    if (finalProject !== current.present) onProjectChange(finalProject);
  }, [limit, onProjectChange, setHistory]);

  const undo = useCallback(() => {
    const current = historyRef.current;
    const updated = undoEditorHistory(current);
    if (updated === current) return;
    setHistory(updated);
    onProjectChange(updated.present);
  }, [onProjectChange, setHistory]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    const updated = redoEditorHistory(current);
    if (updated === current) return;
    setHistory(updated);
    onProjectChange(updated.present);
  }, [onProjectChange, setHistory]);

  const save = useCallback(() => onProjectChange(historyRef.current.present), [onProjectChange]);

  return {
    project: history.present,
    apply,
    preview,
    commitHistory,
    undo,
    redo,
    save,
    canUndo: canUndoEditorHistory(history),
    canRedo: canRedoEditorHistory(history),
    undoCount: history.past.length,
    redoCount: history.future.length,
  };
}
