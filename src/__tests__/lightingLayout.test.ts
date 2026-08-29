import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { createLighting, isLighting, lightingData } from '../domain/lighting';
import {
  applyAutomaticLighting, automaticLightingCounts, generateAutomaticLighting, lightingRoomBounds,
} from '../domain/lightingLayout';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`lighting-layout-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

const project=()=>createEditorProject(room,design,'Lighting Kitchen');

describe('automatic kitchen lighting layouts',()=>{
  test('uses actual wall bounds when walls exist',()=>{
    const current=project();
    const bounds=lightingRoomBounds(current);
    expect(bounds.width).toBeGreaterThan(100);
    expect(bounds.height).toBeGreaterThan(100);
    expect(bounds.right).toBeGreaterThan(bounds.left);
    expect(bounds.bottom).toBeGreaterThan(bounds.top);
  });

  test('creates a balanced recessed grid based on room size',()=>{
    const current=project();
    const plan=generateAutomaticLighting(current,{pendants:false,underCabinet:false,recessedSpacingIn:54});
    expect(plan.recessedCount).toBeGreaterThanOrEqual(4);
    expect(plan.pendantCount).toBe(0);
    expect(plan.underCabinetCount).toBe(0);
    expect(plan.generated.every(isLighting)).toBe(true);
    expect(new Set(plan.generated.map(object=>`${Math.round(object.x)},${Math.round(object.y)}`)).size).toBe(plan.generated.length);
  });

  test('places two or three pendants along an island',()=>{
    let current=project();
    const island=objectDefaults('island',{id:'lighting-island',x:220,y:220,widthIn:84,depthIn:42,rotation:30});
    current={...current,objects:[...current.objects,island]};
    const plan=generateAutomaticLighting(current,{recessed:false,underCabinet:false,pendants:true});
    expect(plan.pendantCount).toBe(3);
    expect(plan.generated.every(object=>lightingData(object).type==='Pendant')).toBe(true);
    expect(plan.generated.every(object=>object.rotation===30)).toBe(true);
    expect(plan.generated.every(object=>lightingData(object).dropIn===30)).toBe(true);
  });

  test('creates one under-cabinet light per upper cabinet with matching length',()=>{
    let current=project();
    const upper=objectDefaults('wall-cabinet',{id:'upper',name:'Upper',x:120,y:120,widthIn:30,rotation:90,elevationIn:54});
    const glass=objectDefaults('glass-upper',{id:'glass',name:'Glass Upper',x:120,y:150,widthIn:36,rotation:90,elevationIn:54});
    current={...current,objects:[upper,glass]};
    const plan=generateAutomaticLighting(current,{recessed:false,pendants:false,underCabinet:true});
    expect(plan.underCabinetCount).toBe(2);
    expect(plan.generated.map(object=>lightingData(object).lengthIn)).toEqual([26,32]);
    expect(plan.generated.every(object=>lightingData(object).type==='Under Cabinet')).toBe(true);
  });

  test('applies all generated lights as one project change and reports counts',()=>{
    let current=project();
    current={...current,objects:[...current.objects,objectDefaults('island',{id:'island',widthIn:72}),objectDefaults('wall-cabinet',{id:'upper'})]};
    const plan=generateAutomaticLighting(current);
    const next=applyAutomaticLighting(current,plan);
    expect(next.objects.length).toBe(current.objects.length+plan.generated.length);
    expect(next.selectedId).toBe(plan.generated[0].id);
    expect(automaticLightingCounts(next)).toEqual({recessed:plan.recessedCount,pendants:plan.pendantCount,underCabinet:plan.underCabinetCount});
  });

  test('replaces previous automatic lights but preserves manual lighting',()=>{
    let current=project();
    const manual=createLighting('Pendant',{id:'manual-pendant'});
    current={...current,objects:[...current.objects,manual]};
    const first=applyAutomaticLighting(current,generateAutomaticLighting(current,{pendants:false,underCabinet:false}));
    const secondPlan=generateAutomaticLighting(first,{recessedSpacingIn:60,pendants:false,underCabinet:false});
    const second=applyAutomaticLighting(first,secondPlan,true);
    expect(second.objects.some(object=>object.id==='manual-pendant')).toBe(true);
    expect(automaticLightingCounts(second).recessed).toBe(secondPlan.recessedCount);
    expect(second.objects.filter(isLighting).length).toBe(secondPlan.recessedCount+1);
  });

  test('supports custom color temperature, intensity and pendant drop',()=>{
    let current=project();
    current={...current,objects:[...current.objects,objectDefaults('island',{id:'island',widthIn:60})]};
    const plan=generateAutomaticLighting(current,{colorTemperatureK:4000,recessedIntensityPercent:65,pendantIntensityPercent:72,pendantDropIn:36,underCabinet:false});
    const recessed=plan.generated.find(object=>lightingData(object).type==='Recessed')!;
    const pendant=plan.generated.find(object=>lightingData(object).type==='Pendant')!;
    expect(lightingData(recessed)).toMatchObject({colorTemperatureK:4000,intensityPercent:65});
    expect(lightingData(pendant)).toMatchObject({colorTemperatureK:4000,intensityPercent:72,dropIn:36});
  });
});
