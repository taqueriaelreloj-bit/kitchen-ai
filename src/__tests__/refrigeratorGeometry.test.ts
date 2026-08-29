import { createCatalogAppliance, updateApplianceColor } from '../domain/applianceCatalog';
import { createEditorProject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { refrigeratorGeometry } from '../domain/refrigeratorGeometry';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`fridge-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional refrigerator geometry',()=>{
  test('French-door models create two upper doors and a freezer drawer',()=>{
    for(const modelId of ['refrigerator-36-french-door','refrigerator-36-counter-depth'] as const){
      const geometry=refrigeratorGeometry(createCatalogAppliance(modelId))!;
      expect(geometry.parts.filter(part=>part.kind==='door')).toHaveLength(2);
      expect(geometry.parts.filter(part=>part.kind==='freezer-drawer')).toHaveLength(1);
      expect(geometry.parts.filter(part=>part.kind==='handle')).toHaveLength(3);
    }
  });

  test('side-by-side model creates two full-height doors and dispenser',()=>{
    const geometry=refrigeratorGeometry(createCatalogAppliance('refrigerator-36-side-by-side'))!;
    expect(geometry.configuration).toBe('Side by Side');
    expect(geometry.parts.filter(part=>part.kind==='door')).toHaveLength(2);
    expect(geometry.parts.filter(part=>part.kind==='freezer-drawer')).toHaveLength(0);
    expect(geometry.parts.filter(part=>part.kind==='dispenser')).toHaveLength(1);
    expect(geometry.parts.filter(part=>part.kind==='handle')).toHaveLength(2);
  });

  test('built-in refrigerator includes a professional top grille',()=>{
    const geometry=refrigeratorGeometry(createCatalogAppliance('refrigerator-42-built-in'))!;
    expect(geometry.heightIn).toBe(84);
    expect(geometry.parts.some(part=>part.id==='top-grille')).toBe(true);
    expect(geometry.parts.filter(part=>part.id.startsWith('grille-slot-'))).toHaveLength(7);
  });

  test('counter-depth model remains shallower than full-depth model',()=>{
    const full=refrigeratorGeometry(createCatalogAppliance('refrigerator-36-french-door'))!;
    const counter=refrigeratorGeometry(createCatalogAppliance('refrigerator-36-counter-depth'))!;
    expect(counter.depthIn).toBeLessThan(full.depthIn);
    expect(counter.widthIn).toBe(full.widthIn);
  });

  test('selected finish propagates to doors and freezer',()=>{
    const refrigerator=createCatalogAppliance('refrigerator-36-french-door',{id:'refrigerator'});
    let project=createEditorProject(room,design);
    project={...project,objects:[refrigerator],selectedId:refrigerator.id};
    project=updateApplianceColor(project,refrigerator.id,'black-stainless');
    const changed=project.objects[0],geometry=refrigeratorGeometry(changed)!;
    expect(geometry.parts.filter(part=>part.kind==='door'||part.kind==='freezer-drawer').every(part=>part.color===changed.color)).toBe(true);
  });

  test('returns undefined for non-refrigerator catalog appliances',()=>{
    expect(refrigeratorGeometry(createCatalogAppliance('gas-range-30-freestanding'))).toBeUndefined();
    expect(refrigeratorGeometry(createCatalogAppliance('dishwasher-24-standard'))).toBeUndefined();
  });
});
