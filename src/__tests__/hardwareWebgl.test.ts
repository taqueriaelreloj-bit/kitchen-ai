import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

const cabinet=(id:string,style:string,rotation=0)=>objectDefaults('base-cabinet',{id,rotation,hardware:{style,size:'5 inches',finishId:'brushed-nickel',position:'Center'}});
const hardwareBoxes=(id:string,style:string,rotation=0)=>buildSceneBoxes([cabinet(id,style,rotation)]).filter(box=>box.kind==='hardware'&&box.sourceId===id);

describe('Hardware shapes in WebGL scene',()=>{
  test('round knob renders one hardware box',()=>{
    expect(hardwareBoxes('knob','Round Knob')).toHaveLength(1);
  });
  test('bar pull renders bar plus mounts',()=>{
    const boxes=hardwareBoxes('bar','Bar Pull');
    expect(boxes.length).toBeGreaterThanOrEqual(3);
    expect(boxes.some(box=>box.id.includes('hardware-bar'))).toBe(true);
  });
  test('cup pull differs from round knob',()=>{
    const cup=hardwareBoxes('cup','Cup Pull');
    const knob=hardwareBoxes('knob2','Round Knob');
    expect(cup.length).toBeGreaterThan(knob.length);
  });
  test('hardware follows cabinet rotation',()=>{
    const boxes=hardwareBoxes('rotated','Bar Pull',90);
    expect(boxes.every(box=>Math.abs(box.rotationY+Math.PI/2)<0.001)).toBe(true);
  });
  test('No Hardware adds no hardware boxes',()=>{
    expect(hardwareBoxes('none','No Hardware')).toHaveLength(0);
  });
});
