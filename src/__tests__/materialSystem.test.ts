import { CABINET_FINISHES, HARDWARE_FINISHES } from '../domain/catalogs';
import { createCountertop } from '../domain/countertops';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import {
  applyCabinetFinishType, cabinetFinishType, materialCacheKey, resolveCabinetMaterial,
  resolveHardwareMaterial, resolveObjectMaterial, resolveWallMaterial,
} from '../domain/materialSystem';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`material-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('unified PBR material system',()=>{
  test('resolves painted and wood cabinet finishes differently',()=>{
    const paint=CABINET_FINISHES.find(item=>item.name==='Warm White')!;
    const wood=CABINET_FINISHES.find(item=>item.name==='White Oak')!;
    const painted=resolveCabinetMaterial(objectDefaults('base-cabinet',{finishId:paint.id,color:paint.baseColor}));
    const oak=resolveCabinetMaterial(objectDefaults('base-cabinet',{finishId:wood.id,color:wood.baseColor}));
    expect(painted.category).toBe('paint');
    expect(painted.textureKey).toBeUndefined();
    expect(oak.category).toBe('wood');
    expect(oak.textureKey).toContain('wood-');
    expect(oak.normalMapKey).toContain('wood-normal-');
    expect(oak.grainDirection).toBe('vertical');
  });

  test('finish type controls surface roughness',()=>{
    const finish=CABINET_FINISHES.find(item=>item.name==='Warm White')!;
    const matte=resolveCabinetMaterial(objectDefaults('base-cabinet',{finishId:finish.id,cabinetFinishType:'Matte'} as any));
    const gloss=resolveCabinetMaterial(objectDefaults('base-cabinet',{finishId:finish.id,cabinetFinishType:'Gloss'} as any));
    expect(matte.roughness).toBeGreaterThan(gloss.roughness);
    expect(cabinetFinishType(objectDefaults('base-cabinet',{cabinetFinishType:'Gloss'} as any))).toBe('Gloss');
  });

  test('resolves hardware metal, paint, glass and wood properties',()=>{
    const chrome=resolveHardwareMaterial(HARDWARE_FINISHES.find(item=>item.name==='Polished Chrome')!.id);
    const black=resolveHardwareMaterial(HARDWARE_FINISHES.find(item=>item.name==='Matte Black')!.id);
    const glass=resolveHardwareMaterial(HARDWARE_FINISHES.find(item=>item.name==='Clear Glass')!.id);
    const wood=resolveHardwareMaterial(HARDWARE_FINISHES.find(item=>item.name==='Wood')!.id);
    expect(chrome.metalness).toBeGreaterThan(.9);
    expect(chrome.roughness).toBeLessThan(black.roughness);
    expect(glass.transparent).toBe(true);
    expect(glass.opacity).toBeLessThan(1);
    expect(wood.category).toBe('wood');
  });

  test('resolves wall paint, stone and window glass descriptors',()=>{
    const wall=resolveWallMaterial(objectDefaults('wall',{wallPaintId:'evergreen-fog',color:'#959A88'}));
    const counter=resolveObjectMaterial(createCountertop({id:'counter'}));
    const window=resolveObjectMaterial(objectDefaults('window',{id:'window'}));
    expect(wall.category).toBe('wall');
    expect(wall.roughness).toBeGreaterThan(.8);
    expect(counter.category).toBe('stone');
    expect(counter.textureKey).toContain('stone-');
    expect(window.category).toBe('glass');
    expect(window.transparent).toBe(true);
  });

  test('distinguishes brushed stainless, matte black and white appliance finishes',()=>{
    const brushed=resolveObjectMaterial(objectDefaults('appliance',{name:'Range',material:'Brushed Stainless Steel',color:'#9DA5A6'}));
    const black=resolveObjectMaterial(objectDefaults('appliance',{name:'Range',material:'Matte Black',color:'#202323'}));
    const white=resolveObjectMaterial(objectDefaults('appliance',{name:'Range',material:'White',color:'#F1F1ED'}));
    expect(brushed.category).toBe('metal');
    expect(brushed.textureKey).toBe('brushed-stainless');
    expect(black.roughness).toBeGreaterThan(brushed.roughness);
    expect(white.metalness).toBeLessThan(brushed.metalness);
  });

  test('applies finish type by cabinet scope',()=>{
    const base=objectDefaults('base-cabinet',{id:'base'});
    const upper=objectDefaults('wall-cabinet',{id:'upper'});
    const island=objectDefaults('island',{id:'island'});
    let project=createEditorProject(room,design);
    project={...project,objects:[base,upper,island],selectedId:'base'};
    project=applyCabinetFinishType(project,'Matte','base');
    expect(cabinetFinishType(project.objects.find(object=>object.id==='base')!)).toBe('Matte');
    expect(cabinetFinishType(project.objects.find(object=>object.id==='upper')!)).not.toBe('Matte');
    project=applyCabinetFinishType(project,'Gloss','all');
    expect(project.objects.every(object=>cabinetFinishType(object)==='Gloss')).toBe(true);
  });

  test('produces stable cache keys and changes when PBR values change',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet'});
    const first=resolveCabinetMaterial(cabinet);
    const second=resolveCabinetMaterial(cabinet);
    const gloss=resolveCabinetMaterial({...cabinet,cabinetFinishType:'Gloss'} as any);
    expect(materialCacheKey(first)).toBe(materialCacheKey(second));
    expect(materialCacheKey(first)).not.toBe(materialCacheKey(gloss));
  });
});
