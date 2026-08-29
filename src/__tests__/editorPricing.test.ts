import { createIsland } from '../domain/countertops';
import { generateDesigns } from '../domain/design';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { estimateEditorProject } from '../domain/editorPricing';
import { createLighting } from '../domain/lighting';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`estimate-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('editor-driven planning estimate',()=>{
  test('returns ordered low/high totals and category detail',()=>{
    const estimate=estimateEditorProject(createEditorProject(room,design));
    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(estimate.low);
    expect(estimate.categories.map(item=>item.id)).toEqual(['cabinets','countertops','hardware','lighting','wall-finishes','installation']);
    expect(estimate.assumptions.some(text=>text.includes('not a contractor quote'))).toBe(true);
  });

  test('additional cabinetry and island increase the estimate',()=>{
    const base=createEditorProject(room,{...design,includesIsland:false});
    const before=estimateEditorProject(base);
    const expanded={...base,objects:[...base.objects,objectDefaults('base-cabinet',{id:'extra-base',widthIn:36}),objectDefaults('wall-cabinet',{id:'extra-upper',widthIn:36}),createIsland({id:'extra-island',widthIn:84,depthIn:42})]};
    const after=estimateEditorProject(expanded);
    expect(after.low).toBeGreaterThan(before.low);
    expect(after.high).toBeGreaterThan(before.high);
    expect(after.categories.find(item=>item.id==='cabinets')?.low).toBeGreaterThan(before.categories.find(item=>item.id==='cabinets')?.low??0);
  });

  test('lighting affects lighting and installation allowances',()=>{
    const base=createEditorProject(room,design);
    const before=estimateEditorProject(base);
    const withLights={...base,objects:[...base.objects,createLighting('Pendant',{id:'p1'}),createLighting('Recessed',{id:'r1'})]};
    const after=estimateEditorProject(withLights);
    expect(after.categories.find(item=>item.id==='lighting')?.low).toBeGreaterThan(before.categories.find(item=>item.id==='lighting')?.low??0);
    expect(after.low).toBeGreaterThan(before.low);
  });

  test('appliances are counted as exclusions rather than silently priced',()=>{
    const base=createEditorProject(room,design);
    const withAppliances={...base,objects:[...base.objects,objectDefaults('appliance',{id:'fridge',name:'Refrigerator'}),objectDefaults('appliance',{id:'range',name:'Range'})]};
    const estimate=estimateEditorProject(withAppliances);
    expect(estimate.excludedApplianceCount).toBe(2);
    expect(estimate.assumptions.some(text=>text.startsWith('Appliances'))).toBe(true);
  });

  test('camera and zoom changes never change the estimate',()=>{
    const base=createEditorProject(room,design);
    const changedView={...base,view2d:{...base.view2d,zoom:2,pan:{x:500,y:-300}},camera3d:{distance:1000,yaw:65,pitch:70,target:{x:900,y:800}}};
    expect(estimateEditorProject(changedView)).toEqual(estimateEditorProject(base));
  });
});
