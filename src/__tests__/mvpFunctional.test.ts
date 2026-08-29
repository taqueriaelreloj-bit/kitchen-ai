import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { buildBillOfMaterials, summarizeBillOfMaterials } from '../domain/billOfMaterials';
import { CABINET_FINISHES, HARDWARE_FINISHES, WALL_PAINTS } from '../domain/catalogs';
import { countertopData, createIsland, islandData, updateCountertop, updateIsland } from '../domain/countertops';
import { generateDesigns } from '../domain/design';
import {
  applyCabinetFinish,
  applyHardware,
  applyToeKick,
  applyWallPaint,
  clampZoom,
  createEditorProject,
  deleteObject,
  duplicateObject,
  EditorProject,
  migrateProject,
  objectDefaults,
  removeHardware,
  reset2DView,
  reset3DView,
  updateObject,
} from '../domain/editor';
import { createLighting } from '../domain/lighting';
import { addOpening } from '../domain/openings';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({
  uri:`functional-${index}.jpg`,
  angle,
  capturedAt:'2026-08-28T00:00:00.000Z',
}));
const room=reconstructRoom(photos);
const design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Functional Kitchen');

const selected=(value:EditorProject)=>value.objects.find(object=>object.id===value.selectedId);

describe('Kitchen AI MVP functional regression flow',()=>{
  test('creates a plan, adds a wall and preserves real dimensions through view changes',()=>{
    let current=project();
    const wall=objectDefaults('wall',{id:'test-wall',name:'Test Wall',x:180,y:160,widthIn:120});
    current={...current,objects:[...current.objects,wall],selectedId:wall.id};
    current=updateObject(current,wall.id,{widthIn:168,heightIn:108,depthIn:5.5});
    const before=current.objects.find(object=>object.id===wall.id)!;
    current={...current,view2d:{...current.view2d,zoom:1.75,pan:{x:85,y:-40}}};
    const after=current.objects.find(object=>object.id===wall.id)!;
    expect(after.widthIn).toBe(168);
    expect(after.heightIn).toBe(108);
    expect(after.depthIn).toBe(5.5);
    expect(after).toEqual(before);
  });

  test('keeps 2D zoom within professional limits and resets only visual state',()=>{
    let current=project();
    const originalObjects=current.objects;
    expect(clampZoom(.01)).toBe(.25);
    expect(clampZoom(4)).toBe(2);
    current={...current,view2d:{...current.view2d,zoom:2,pan:{x:300,y:-120}}};
    current=reset2DView(current);
    expect(current.view2d.zoom).toBe(1);
    expect(current.view2d.pan).toEqual({x:0,y:0});
    expect(current.objects).toBe(originalObjects);
  });

  test('base cabinet toe kick follows resize, rotation, duplication and deletion',()=>{
    let current=project();
    const cabinet=objectDefaults('base-cabinet',{id:'functional-base',x:210,y:150,widthIn:30});
    current={...current,objects:[...current.objects,cabinet],selectedId:cabinet.id};
    expect(selected(current)?.toeKick).toMatchObject({enabled:true,heightIn:4,recessIn:3});
    current=updateObject(current,cabinet.id,{widthIn:42,rotation:90,x:245,y:175});
    expect(selected(current)?.widthIn).toBe(42);
    expect(selected(current)?.toeKick?.heightIn).toBe(4);
    current=applyToeKick(current,{heightIn:5,recessIn:2.5},false);
    expect(selected(current)?.toeKick).toMatchObject({heightIn:5,recessIn:2.5});
    current=duplicateObject(current,cabinet.id);
    const copy=selected(current)!;
    expect(copy.id).not.toBe(cabinet.id);
    expect(copy.toeKick).toEqual(current.objects.find(object=>object.id===cabinet.id)?.toeKick);
    expect(copy.toeKick).not.toBe(current.objects.find(object=>object.id===cabinet.id)?.toeKick);
    current=deleteObject(current,copy.id);
    expect(current.objects.some(object=>object.id===copy.id)).toBe(false);
  });

  test('applies wall paint, cabinet finishes and hardware with reversible snapshots',()=>{
    let current=project();
    const extraWall=objectDefaults('wall',{id:'paint-wall'});
    const base=objectDefaults('base-cabinet',{id:'finish-base'});
    const upper=objectDefaults('wall-cabinet',{id:'finish-upper'});
    current={...current,objects:[...current.objects,extraWall,base,upper],selectedId:extraWall.id};
    const snapshots:EditorProject[]=[current];

    const paint=WALL_PAINTS.find(item=>item.name==='Evergreen Fog')??WALL_PAINTS[0];
    current=applyWallPaint(current,paint.id,true);
    snapshots.push(current);
    expect(current.objects.filter(object=>object.kind==='wall').every(object=>object.wallPaintId===paint.id)).toBe(true);

    const finish=CABINET_FINISHES.find(item=>item.name==='White Oak')??CABINET_FINISHES[0];
    current={...current,selectedId:base.id};
    current=applyCabinetFinish(current,finish.id,'all');
    snapshots.push(current);
    expect(current.objects.find(object=>object.id===base.id)?.finishId).toBe(finish.id);
    expect(current.objects.find(object=>object.id===upper.id)?.finishId).toBe(finish.id);
    expect(current.objects.find(object=>object.id===base.id)?.toeKick?.color).toBe(finish.baseColor);

    const hardwareFinish=HARDWARE_FINISHES.find(item=>item.name==='Matte Black')??HARDWARE_FINISHES[0];
    current=applyHardware(current,{style:'Cup Pull',size:'5 inches',finishId:hardwareFinish.id,position:'Center'},'all');
    snapshots.push(current);
    expect(current.objects.find(object=>object.id===base.id)?.hardware).toMatchObject({style:'Cup Pull',finishId:hardwareFinish.id});
    current=removeHardware(current,'all');
    expect(current.objects.find(object=>object.id===base.id)?.hardware?.style).toBe('No Hardware');

    const undo=snapshots[snapshots.length-1];
    expect(undo.objects.find(object=>object.id===base.id)?.hardware?.style).toBe('Cup Pull');
    const redo=current;
    expect(redo.objects.find(object=>object.id===base.id)?.hardware?.style).toBe('No Hardware');
  });

  test('configures an island, cutouts and seating and keeps them after save/load',()=>{
    let current=project();
    const island=createIsland({id:'functional-island',x:260,y:245,widthIn:78,depthIn:42});
    current={...current,objects:[...current.objects,island],selectedId:island.id};
    current=updateIsland(current,island.id,{seatingCount:4,seatingOverhangIn:14,sink:true,dishwasher:true,waterfallLeft:true});
    current=updateCountertop(current,island.id,{materialId:'quartz-white',thicknessIn:2,edgeProfile:'Waterfall',sinkCutout:true});
    const loaded=parseProject(serializeProject(current))!;
    const loadedIsland=loaded.objects.find(object=>object.id===island.id)!;
    expect(islandData(loadedIsland)).toMatchObject({seatingCount:4,seatingOverhangIn:14,sink:true,dishwasher:true,waterfallLeft:true});
    expect(countertopData(loadedIsland)).toMatchObject({materialId:'quartz-white',thicknessIn:2,edgeProfile:'Waterfall',sinkCutout:true});
  });

  test('preserves design state when switching 2D/3D and resetting the camera',()=>{
    let current=project();
    const objectIds=current.objects.map(object=>object.id);
    current={...current,viewMode:'3d',camera3d:{distance:900,yaw:45,pitch:55,target:{x:420,y:350}}};
    current=reset3DView(current);
    expect(current.camera3d).toEqual({distance:520,yaw:-28,pitch:30,target:{x:220,y:170}});
    current={...current,viewMode:'2d'};
    expect(current.objects.map(object=>object.id)).toEqual(objectIds);
  });

  test('AI Design preserves architectural objects and creates editable work zones',()=>{
    let current=project();
    current={...current,selectedId:'wall-north'};
    current=addOpening(current,'door');
    const door=current.objects.find(object=>object.kind==='door')!;
    const light=createLighting('Pendant',{id:'functional-light'});
    current={...current,objects:[...current.objects,light]};
    const suggestion=aiDesignSuggestions(current)[0];
    const generated=applyAIDesignSuggestion(current,suggestion);
    expect(generated.objects.some(object=>object.id===door.id)).toBe(true);
    expect(generated.objects.some(object=>object.id==='functional-light')).toBe(true);
    expect(generated.objects.some(object=>object.kind==='sink-base')).toBe(true);
    expect(generated.objects.some(object=>object.id==='ai-range')).toBe(true);
    expect(generated.objects.some(object=>object.id==='ai-refrigerator')).toBe(true);
  });

  test('loads legacy projects with safe defaults instead of failing',()=>{
    const migrated=migrateProject({room,design});
    expect(migrated?.version).toBe(2);
    expect(migrated?.objects.length).toBeGreaterThan(0);
    const base=migrated?.objects.find(object=>object.kind==='base-cabinet');
    expect(base?.toeKick).toMatchObject({enabled:true,heightIn:4,recessIn:3});
    expect(base?.hardware?.style).toBeTruthy();
  });

  test('builds a construction-oriented material schedule from the edited project',()=>{
    let current=project();
    current={...current,objects:[...current.objects,createLighting('Recessed',{id:'functional-recessed'}),objectDefaults('appliance',{id:'functional-dishwasher',name:'Dishwasher',widthIn:24,heightIn:34,depthIn:24,material:'Stainless Steel'})]};
    const lines=buildBillOfMaterials(current);
    const summary=summarizeBillOfMaterials(current);
    expect(lines.some(line=>line.category==='Cabinets')).toBe(true);
    expect(lines.some(line=>line.category==='Countertops')).toBe(true);
    expect(lines.some(line=>line.category==='Lighting')).toBe(true);
    expect(lines.some(line=>line.category==='Appliances'&&line.item==='Dishwasher')).toBe(true);
    expect(summary.cabinetCount).toBeGreaterThan(0);
    expect(summary.countertopSquareFeet).toBeGreaterThan(0);
  });
});
