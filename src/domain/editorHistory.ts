import { EditorProject } from './editor';

export type EditorHistoryState = {
  past: EditorProject[];
  present: EditorProject;
  future: EditorProject[];
};

export function createEditorHistory(project: EditorProject): EditorHistoryState {
  return { past: [], present: project, future: [] };
}

const appendLimited = (items: EditorProject[], project: EditorProject, limit: number) => {
  const next = [...items, project];
  return next.length > limit ? next.slice(next.length - limit) : next;
};

export function recordEditorProject(history: EditorHistoryState, next: EditorProject, limit = 60): EditorHistoryState {
  if (next === history.present) return history;
  return {
    past: appendLimited(history.past, history.present, limit),
    present: next,
    future: [],
  };
}

export function previewEditorProject(history: EditorHistoryState, next: EditorProject): EditorHistoryState {
  if (next === history.present) return history;
  return { ...history, present: next };
}

export function commitEditorTransaction(history: EditorHistoryState, snapshot: EditorProject, finalProject: EditorProject, limit = 60): EditorHistoryState {
  if (snapshot === finalProject) return previewEditorProject(history, finalProject);
  return {
    past: appendLimited(history.past, snapshot, limit),
    present: finalProject,
    future: [],
  };
}

export function undoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEditorHistory(history: EditorHistoryState): EditorHistoryState {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export const canUndoEditorHistory = (history: EditorHistoryState) => history.past.length > 0;
export const canRedoEditorHistory = (history: EditorHistoryState) => history.future.length > 0;
