import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

const details=(name:string,widthIn=36,heightIn=70,depthIn=30,rotation=0)=>{
  const object=objectDefaults('appliance',{id:`appliance-${name}`,name,widthIn,heightIn,depthIn,rotation,material:'Stainless Steel'});
  return buildSceneBoxes([object]).filter(box=>box.sourceId===object.id&&box.id!==object.id);
};

describe('Appliance details in WebGL scene',()=>{
  test('refrigerator renders doors freezer and handles',()=>{
    const boxes=details('Refrigerator');
    expect(boxes.some(box=>box.id.includes('fridge-left-door'))).toBe(true);
    expect(boxes.some(box=>box.id.includes('fridge-freezer'))).toBe(true);
    expect(boxes.filter(box=>box.id.includes('handle')).length).toBe(2);
  });
  test('range renders oven and cooktop details',()=>{
    const boxes=details('Range',30,36,28);
    expect(boxes.some(box=>box.id.includes('range-oven-door'))).toBe(true);
    expect(boxes.some(box=>box.id.includes('range-cooktop'))).toBe(true);
  });
  test('details inherit appliance rotation',()=>{
    const boxes=details('Refrigerator',36,70,30,90);
    expect(boxes.every(box=>Math.abs(box.rotationY+Math.PI/2)<0.001)).toBe(true);
  });
  test('generic appliance stays as base box only',()=>{
    expect(details('Appliance')).toHaveLength(0);
  });
});
