import {
  APPLIANCE_COLORS, APPLIANCE_MODELS, applianceSpec, appliancesByCategory,
  createCatalogAppliance, isCatalogAppliance, updateApplianceColor,
} from '../domain/applianceCatalog';
import { createEditorProject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`catalog-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional appliance catalog',()=>{
  test('contains three real-size gas range choices',()=>{
    const ranges=appliancesByCategory('Gas Ranges');
    expect(ranges).toHaveLength(3);
    expect(ranges.map(model=>model.widthIn)).toEqual([30,36,48]);
    expect(ranges.every(model=>(model.burnerCount??0)>=5)).toBe(true);
  });

  test('contains four refrigerator configurations and one dishwasher',()=>{
    expect(appliancesByCategory('Refrigerators')).toHaveLength(4);
    expect(appliancesByCategory('Dishwashers')).toHaveLength(1);
    expect(appliancesByCategory('Refrigerators').some(model=>model.installation==='Built-In')).toBe(true);
  });

  test('creates a true editable appliance with stainless default',()=>{
    const range=createCatalogAppliance('gas-range-36-pro',{id:'range',x:210,y:150});
    expect(range.kind).toBe('appliance');
    expect(range.widthIn).toBe(36);
    expect(range.heightIn).toBe(36);
    expect(range.depthIn).toBe(28.5);
    expect(range.material).toContain('Stainless');
    expect(isCatalogAppliance(range)).toBe(true);
    expect(applianceSpec(range)).toMatchObject({modelId:'gas-range-36-pro',burnerCount:6,ovenCount:1});
  });

  test('uses stainless steel by default across the catalog',()=>{
    for(const model of APPLIANCE_MODELS){
      const object=createCatalogAppliance(model.id);
      expect(applianceSpec(object)?.colorId).toContain('stainless');
    }
  });

  test('changes only to an available finish and persists metadata',()=>{
    const appliance=createCatalogAppliance('gas-range-30-freestanding',{id:'range'});
    let project=createEditorProject(room,design);
    project={...project,objects:[...project.objects,appliance],selectedId:appliance.id};
    project=updateApplianceColor(project,appliance.id,'matte-black');
    const changed=project.objects.find(object=>object.id===appliance.id)!;
    expect(applianceSpec(changed)?.colorId).toBe('matte-black');
    expect(changed.color).toBe(APPLIANCE_COLORS.find(color=>color.id==='matte-black')?.color);
    const unchanged=updateApplianceColor(project,appliance.id,'white');
    expect(applianceSpec(unchanged.objects.find(object=>object.id===appliance.id)!)?.colorId).toBe('white');
  });

  test('catalog identifiers are unique and dimensions are positive',()=>{
    expect(new Set(APPLIANCE_MODELS.map(model=>model.id)).size).toBe(APPLIANCE_MODELS.length);
    expect(APPLIANCE_MODELS.every(model=>model.widthIn>0&&model.heightIn>0&&model.depthIn>0)).toBe(true);
  });
});
