import { objectDefaults } from '../domain/editor';
import { findIslandPosition, footprintGap, hasIslandClearance, objectFootprint } from '../domain/layoutValidation';

describe('Kitchen layout clearance',()=>{
  test('computes rotated cabinet footprints',()=>{
    const cabinet=objectDefaults('base-cabinet',{x:100,y:100,widthIn:36,depthIn:24,rotation:90});
    const footprint=objectFootprint(cabinet);
    expect(Math.round(footprint.right-footprint.left)).toBe(24);
    expect(Math.round(footprint.bottom-footprint.top)).toBe(36);
  });
  test('measures clear gap between footprints',()=>{
    expect(footprintGap({left:0,top:0,right:24,bottom:24},{left:60,top:0,right:84,bottom:24})).toBe(36);
  });
  test('rejects an island closer than minimum aisle',()=>{
    const cabinet=objectDefaults('base-cabinet',{x:120,y:120,widthIn:72,depthIn:24});
    expect(hasIslandClearance({x:120,y:170},72,42,[cabinet],36)).toBe(false);
    expect(hasIslandClearance({x:120,y:180},72,42,[cabinet],36)).toBe(true);
  });
  test('finds a centered or nearby island position when room permits',()=>{
    const cabinets=[objectDefaults('base-cabinet',{x:120,y:120,widthIn:120,depthIn:24})];
    const position=findIslandPosition(cabinets,180,210,72,42,36);
    expect(position).toBeTruthy();
    if(position)expect(hasIslandClearance(position,72,42,cabinets,36)).toBe(true);
  });
  test('omits island when no valid clearance exists',()=>{
    const cabinets=[objectDefaults('base-cabinet',{x:120,y:120,widthIn:96,depthIn:24}),objectDefaults('base-cabinet',{x:120,y:180,widthIn:96,depthIn:24})];
    expect(findIslandPosition(cabinets,96,96,72,42,36)).toBeUndefined();
  });
});
