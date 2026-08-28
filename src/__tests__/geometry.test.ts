import { buildSceneBoxes, continuousToeKickRuns } from '../domain/geometry';
import { objectDefaults } from '../domain/editor';

describe('Kitchen AI 3D geometry', () => {
  test('merges adjacent base cabinets into one continuous toe-kick run', () => {
    const a = objectDefaults('base-cabinet', { id:'a', x:0, y:0, widthIn:36 });
    const b = objectDefaults('base-cabinet', { id:'b', x:36, y:0, widthIn:30 });
    const runs = continuousToeKickRuns([a,b]);
    expect(runs).toHaveLength(1);
    expect(runs[0].ids).toEqual(['a','b']);
    expect(runs[0].widthIn).toBe(66);
  });

  test('keeps separated cabinet banks as independent toe-kick runs', () => {
    const a = objectDefaults('base-cabinet', { id:'a', x:0, y:0, widthIn:36 });
    const b = objectDefaults('base-cabinet', { id:'b', x:60, y:0, widthIn:30 });
    expect(continuousToeKickRuns([a,b])).toHaveLength(2);
  });

  test('wall cabinets never generate toe-kick geometry', () => {
    const upper = objectDefaults('wall-cabinet', { id:'upper' });
    expect(continuousToeKickRuns([upper])).toHaveLength(0);
    expect(buildSceneBoxes([upper]).some(x => x.kind === 'toe-kick')).toBe(false);
  });

  test('builds real 3D scene boxes for walls cabinets hardware and floor', () => {
    const wall = objectDefaults('wall', { id:'wall' });
    const cabinet = objectDefaults('base-cabinet', { id:'cabinet' });
    const boxes = buildSceneBoxes([wall,cabinet]);
    expect(boxes.some(x => x.kind === 'floor')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'wall' && x.kind === 'wall')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'cabinet' && x.kind === 'cabinet')).toBe(true);
    expect(boxes.some(x => x.sourceId === 'cabinet' && x.kind === 'hardware')).toBe(true);
    expect(boxes.some(x => x.kind === 'toe-kick')).toBe(true);
  });

  test('disabled toe kick is omitted from the 3D scene', () => {
    const cabinet = objectDefaults('base-cabinet', { id:'cabinet', toeKick:{ enabled:false, heightIn:4, recessIn:3, color:'#fff', finish:'Matte' } });
    expect(buildSceneBoxes([cabinet]).some(x => x.kind === 'toe-kick')).toBe(false);
  });
});
