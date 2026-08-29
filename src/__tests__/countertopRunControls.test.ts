import {
  countertopRunForObject,
  countertopRunObjects,
  countertopRunSummary,
  detachCountertopFromRun,
  normalizeCountertopRun,
  updateCountertopRun,
  updateCountertopRunEdge,
  updateCountertopRunMaterial,
} from '../domain/countertopRunControls';
import { countertopData, updateCountertop } from '../domain/countertops';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`counter-run-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

function runProject(){
  const project=createEditorProject(room,design),objects=[
    objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),
    objectDefaults('drawer-base',{id:'b',x:130,y:100,widthIn:24}),
    objectDefaults('sink-base',{id:'c',x:154,y:100,widthIn:36}),
    objectDefaults('base-cabinet',{id:'separate',x:260,y:100,widthIn:30}),
  ];
  return{...project,objects,selectedId:'b'};
}

describe('continuous countertop run controls',()=>{
  test('finds the same run from any adjacent cabinet member',()=>{
    const project=runProject(),a=countertopRunForObject(project,'a'),c=countertopRunForObject(project,'c');
    expect(a?.ids).toEqual(['a','b','c']);
    expect(c?.ids).toEqual(['a','b','c']);
    expect(countertopRunObjects(project,'b').map(object=>object.id)).toEqual(['a','b','c']);
  });

  test('summarizes run length, cabinet count and cutouts',()=>{
    let project=runProject();
    project=updateCountertop(project,'c',{sinkCutout:true});
    const summary=countertopRunSummary(project,'a')!;
    expect(summary).toMatchObject({cabinetCount:3,widthIn:90,sinkCount:1,cooktopCount:0});
    expect(summary.sourceIds).toEqual(['a','b','c']);
  });

  test('applies material, thickness, overhang and backsplash to the complete run',()=>{
    let project=runProject();
    project=updateCountertopRun(project,'b',{materialId:'granite-black',thicknessIn:3,overhangFrontIn:2,overhangSideIn:1.5,backsplashHeightIn:6});
    for(const id of ['a','b','c'])expect(countertopData(project.objects.find(object=>object.id===id)!)).toMatchObject({materialId:'granite-black',thicknessIn:3,overhangFrontIn:2,overhangSideIn:1.5,backsplashHeightIn:6});
    expect(countertopData(project.objects.find(object=>object.id==='separate')!).materialId).not.toBe('granite-black');
  });

  test('applies edge profile and material through focused helpers',()=>{
    let project=runProject();
    project=updateCountertopRunEdge(project,'a','Ogee');
    project=updateCountertopRunMaterial(project,'a','quartz-calacatta');
    expect(['a','b','c'].every(id=>countertopData(project.objects.find(object=>object.id===id)!).edgeProfile==='Ogee')).toBe(true);
    expect(['a','b','c'].every(id=>countertopData(project.objects.find(object=>object.id===id)!).materialId==='quartz-calacatta')).toBe(true);
  });

  test('preserves sink and cooktop flags on their source cabinets',()=>{
    let project=runProject();
    project=updateCountertop(project,'b',{cooktopCutout:true});
    project=updateCountertop(project,'c',{sinkCutout:true});
    project=updateCountertopRun(project,'a',{materialId:'quartz-white',edgeProfile:'Beveled'});
    expect(countertopData(project.objects.find(object=>object.id==='b')!).cooktopCutout).toBe(true);
    expect(countertopData(project.objects.find(object=>object.id==='c')!).sinkCutout).toBe(true);
    expect(countertopData(project.objects.find(object=>object.id==='a')!).sinkCutout).toBe(false);
  });

  test('detaches one cabinet by changing only its slab compatibility marker',()=>{
    let project=runProject();
    project=detachCountertopFromRun(project,'b');
    expect(countertopRunForObject(project,'a')?.ids).toEqual(['a']);
    expect(countertopRunForObject(project,'b')?.ids).toEqual(['b']);
    expect(countertopRunForObject(project,'c')?.ids).toEqual(['c']);
  });

  test('normalizes a run from the selected cabinet specification',()=>{
    let project=runProject();
    project=updateCountertop(project,'b',{materialId:'granite-black',thicknessIn:2.5,edgeProfile:'Waterfall'});
    // Once different, b is its own run. Rejoin the neighbors explicitly using the selected spec.
    const selected=countertopData(project.objects.find(object=>object.id==='b')!);
    for(const id of ['a','c'])project=updateCountertop(project,id,{materialId:selected.materialId,thicknessIn:selected.thicknessIn,edgeProfile:selected.edgeProfile});
    project=normalizeCountertopRun(project,'b');
    expect(countertopRunForObject(project,'b')?.ids).toEqual(['a','b','c']);
  });

  test('supports standalone countertops and islands as one-object runs',()=>{
    const project=runProject(),counter=objectDefaults('countertop',{id:'counter'}),island=objectDefaults('island',{id:'island'}),withObjects={...project,objects:[...project.objects,counter,island]};
    expect(countertopRunForObject(withObjects,'counter')?.ids).toEqual(['counter']);
    expect(countertopRunForObject(withObjects,'island')?.ids).toEqual(['island']);
    expect(updateCountertopRun(withObjects,'counter',{thicknessIn:2}).objects.find(object=>object.id==='counter')).toBeTruthy();
  });

  test('persists run changes through save and load',()=>{
    let project=runProject();
    project=updateCountertopRun(project,'a',{materialId:'quartz-calacatta',thicknessIn:2,edgeProfile:'Bullnose'});
    const loaded=parseProject(serializeProject(project))!;
    expect(countertopRunForObject(loaded,'b')?.ids).toEqual(['a','b','c']);
    expect(countertopData(loaded.objects.find(object=>object.id==='c')!)).toMatchObject({materialId:'quartz-calacatta',thicknessIn:2,edgeProfile:'Bullnose'});
  });

  test('ignores objects that do not support countertops',()=>{
    const project=runProject();
    expect(countertopRunForObject(project,'missing')).toBeUndefined();
    expect(updateCountertopRun(project,'missing',{materialId:'granite-black'})).toBe(project);
  });
});
