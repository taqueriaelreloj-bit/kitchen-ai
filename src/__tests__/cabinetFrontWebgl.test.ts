import { buildBillOfMaterials } from '../domain/billOfMaterials';
import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

const hardware={style:'Bar Pull',size:'5 inches',finishId:'matte-black',position:'Center'} as any;

describe('cabinet front layout WebGL integration',()=>{
  test('drawer base renders three distinct drawer fronts',()=>{
    const drawer=objectDefaults('drawer-base',{id:'drawer-webgl',widthIn:30,hardware});
    const boxes=buildSceneBoxes([drawer]);
    const frontIds=new Set(boxes.filter(box=>box.sourceId==='drawer-webgl'&&box.kind==='cabinet-door').map(box=>box.id.split('-').slice(0,5).join('-')));
    expect([...frontIds].some(id=>id.includes('drawer-0'))).toBe(true);
    expect([...frontIds].some(id=>id.includes('drawer-1'))).toBe(true);
    expect([...frontIds].some(id=>id.includes('drawer-2'))).toBe(true);
    expect(boxes.filter(box=>box.sourceId==='drawer-webgl'&&box.kind==='hardware').some(box=>box.id.includes('drawer-0'))).toBe(true);
    expect(boxes.filter(box=>box.sourceId==='drawer-webgl'&&box.kind==='hardware').some(box=>box.id.includes('drawer-2'))).toBe(true);
  });

  test('sink base does not place hardware on the false front',()=>{
    const sink=objectDefaults('sink-base',{id:'sink-webgl',widthIn:36,hardware});
    const boxes=buildSceneBoxes([sink]);
    expect(boxes.some(box=>box.sourceId==='sink-webgl'&&box.id.includes('sink-false-front')&&box.kind==='cabinet-door')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='sink-webgl'&&box.id.includes('sink-false-front')&&box.kind==='hardware')).toBe(false);
    expect(boxes.filter(box=>box.sourceId==='sink-webgl'&&box.kind==='hardware').length).toBeGreaterThan(0);
  });

  test('oven cabinet preserves an appliance opening instead of covering it with a door',()=>{
    const oven=objectDefaults('oven-cabinet',{id:'oven-webgl',widthIn:30,heightIn:84,hardware});
    const boxes=buildSceneBoxes([oven]);
    expect(boxes.some(box=>box.sourceId==='oven-webgl'&&box.id.includes('oven-opening')&&box.kind==='cabinet-door')).toBe(false);
    expect(boxes.some(box=>box.sourceId==='oven-webgl'&&box.id.includes('-oven')&&box.kind==='appliance')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='oven-webgl'&&box.id.includes('oven-upper')&&box.kind==='cabinet-door')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='oven-webgl'&&box.id.includes('oven-lower')&&box.kind==='cabinet-door')).toBe(true);
  });

  test('BOM counts hardware from actual cabinet fronts',()=>{
    const drawer=objectDefaults('drawer-base',{id:'drawer-bom',widthIn:30,hardware});
    const sink=objectDefaults('sink-base',{id:'sink-bom',widthIn:36,hardware});
    const hardwareLine=buildBillOfMaterials({objects:[drawer,sink]} as any).find(line=>line.category==='Hardware');
    expect(hardwareLine?.quantity).toBe(5);
  });
});
