import { objectDefaults } from '../domain/editor';
import {
  localEdgeCenter,
  nudgeObject,
  resizeObject,
  rotateObjectTowardPoint,
  selectionBounds,
  worldToLocal,
} from '../domain/objectTransform';

describe('professional object transform engine',()=>{
  test('east resize keeps the west edge anchored',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:30,depthIn:24,rotation:0});
    const westBefore=localEdgeCenter(object,'w');
    const resized=resizeObject(object,'e',{x:12,y:0});
    expect(resized.widthIn).toBe(42);
    expect(localEdgeCenter(resized,'w')).toEqual(westBefore);
    expect(resized.x).toBe(100);
  });

  test('west resize moves the west side and keeps east anchored',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:30,depthIn:24});
    const eastBefore=localEdgeCenter(object,'e');
    const resized=resizeObject(object,'w',{x:10,y:0});
    expect(resized.widthIn).toBe(20);
    expect(localEdgeCenter(resized,'e')).toEqual(eastBefore);
    expect(resized.x).toBe(110);
  });

  test('corner resize changes both dimensions',()=>{
    const object=objectDefaults('island',{x:200,y:200,widthIn:84,depthIn:42});
    const resized=resizeObject(object,'se',{x:16,y:8});
    expect(resized.widthIn).toBe(100);
    expect(resized.depthIn).toBe(50);
    expect(resized.x).toBe(200);
    expect(resized.y).toBe(200);
  });

  test('rotation-aware resize keeps the opposite local edge fixed',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:36,depthIn:24,rotation:45});
    const westBefore=localEdgeCenter(object,'w');
    const resized=resizeObject(object,'e',{x:14.1421356,y:14.1421356});
    expect(resized.widthIn).toBeCloseTo(56,1);
    expect(localEdgeCenter(resized,'w').x).toBeCloseTo(westBefore.x,1);
    expect(localEdgeCenter(resized,'w').y).toBeCloseTo(westBefore.y,1);
  });

  test('minimum dimensions prevent an inverted object',()=>{
    const object=objectDefaults('base-cabinet',{widthIn:30,depthIn:24});
    const resized=resizeObject(object,'nw',{x:100,y:100},{minWidthIn:6,minDepthIn:6});
    expect(resized.widthIn).toBe(6);
    expect(resized.depthIn).toBe(6);
    expect(Number.isFinite(resized.x)&&Number.isFinite(resized.y)).toBe(true);
  });

  test('dimension snapping applies after local resize',()=>{
    const object=objectDefaults('base-cabinet',{widthIn:30,depthIn:24});
    const resized=resizeObject(object,'e',{x:7.2,y:0},{snapIncrementIn:3});
    expect(resized.widthIn).toBe(36);
  });

  test('rotation points toward the cursor with angular snap',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:30,depthIn:24});
    const center={x:115,y:112};
    expect(rotateObjectTowardPoint(object,{x:center.x,y:center.y+100},15).rotation).toBe(90);
    expect(rotateObjectTowardPoint(object,{x:center.x+100,y:center.y+25},15).rotation).toBe(15);
  });

  test('nudge supports free movement or grid increments',()=>{
    const object=objectDefaults('base-cabinet',{x:101,y:99});
    expect(nudgeObject(object,{x:1,y:-1})).toMatchObject({x:102,y:98});
    expect(nudgeObject(object,{x:2,y:2},5)).toMatchObject({x:105,y:100});
  });

  test('selection bounds include rotated footprint',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:36,depthIn:24,rotation:90});
    const bounds=selectionBounds(object);
    expect(bounds.width).toBeCloseTo(24);
    expect(bounds.height).toBeCloseTo(36);
    expect(bounds.centerX).toBe(118);
    expect(bounds.centerY).toBe(112);
  });

  test('world/local conversion preserves a vector',()=>{
    const local=worldToLocal({x:Math.SQRT1_2*10,y:Math.SQRT1_2*10},45);
    expect(local.x).toBeCloseTo(10);
    expect(local.y).toBeCloseTo(0);
  });

  test('does not mutate the source object',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:30});
    const before=JSON.stringify(object);
    const resized=resizeObject(object,'e',{x:10,y:0});
    expect(JSON.stringify(object)).toBe(before);
    expect(resized).not.toBe(object);
  });
});
