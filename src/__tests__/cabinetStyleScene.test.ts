import { DEFAULT_CABINET_STYLE } from '../domain/cabinetStyles';
import { buildStyledCabinetSceneBoxes } from '../domain/cabinetStyleScene';
import { objectDefaults } from '../domain/editor';

describe('cabinet style 3D scene integration',()=>{
  test('replaces generic cabinet-door boxes with styled Shaker parts',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'base',widthIn:36});
    const boxes=buildStyledCabinetSceneBoxes([cabinet]);
    const fronts=boxes.filter(box=>box.sourceId==='base'&&box.kind==='cabinet-door');
    expect(fronts.length).toBeGreaterThan(8);
    expect(fronts.some(box=>box.id==='base-door-0'||box.id==='base-door-1')).toBe(false);
    expect(fronts.every(box=>box.id.startsWith('base-styled-'))).toBe(true);
  });

  test('Slab creates fewer front boxes than Shaker',()=>{
    const shaker=objectDefaults('base-cabinet',{id:'shaker',widthIn:36});
    const slab={...objectDefaults('base-cabinet',{id:'slab',widthIn:36}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Slab'}} as any;
    const shakerCount=buildStyledCabinetSceneBoxes([shaker]).filter(box=>box.kind==='cabinet-door').length;
    const slabCount=buildStyledCabinetSceneBoxes([slab]).filter(box=>box.kind==='cabinet-door').length;
    expect(slabCount).toBe(2);
    expect(shakerCount).toBeGreaterThan(slabCount);
  });

  test('Glass Frame emits glass material geometry',()=>{
    const glass={...objectDefaults('wall-cabinet',{id:'glass',widthIn:36}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Glass Frame'}} as any;
    const boxes=buildStyledCabinetSceneBoxes([glass]).filter(box=>box.sourceId==='glass'&&box.kind==='cabinet-door');
    expect(boxes.some(box=>box.color==='#AFCFDA'&&box.roughness<.1)).toBe(true);
  });

  test('styled fronts follow cabinet rotation and source selection ID',()=>{
    const cabinet={...objectDefaults('base-cabinet',{id:'rotated',rotation:90}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Raised Panel'}} as any;
    const boxes=buildStyledCabinetSceneBoxes([cabinet]).filter(box=>box.kind==='cabinet-door');
    expect(boxes.every(box=>box.sourceId==='rotated')).toBe(true);
    expect(boxes.every(box=>box.rotationY).toBe(-Math.PI/2));
  });

  test('preserves cabinet body, countertop, toe kick and hardware geometry',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'base'});
    const boxes=buildStyledCabinetSceneBoxes([cabinet]);
    expect(boxes.some(box=>box.sourceId==='base'&&box.kind==='cabinet')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='base'&&box.kind==='countertop')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='base'&&box.kind==='hardware')).toBe(true);
    expect(boxes.some(box=>box.kind==='toe-kick')).toBe(true);
  });

  test('non-cabinet geometry stays unchanged',()=>{
    const wall=objectDefaults('wall',{id:'wall'}),appliance=objectDefaults('appliance',{id:'appliance'});
    const boxes=buildStyledCabinetSceneBoxes([wall,appliance]);
    expect(boxes.some(box=>box.sourceId==='wall'&&box.kind==='wall')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='appliance'&&box.kind==='appliance')).toBe(true);
    expect(boxes.some(box=>box.kind==='cabinet-door')).toBe(false);
  });
});
