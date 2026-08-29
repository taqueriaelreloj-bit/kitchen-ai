import { objectDefaults } from '../domain/editor';
import { objectPlanBounds, snapPlanObject } from '../domain/planSnap';

describe('precision 2D plan snapping',()=>{
  test('snaps to 5 inch grid when no nearby alignment wins',()=>{
    const moving=objectDefaults('base-cabinet',{id:'moving',x:0,y:0});
    const result=snapPlanObject(moving,{x:13,y:17},[],{grid:true,gridSizeIn:5});
    expect(result.x).toBe(15);
    expect(result.y).toBe(15);
    expect(result.guides).toHaveLength(0);
  });

  test('joins rendered cabinet edges and returns an alignment guide',()=>{
    const target=objectDefaults('base-cabinet',{id:'target',x:100,y:100,widthIn:30,depthIn:24});
    const moving=objectDefaults('base-cabinet',{id:'moving',x:0,y:0,widthIn:24,depthIn:24});
    const result=snapPlanObject(moving,{x:115.5,y:101.5},[target,moving],{grid:false,toleranceIn:4});
    expect(result.x).toBe(113.5);
    expect(result.y).toBe(100);
    expect(result.guides.some(guide=>guide.axis==='x'&&guide.kind==='edge')).toBe(true);
    expect(result.guides.some(guide=>guide.axis==='y')).toBe(true);
  });

  test('aligns nearby object centers',()=>{
    const target=objectDefaults('island',{id:'target',x:200,y:200,widthIn:84,depthIn:42});
    const moving=objectDefaults('countertop',{id:'moving',x:0,y:0,widthIn:72,depthIn:25.5});
    const targetBounds=objectPlanBounds(target);
    const movingBounds=objectPlanBounds(moving);
    const proposedX=targetBounds.centerX-(movingBounds.right-movingBounds.left)/2+2;
    const result=snapPlanObject(moving,{x:proposedX,y:205},[target],{grid:false,toleranceIn:3});
    expect(objectPlanBounds(moving,result.x,result.y).centerX).toBe(targetBounds.centerX);
    expect(result.guides.some(guide=>guide.kind==='center'&&guide.axis==='x')).toBe(true);
  });

  test('uses the rendered rotated footprint for quarter-turn cabinets',()=>{
    const rotated=objectDefaults('base-cabinet',{id:'rotated',x:100,y:100,widthIn:36,depthIn:24,rotation:90});
    const bounds=objectPlanBounds(rotated);
    expect(bounds.right-bounds.left).toBeCloseTo(10.8,5);
    expect(bounds.bottom-bounds.top).toBeCloseTo(16.2,5);
  });

  test('ignores distant objects outside tolerance',()=>{
    const moving=objectDefaults('base-cabinet',{id:'moving',widthIn:30});
    const distant=objectDefaults('base-cabinet',{id:'distant',x:400,y:400});
    const result=snapPlanObject(moving,{x:41,y:61},[distant],{grid:false,toleranceIn:4});
    expect(result).toEqual({x:41,y:61,guides:[]});
  });

  test('does not align with a target far away on the other axis',()=>{
    const moving=objectDefaults('base-cabinet',{id:'moving',widthIn:30,depthIn:24});
    const distant=objectDefaults('base-cabinet',{id:'distant',x:100,y:500,widthIn:30,depthIn:24});
    const result=snapPlanObject(moving,{x:101,y:40},[distant],{grid:false,toleranceIn:4});
    expect(result.guides.some(guide=>guide.axis==='x')).toBe(false);
    expect(result.x).toBe(101);
  });
});
