import { LayoutIssue } from './designValidation';
import { EditorObject, EditorProject, isBaseLikeKind, objectDefaults } from './editor';
import { objectFootprint } from './layoutValidation';
import { isLighting } from './lighting';
import { attachOpening } from './openings';

const inches = (meters: number) => meters * 39.3701;
const isFloorBlocker = (object: EditorObject) => !isLighting(object) && (isBaseLikeKind(object.kind) || object.kind === 'appliance');
const overlaps = (a: ReturnType<typeof objectFootprint>, b: ReturnType<typeof objectFootprint>) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function findOpenFloorPosition(project: EditorProject, candidate: EditorObject) {
  const left = 120;
  const top = 120;
  const right = left + inches(project.room.widthM);
  const bottom = top + inches(project.room.lengthM);
  const blockers = project.objects.filter(isFloorBlocker).map(objectFootprint);
  const step = 12;

  for (let y = top + step; y <= bottom - candidate.depthIn - step; y += step) {
    for (let x = left + step; x <= right - candidate.widthIn - step; x += step) {
      const probe = objectFootprint({ ...candidate, x, y });
      if (!blockers.some(blocker => overlaps(probe, blocker))) return { x, y };
    }
  }

  return {
    x: Math.max(left, left + (right - left - candidate.widthIn) / 2),
    y: Math.max(top, top + (bottom - top - candidate.depthIn) / 2),
  };
}

function addFloorObject(project: EditorProject, object: EditorObject): EditorProject {
  const position = findOpenFloorPosition(project, object);
  const placed = { ...object, ...position };
  return {
    ...project,
    objects: [...project.objects, placed],
    selectedId: placed.id,
    viewMode: '2d',
    updatedAt: new Date().toISOString(),
  };
}

export function canAutoFixLayoutIssue(issue: LayoutIssue) {
  return issue.id === 'missing-sink' || issue.id === 'missing-range' || issue.id === 'missing-refrigerator' || issue.id.startsWith('opening-wall-');
}

export function focusLayoutIssue(project: EditorProject, issue: LayoutIssue): EditorProject {
  const selectedId = issue.objectIds.find(id => project.objects.some(object => object.id === id));
  return { ...project, selectedId, viewMode: '2d' };
}

export function fixLayoutIssue(project: EditorProject, issue: LayoutIssue): EditorProject {
  if (issue.id === 'missing-sink') {
    return addFloorObject(project, objectDefaults('sink-base', { name: 'Sink Base' }));
  }
  if (issue.id === 'missing-range') {
    return addFloorObject(project, objectDefaults('appliance', {
      name: 'Range',
      widthIn: 30,
      depthIn: 28,
      heightIn: 36,
      color: '#555B5C',
      material: 'Stainless Steel',
    }));
  }
  if (issue.id === 'missing-refrigerator') {
    return addFloorObject(project, objectDefaults('appliance', {
      name: 'Refrigerator',
      widthIn: 36,
      depthIn: 30,
      heightIn: 70,
      color: '#A7ADAE',
      material: 'Stainless Steel',
    }));
  }
  if (issue.id.startsWith('opening-wall-')) {
    const openingId = issue.objectIds[0];
    const wall = project.objects.find(object => object.kind === 'wall');
    if (!openingId || !wall) return focusLayoutIssue(project, issue);
    const attached = attachOpening(project, openingId, wall.id, 24);
    return { ...attached, selectedId: openingId, viewMode: '2d' };
  }
  return focusLayoutIssue(project, issue);
}
