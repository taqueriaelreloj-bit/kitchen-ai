import { createEditorProject } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { COLOR_TEMPERATURES, createLighting, kelvinColor, lightingData, updateLighting } from '../domain/lighting';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Kitchen lighting',()=>{
  test('provides common color temperatures',()=>expect(COLOR_TEMPERATURES).toEqual([2700,3000,3500,4000,5000]));
  test('creates distinct recessed pendant and under-cabinet defaults',()=>{
    expect(lightingData(createLighting('Recessed')).diameterIn).toBe(6);
    expect(lightingData(createLighting('Pendant')).dropIn).toBe(30);
    expect(lightingData(createLighting('Under Cabinet')).lengthIn).toBe(24);
  });
  test('updates lighting properties through project history-compatible data',()=>{
    const light=createLighting('Pendant',{id:'pendant'});let project=createEditorProject(room,design);project={...project,objects:[light]};
    project=updateLighting(project,'pendant',{colorTemperatureK:4000,intensityPercent:55,dropIn:36});
    expect(lightingData(project.objects[0])).toMatchObject({colorTemperatureK:4000,intensityPercent:55,dropIn:36});
    expect(project.objects[0].heightIn).toBe(36);
  });
  test('renders lighting-specific WebGL boxes instead of appliance blocks',()=>{
    const recessed=createLighting('Recessed',{id:'recessed'}),pendant=createLighting('Pendant',{id:'pendant'}),under=createLighting('Under Cabinet',{id:'under'});
    const boxes=buildSceneBoxes([recessed,pendant,under]);
    expect(boxes.some(box=>box.id==='recessed'&&box.kind==='lighting')).toBe(true);
    expect(boxes.some(box=>box.id==='recessed-glow')).toBe(true);
    expect(boxes.some(box=>box.id==='pendant-stem')).toBe(true);
    expect(boxes.some(box=>box.id==='under'&&box.kind==='lighting')).toBe(true);
  });
  test('warmer kelvin is visually different from daylight',()=>expect(kelvinColor(2700)).not.toBe(kelvinColor(5000)));
});
