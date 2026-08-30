import {
  APPLIANCE_CATALOG,
  APPLIANCE_FINISHES,
  applianceData,
  applianceFrontParts,
  changeApplianceFinish,
  createAppliance,
  isKitchenAppliance,
  updateAppliance,
} from '../domain/appliances';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { createLighting } from '../domain/lighting';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`appliance-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional appliance catalog',()=>{
  test('contains the core kitchen appliance families',()=>{
    expect(APPLIANCE_CATALOG.map(item=>item.type)).toEqual(['Refrigerator','Range','Cooktop','Wall Oven','Microwave','Dishwasher','Range Hood','Wine Cooler']);
    expect(APPLIANCE_FINISHES.some(item=>item.id==='panel-ready')).toBe(true);
  });

  test('creates appliances with market dimensions and saved specs',()=>{
    const refrigerator=createAppliance('Refrigerator',{id:'fridge'}),dishwasher=createAppliance('Dishwasher',{id:'dw'});
    expect(refrigerator).toMatchObject({id:'fridge',kind:'appliance',name:'Refrigerator',widthIn:36,heightIn:70});
    expect(applianceData(refrigerator)).toMatchObject({type:'Refrigerator',installation:'Counter-Depth',configuration:'French Door'});
    expect(dishwasher).toMatchObject({widthIn:24,heightIn:34});
    expect(applianceData(dishwasher).installation).toBe('Under-Counter');
  });

  test('excludes kitchen lighting stored in the shared appliance object kind',()=>{
    expect(isKitchenAppliance(createLighting('Pendant'))).toBe(false);
    expect(isKitchenAppliance(createAppliance('Range'))).toBe(true);
  });

  test('updates appliance type and dimensions as one project change',()=>{
    let project=createEditorProject(room,design),appliance=createAppliance('Refrigerator',{id:'selected-appliance'});
    project={...project,objects:[...project.objects,appliance],selectedId:appliance.id};
    project=updateAppliance(project,appliance.id,{type:'Wall Oven',installation:'Built-In',configuration:'Double Oven'});
    appliance=project.objects.find(object=>object.id==='selected-appliance')!;
    expect(appliance).toMatchObject({name:'Wall Oven',widthIn:30,depthIn:24,heightIn:29});
    expect(applianceData(appliance)).toMatchObject({type:'Wall Oven',installation:'Built-In',configuration:'Double Oven'});
  });

  test('applies market finishes and panel-ready state',()=>{
    let project=createEditorProject(room,design),dishwasher=createAppliance('Dishwasher',{id:'dw'});
    project={...project,objects:[...project.objects,dishwasher],selectedId:dishwasher.id};
    project=changeApplianceFinish(project,dishwasher.id,'panel-ready');
    dishwasher=project.objects.find(object=>object.id==='dw')!;
    expect(applianceData(dishwasher)).toMatchObject({finishId:'panel-ready',panelReady:true});
    expect(dishwasher.material).toBe('Panel Ready');
    expect(dishwasher.color).toBe('#D9D4CA');
  });

  test('infers legacy appliances without a specification',()=>{
    expect(applianceData(objectDefaults('appliance',{name:'Client Refrigerator',material:'Black Stainless Steel'}))).toMatchObject({type:'Refrigerator',finishId:'black-stainless'});
    expect(applianceData(objectDefaults('appliance',{name:'30 in Range'})).type).toBe('Range');
  });

  test('creates distinct front geometry for each appliance family',()=>{
    const refrigerator=applianceFrontParts(createAppliance('Refrigerator'));
    const range=applianceFrontParts(createAppliance('Range'));
    const cooktop=applianceFrontParts(createAppliance('Cooktop'));
    const dishwasher=applianceFrontParts(createAppliance('Dishwasher'));
    const hood=applianceFrontParts(createAppliance('Range Hood'));
    expect(refrigerator.some(part=>part.id==='freezer')).toBe(true);
    expect(range.some(part=>part.id==='oven-door')&&range.some(part=>part.id==='cooktop')).toBe(true);
    expect(cooktop.filter(part=>part.id.startsWith('burner-'))).toHaveLength(5);
    expect(dishwasher.some(part=>part.id==='front')).toBe(true);
    expect(hood.some(part=>part.id==='chimney')).toBe(true);
  });

  test('persists appliance specification through save and load',()=>{
    let project=createEditorProject(room,design),appliance=createAppliance('Wine Cooler',{id:'wine'});
    project={...project,objects:[...project.objects,appliance],selectedId:appliance.id};
    project=updateAppliance(project,appliance.id,{finishId:'black-stainless',handleStyle:'Integrated',configuration:'Dual Zone'});
    const loaded=parseProject(serializeProject(project))!,saved=loaded.objects.find(object=>object.id==='wine')!;
    expect(applianceData(saved)).toMatchObject({type:'Wine Cooler',finishId:'black-stainless',handleStyle:'Integrated',configuration:'Dual Zone'});
  });

  test('ignores updates to non-appliance objects',()=>{
    const project=createEditorProject(room,design);
    expect(updateAppliance(project,'wall-north',{type:'Microwave'})).toBe(project);
    expect(applianceFrontParts(project.objects.find(object=>object.id==='wall-north')!)).toEqual([]);
  });
});
