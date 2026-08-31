import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

describe('continuous countertop WebGL geometry',()=>{
  test('renders one shared slab for contiguous base cabinets',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'counter-a',x:100,y:100,widthIn:24}),
      objectDefaults('drawer-base',{id:'counter-b',x:124,y:100,widthIn:30}),
      objectDefaults('sink-base',{id:'counter-c',x:154,y:100,widthIn:36}),
    ];
    const boxes=buildSceneBoxes(cabinets);
    const slabs=boxes.filter(box=>box.kind==='countertop'&&box.id.startsWith('counter-run-')&&!box.id.includes('backsplash'));
    expect(slabs).toHaveLength(1);
    expect(slabs[0].size[0]).toBeGreaterThan(90/24);
    expect(boxes.some(box=>box.id.includes('counter-a-counter-cap'))).toBe(false);
    expect(boxes.some(box=>box.id.includes('counter-b-counter-cap'))).toBe(false);
    expect(boxes.some(box=>box.id.includes('counter-c-counter-cap'))).toBe(false);
  });

  test('keeps separate slabs across a real gap',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'gap-a',x:100,y:100,widthIn:30}),
      objectDefaults('base-cabinet',{id:'gap-b',x:140,y:100,widthIn:30}),
    ];
    const slabs=buildSceneBoxes(cabinets).filter(box=>box.kind==='countertop'&&box.id.startsWith('counter-run-')&&!box.id.includes('backsplash'));
    expect(slabs).toHaveLength(2);
  });

  test('places a sink fixture in the shared slab over a sink base',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'fixture-a',x:100,y:100,widthIn:30}),
      objectDefaults('sink-base',{id:'fixture-sink',x:130,y:100,widthIn:36}),
    ];
    const boxes=buildSceneBoxes(cabinets);
    const sink=boxes.find(box=>box.kind==='fixture'&&box.sourceId==='fixture-sink');
    expect(sink).toBeDefined();
    expect(sink?.id).toContain('sink');
  });
});
