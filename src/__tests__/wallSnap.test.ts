import { objectDefaults } from '../domain/editor';
import { cabinetBackDistanceToWall, snapObjectToCabinet, snapObjectToKitchen, snapObjectToWall, wallSegment } from '../domain/wallSnap';

describe('wall and cabinet snapping engine',()=>{
  test('aligns a cabinet to a horizontal wall and preserves real dimensions',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:100,widthIn:144,depthIn:4.5,rotation:0});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:30,depthIn:24,rotation:17});
    const result=snapObjectToWall(cabinet,{x:138,y:91},[wall]);
    const snapped={...cabinet,x:result.x,y:result.y,rotation:result.rotation};
    expect(result.wallId).toBe('wall');
    expect(result.rotation).toBe(0);
    expect(cabinetBackDistanceToWall(snapped,wall)).toBeCloseTo(wall.depthIn/2,4);
    expect(snapped.widthIn).toBe(30);
    expect(snapped.depthIn).toBe(24);
  });

  test('aligns to a vertical wall using the wall rotation',()=>{
    const wall=objectDefaults('wall',{id:'vertical',x:300,y:100,widthIn:120,depthIn:5,rotation:90});
    const cabinet=objectDefaults('tall-cabinet',{id:'pantry',widthIn:24,depthIn:24});
    const result=snapObjectToWall(cabinet,{x:290,y:145},[wall]);
    expect(result.wallId).toBe('vertical');
    expect(result.rotation).toBe(90);
    expect(result.guide?.end.y).toBeCloseTo(220,5);
  });

  test('supports angled walls without hardcoded horizontal or vertical math',()=>{
    const wall=objectDefaults('wall',{id:'angle',x:100,y:100,widthIn:120,depthIn:4.5,rotation:45});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:36,depthIn:24});
    const segment=wallSegment(wall);
    const proposed={x:segment.start.x+segment.unit.x*48-10,y:segment.start.y+segment.unit.y*48-10};
    const result=snapObjectToWall(cabinet,proposed,[wall],30);
    expect(result.rotation).toBe(45);
    expect(result.wallId).toBe('angle');
  });

  test('leaves objects unchanged when no wall is within threshold',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:500,y:500,widthIn:120});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet'});
    const result=snapObjectToWall(cabinet,{x:40,y:50},[wall],12);
    expect(result.x).toBe(40);
    expect(result.y).toBe(50);
    expect(result.wallId).toBeUndefined();
    expect(result.distanceIn).toBe(Number.POSITIVE_INFINITY);
  });

  test('joins adjacent cabinet edges on the same run',()=>{
    const target=objectDefaults('base-cabinet',{id:'target',x:100,y:100,widthIn:30,depthIn:24,rotation:0});
    const moving=objectDefaults('base-cabinet',{id:'moving',x:0,y:0,widthIn:24,depthIn:24,rotation:0});
    const result=snapObjectToCabinet(moving,{x:132.5,y:101.5,rotation:0},[target,moving],5);
    expect(result.cabinetId).toBe('target');
    expect(result.x).toBeCloseTo(130,5);
    expect(result.y).toBeCloseTo(100,5);
  });

  test('combines wall orientation and cabinet edge snapping',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:100,widthIn:180,depthIn:4.5,rotation:0});
    const target=objectDefaults('base-cabinet',{id:'target',x:130,y:114.25,widthIn:30,depthIn:24,rotation:0});
    const moving=objectDefaults('base-cabinet',{id:'moving',x:0,y:0,widthIn:24,depthIn:24,rotation:13});
    const result=snapObjectToKitchen(moving,{x:162.5,y:112},[wall,target,moving]);
    expect(result.wallId).toBe('wall');
    expect(result.cabinetId).toBe('target');
    expect(result.rotation).toBe(0);
  });
});
