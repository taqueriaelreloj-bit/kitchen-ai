import { buildSceneBoxes } from '../domain/geometry';
import { objectDefaults } from '../domain/editor';

describe('Detailed kitchen geometry', () => {
  test('base cabinet renders door panels countertop cap toe kick and hardware', () => {
    const cabinet = objectDefaults('base-cabinet', { id:'base-detail', widthIn:36 });
    const boxes = buildSceneBoxes([cabinet]);
    expect(boxes.filter(x => x.sourceId === 'base-detail' && x.kind === 'cabinet-door')).toHaveLength(2);
    expect(boxes.some(x => x.sourceId === 'base-detail' && x.kind === 'countertop')).toBe(true);
    expect(boxes.some(x => x.kind === 'toe-kick')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'base-detail' && x.kind === 'hardware')).toBe(true);
  });

  test('narrow cabinet uses a single door panel', () => {
    const cabinet = objectDefaults('base-cabinet', { id:'narrow', widthIn:24 });
    const boxes = buildSceneBoxes([cabinet]);
    expect(boxes.filter(x => x.sourceId === 'narrow' && x.kind === 'cabinet-door')).toHaveLength(1);
  });

  test('wall cabinet has doors and hardware but no countertop or toe kick', () => {
    const upper = objectDefaults('wall-cabinet', { id:'upper-detail' });
    const boxes = buildSceneBoxes([upper]);
    expect(boxes.some(x => x.sourceId === 'upper-detail' && x.kind === 'cabinet-door')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'upper-detail' && x.kind === 'hardware')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'upper-detail' && x.kind === 'countertop')).toBe(false);
    expect(boxes.some(x => x.kind === 'toe-kick')).toBe(false);
  });

  test('window creates glass and sill geometry', () => {
    const window = objectDefaults('window', { id:'window-detail' });
    const boxes = buildSceneBoxes([window]);
    expect(boxes.some(x => x.sourceId === 'window-detail' && x.kind === 'opening')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'window-detail' && x.kind === 'trim')).toBe(true);
  });

  test('door creates panel and trim geometry', () => {
    const door = objectDefaults('door', { id:'door-detail' });
    const boxes = buildSceneBoxes([door]);
    expect(boxes.some(x => x.sourceId === 'door-detail' && x.kind === 'opening')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'door-detail' && x.kind === 'trim')).toBe(true);
  });
});
