import { objectDefaults } from '../domain/editor';
import { applyCabinetPlacement, cabinetRunIssues, nearestWallPlacement, normalizeCabinetRun, placeCabinetOnWall } from '../domain/cabinetPlacement';

describe('cabinet wall placement',()=>{
  test('places a base cabinet flush to a horizontal wall and copies rotation',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:80,widthIn:144,depthIn:4.5,rotation:0});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',x:220,y:220,widthIn:30,depthIn:24,rotation:45});
    const placement=placeCabinetOnWall(cabinet,wall,24);
    expect(placement).toMatchObject({wallId:'wall',wallOffsetIn:24,rotation:0});
    expect(placement.x).toBeCloseTo(124);
    expect(placement.y).toBeCloseTo(82.25);
    expect(placement.distanceIn).toBeGreaterThan(0);
  });

  test('clamps a cabinet inside the usable wall length',()=>{
    const wall=objectDefaults('wall',{id:'wall',widthIn:100});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:36});
    expect(placeCabinetOnWall(cabinet,wall,-20).wallOffsetIn).toBe(0);
    expect(placeCabinetOnWall(cabinet,wall,500).wallOffsetIn).toBe(64);
  });

  test('places cabinets correctly on a quarter-turn wall',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:80,y:100,widthIn:120,rotation:90,depthIn:4});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:30,depthIn:24});
    const placement=placeCabinetOnWall(cabinet,wall,20);
    expect(placement.rotation).toBe(90);
    expect(placement.x).toBeLessThan(wall.x);
    expect(placement.y).toBeGreaterThan(wall.y);
  });

  test('finds the nearest wall but respects the maximum distance',()=>{
    const nearWall=objectDefaults('wall',{id:'near',x:100,y:100,widthIn:144});
    const farWall=objectDefaults('wall',{id:'far',x:600,y:600,widthIn:144});
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',x:130,y:130,widthIn:30});
    expect(nearestWallPlacement(cabinet,[farWall,nearWall],100)?.wallId).toBe('near');
    expect(nearestWallPlacement(cabinet,[farWall],40)).toBeUndefined();
  });

  test('normalizes a cabinet run without gaps or overlaps',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:80,widthIn:180});
    const cabinets=[
      objectDefaults('base-cabinet',{id:'a',x:300,y:300,widthIn:24}),
      objectDefaults('drawer-base',{id:'b',x:360,y:330,widthIn:30}),
      objectDefaults('sink-base',{id:'c',x:420,y:360,widthIn:36}),
    ];
    const normalized=normalizeCabinetRun([wall,...cabinets],wall,['a','b','c'],12);
    expect(cabinetRunIssues(normalized,wall,['a','b','c'])).toHaveLength(0);
    const a=normalized.find(object=>object.id==='a')!;
    const b=normalized.find(object=>object.id==='b')!;
    expect(a.rotation).toBe(0);
    expect(b.x-a.x).toBeCloseTo(24);
  });

  test('detects both a gap and an overlap in a run',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:80,widthIn:220});
    const first=objectDefaults('base-cabinet',{id:'a',x:100,y:82.25,widthIn:30});
    const gap=objectDefaults('base-cabinet',{id:'b',x:140,y:82.25,widthIn:30});
    const overlap=objectDefaults('base-cabinet',{id:'c',x:165,y:82.25,widthIn:30});
    const issues=cabinetRunIssues([wall,first,gap,overlap],wall,['a','b','c']);
    expect(issues.map(issue=>issue.type)).toEqual(['gap','overlap']);
    expect(issues[0].amountIn).toBeCloseTo(10);
    expect(issues[1].amountIn).toBeCloseTo(5);
  });

  test('applies only the selected cabinet placement',()=>{
    const wall=objectDefaults('wall',{id:'wall'});
    const a=objectDefaults('base-cabinet',{id:'a'}),b=objectDefaults('base-cabinet',{id:'b',x:400});
    const placement=placeCabinetOnWall(a,wall,30);
    const next=applyCabinetPlacement([wall,a,b],a.id,placement);
    expect(next.find(object=>object.id==='a')?.x).toBe(placement.x);
    expect(next.find(object=>object.id==='b')).toEqual(b);
  });

  test('rejects islands and non-wall targets',()=>{
    const wall=objectDefaults('wall',{id:'wall'});
    expect(()=>placeCabinetOnWall(objectDefaults('island'),wall,0)).toThrow('wall-based cabinets');
    expect(()=>placeCabinetOnWall(objectDefaults('base-cabinet'),objectDefaults('base-cabinet'),0)).toThrow('wall objects');
  });
});
