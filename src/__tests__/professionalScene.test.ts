import { createAppliance } from '../domain/appliances';
import { DEFAULT_CABINET_STYLE } from '../domain/cabinetStyles';
import { objectDefaults } from '../domain/editor';
import { attachOpening } from '../domain/openings';
import { DEFAULT_OPENING_STYLE } from '../domain/openingStyles';
import { buildProfessionalSceneBoxes, duplicateSceneBoxIds, sceneBoxCounts } from '../domain/professionalScene';
import { DEFAULT_TOE_KICK_PROFILE } from '../domain/toeKickProfiles';

describe('composed professional 3D scene',()=>{
  test('combines styled cabinetry, toe kicks, appliances, openings and continuous countertops',()=>{
    const wall=objectDefaults('wall',{id:'wall',x:100,y:80,widthIn:180});
    const a={...objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Shaker'},toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Continuous'}} as any;
    const b={...objectDefaults('sink-base',{id:'b',x:130,y:100,widthIn:36}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Glass Frame'},toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Continuous'}} as any;
    const refrigerator=createAppliance('Refrigerator',{id:'fridge',x:200,y:100});
    let door={...objectDefaults('door',{id:'door'}),openingStyleSpec:{...DEFAULT_OPENING_STYLE,doorStyle:'Full Glass Door'}} as any;
    let objects=[wall,a,b,refrigerator,door];
    let project={version:2,id:'scene',name:'Scene',room:{} as any,design:{} as any,objects,viewMode:'3d',view2d:{} as any,camera3d:{} as any,catalogState:{} as any,updatedAt:''} as any;
    project=attachOpening(project,door.id,wall.id,24);objects=project.objects;
    const boxes=buildProfessionalSceneBoxes(objects),counts=sceneBoxCounts(boxes);
    expect(counts.wall).toBeGreaterThan(0);
    expect(counts['cabinet-door']).toBeGreaterThan(8);
    expect(counts['toe-kick']).toBe(1);
    expect(boxes.some(box=>box.id.includes('continuous-countertop'))).toBe(true);
    expect(boxes.some(box=>box.id==='fridge-catalog-freezer')).toBe(true);
    expect(boxes.some(box=>box.id.includes('door-styled-door-glass'))).toBe(true);
  });

  test('does not retain generic cabinet fronts beside styled fronts',()=>{
    const cabinet={...objectDefaults('base-cabinet',{id:'cabinet'}),cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Raised Panel'}} as any;
    const boxes=buildProfessionalSceneBoxes([cabinet]);
    expect(boxes.some(box=>box.id==='cabinet-door-0'||box.id==='cabinet-door-1')).toBe(false);
    expect(boxes.some(box=>box.id.startsWith('cabinet-styled-'))).toBe(true);
  });

  test('uses profile toe-kick geometry instead of legacy toe-kick boxes',()=>{
    const cabinet={...objectDefaults('base-cabinet',{id:'legs'}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Furniture Legs'}} as any;
    const boxes=buildProfessionalSceneBoxes([cabinet]),toe=boxes.filter(box=>box.kind==='toe-kick');
    expect(toe).toHaveLength(4);
    expect(toe.every(box=>box.id.includes('leg-'))).toBe(true);
  });

  test('uses catalog appliance details once',()=>{
    const range=createAppliance('Range',{id:'range'}),boxes=buildProfessionalSceneBoxes([range]);
    expect(boxes.filter(box=>box.id==='range-catalog-oven-door')).toHaveLength(1);
    expect(boxes.filter(box=>box.sourceId==='range'&&box.id!=='range'&&!box.id.startsWith('range-catalog-'))).toHaveLength(0);
  });

  test('uses styled opening geometry once and preserves wall cutout segments',()=>{
    const wall=objectDefaults('wall',{id:'wall',widthIn:144}),window={...objectDefaults('window',{id:'window'}),openingStyleSpec:{...DEFAULT_OPENING_STYLE,windowStyle:'Slider'}} as any;
    let project={version:2,id:'scene',name:'Scene',room:{} as any,design:{} as any,objects:[wall,window],viewMode:'3d',view2d:{} as any,camera3d:{} as any,catalogState:{} as any,updatedAt:''} as any;
    project=attachOpening(project,window.id,wall.id,24);
    const boxes=buildProfessionalSceneBoxes(project.objects);
    expect(boxes.some(box=>box.id.includes('window-styled-center-mullion'))).toBe(true);
    expect(boxes.filter(box=>box.sourceId==='window'&&box.id==='window')).toHaveLength(0);
    expect(boxes.some(box=>box.sourceId==='wall'&&box.kind==='wall')).toBe(true);
  });

  test('contains no duplicate scene box IDs in a mixed kitchen',()=>{
    const objects=[objectDefaults('wall',{id:'wall'}),objectDefaults('base-cabinet',{id:'base'}),createAppliance('Dishwasher',{id:'dw'}),objectDefaults('island',{id:'island'})];
    expect(duplicateSceneBoxIds(buildProfessionalSceneBoxes(objects))).toEqual([]);
  });

  test('keeps lighting and unrelated objects from the base scene',()=>{
    const light={...objectDefaults('appliance',{id:'light',name:'Pendant Light',material:'Kitchen Lighting'}),lightingSpec:{type:'Pendant',colorTemperatureK:3000,intensityPercent:80,diameterIn:10,lengthIn:10,dropIn:30,enabled:true}} as any;
    const boxes=buildProfessionalSceneBoxes([light]);
    expect(boxes.some(box=>box.sourceId==='light'&&box.kind==='lighting')).toBe(true);
  });
});
