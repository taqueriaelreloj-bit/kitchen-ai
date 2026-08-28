import { objectDefaults } from '../domain/editor';
import { applianceDetailGeometry } from '../domain/applianceGeometry';

const appliance=(name:string,widthIn=36,heightIn=70,depthIn=30)=>objectDefaults('appliance',{name,widthIn,heightIn,depthIn});

describe('Appliance detail geometry',()=>{
  test('refrigerator has doors, freezer and handles',()=>{
    const parts=applianceDetailGeometry(appliance('Refrigerator'));
    expect(parts.some(part=>part.id==='fridge-left-door')).toBe(true);
    expect(parts.some(part=>part.id==='fridge-freezer')).toBe(true);
    expect(parts.filter(part=>part.id.includes('handle'))).toHaveLength(2);
  });
  test('range has oven door, controls, handle and cooktop',()=>{
    const parts=applianceDetailGeometry(appliance('Range',30,36,28));
    expect(parts.some(part=>part.id==='range-oven-door')).toBe(true);
    expect(parts.some(part=>part.id==='range-cooktop')).toBe(true);
    expect(parts.length).toBeGreaterThanOrEqual(4);
  });
  test('dishwasher gets front and handle',()=>{
    const parts=applianceDetailGeometry(appliance('Dishwasher',24,34,24));
    expect(parts.map(part=>part.id)).toEqual(expect.arrayContaining(['dishwasher-front','dishwasher-handle']));
  });
  test('generic appliances remain generic',()=>{
    expect(applianceDetailGeometry(appliance('Appliance'))).toEqual([]);
  });
});
