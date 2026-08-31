import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { openingData } from '../domain/openings';

const door=(id:string,swingDirection:'Left In'|'Right In'|'Left Out'|'Right Out')=>objectDefaults('door',{id,widthIn:36,heightIn:80,openingSpec:{...openingData(objectDefaults('door')),swingDirection}} as any);

describe('door swing WebGL integration',()=>{
  test('renders door leaf, handle, hinge and trim',()=>{
    const object=door('detailed-door','Left In');
    const boxes=buildSceneBoxes([object]);
    expect(boxes.some(box=>box.id==='detailed-door'&&box.kind==='opening')).toBe(true);
    expect(boxes.some(box=>box.id==='detailed-door-handle'&&box.kind==='hardware')).toBe(true);
    expect(boxes.some(box=>box.id==='detailed-door-hinge'&&box.kind==='hardware')).toBe(true);
    expect(boxes.filter(box=>box.id.startsWith('detailed-door-trim-'))).toHaveLength(3);
  });

  test('changes the leaf pose for each swing direction',()=>{
    const leftIn=buildSceneBoxes([door('left-in','Left In')]).find(box=>box.id==='left-in')!;
    const rightIn=buildSceneBoxes([door('right-in','Right In')]).find(box=>box.id==='right-in')!;
    const leftOut=buildSceneBoxes([door('left-out','Left Out')]).find(box=>box.id==='left-out')!;
    expect(leftIn.rotationY).not.toBe(rightIn.rotationY);
    expect(leftIn.rotationY).not.toBe(leftOut.rotationY);
    expect(leftIn.center).not.toEqual(rightIn.center);
    expect(leftIn.center).not.toEqual(leftOut.center);
  });
});
