import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

const cabinet=(id:string,doorStyleId:string)=>objectDefaults('base-cabinet',{id,x:100,y:100,widthIn:30,heightIn:34.5,depthIn:24,doorStyleId} as any);

describe('cabinet door style WebGL integration',()=>{
  test('renders one slab part for slab doors',()=>{
    const boxes=buildSceneBoxes([cabinet('slab-cabinet','slab')]);
    const doors=boxes.filter(box=>box.sourceId==='slab-cabinet'&&box.kind==='cabinet-door');
    expect(doors).toHaveLength(2);
    expect(doors.every(box=>box.id.includes('slab'))).toBe(true);
  });

  test('renders rails, stiles and center panel for Shaker doors',()=>{
    const boxes=buildSceneBoxes([cabinet('shaker-cabinet','shaker')]);
    const ids=boxes.filter(box=>box.sourceId==='shaker-cabinet'&&box.kind==='cabinet-door').map(box=>box.id);
    expect(ids.some(id=>id.includes('left-stile'))).toBe(true);
    expect(ids.some(id=>id.includes('right-stile'))).toBe(true);
    expect(ids.some(id=>id.includes('top-rail'))).toBe(true);
    expect(ids.some(id=>id.includes('bottom-rail'))).toBe(true);
    expect(ids.some(id=>id.includes('center-panel'))).toBe(true);
  });

  test('renders transparent-looking glass frame panels',()=>{
    const upper=objectDefaults('glass-upper',{id:'glass-cabinet',x:100,y:100,widthIn:30,doorStyleId:'glass-frame'} as any);
    const glass=buildSceneBoxes([upper]).filter(box=>box.sourceId==='glass-cabinet'&&box.id.includes('glass'));
    expect(glass.length).toBeGreaterThan(0);
    expect(glass.some(box=>box.roughness<=.12)).toBe(true);
  });

  test('beadboard generates vertical groove geometry',()=>{
    const boxes=buildSceneBoxes([cabinet('beadboard-cabinet','beadboard')]);
    expect(boxes.filter(box=>box.sourceId==='beadboard-cabinet'&&box.id.includes('groove-')).length).toBeGreaterThanOrEqual(10);
  });
});
