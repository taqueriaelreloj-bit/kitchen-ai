import { applianceSpec, createCatalogAppliance, updateApplianceColor } from '../domain/applianceCatalog';
import { createEditorProject, duplicateObject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`appliance-save-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('appliance catalog project persistence',()=>{
  test('preserves model and selected finish after save and load',()=>{
    const range=createCatalogAppliance('gas-range-48-double',{id:'client-range',x:220,y:150});
    let project=createEditorProject(room,design);
    project={...project,objects:[...project.objects,range],selectedId:range.id};
    project=updateApplianceColor(project,range.id,'matte-black');
    const loaded=parseProject(serializeProject(project))!;
    const restored=loaded.objects.find(object=>object.id===range.id)!;
    expect(applianceSpec(restored)).toMatchObject({modelId:'gas-range-48-double',colorId:'matte-black',burnerCount:8,ovenCount:2});
    expect(restored.widthIn).toBe(48);
    expect(restored.color).toBe(project.objects.find(object=>object.id===range.id)?.color);
  });

  test('duplicates appliance metadata without sharing nested references',()=>{
    const refrigerator=createCatalogAppliance('refrigerator-36-counter-depth',{id:'client-fridge'});
    let project=createEditorProject(room,design);
    project={...project,objects:[refrigerator],selectedId:refrigerator.id};
    project=duplicateObject(project,refrigerator.id);
    const copy=project.objects.find(object=>object.id===project.selectedId)!;
    expect(copy.id).not.toBe(refrigerator.id);
    expect(applianceSpec(copy)).toEqual(applianceSpec(refrigerator));
    expect(applianceSpec(copy)).not.toBe(applianceSpec(refrigerator));
  });

  test('old generic appliances load without requiring catalog metadata',()=>{
    const generic={...createCatalogAppliance('dishwasher-24-standard',{id:'legacy'}),applianceSpec:undefined,name:'Legacy Appliance'} as any;
    let project=createEditorProject(room,design);
    project={...project,objects:[generic]};
    const loaded=parseProject(serializeProject(project))!;
    expect(loaded.objects[0].name).toBe('Legacy Appliance');
    expect(applianceSpec(loaded.objects[0])).toBeUndefined();
  });
});
