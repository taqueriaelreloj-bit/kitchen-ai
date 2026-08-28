import { createEditorProject } from '../domain/editor';
import { createCountertop, createIsland, countertopData, islandData, updateCountertop, updateIsland } from '../domain/countertops';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));

describe('Countertops and islands',()=>{
  const room=reconstructRoom(photos); const design=generateDesigns(room)[0];
  test('countertop defaults are professional and persistent',()=>{
    const counter=createCountertop({id:'counter'});
    expect(countertopData(counter).thicknessIn).toBe(1.5);
    expect(countertopData(counter).edgeProfile).toBe('Eased');
    expect(countertopData(counter).overhangFrontIn).toBe(1);
  });
  test('updates material, thickness and cutouts',()=>{
    const counter=createCountertop({id:'counter'}); let project=createEditorProject(room,design); project={...project,objects:[counter]};
    project=updateCountertop(project,'counter',{materialId:'granite-black',thicknessIn:2,sinkCutout:true,cooktopCutout:true});
    const updated=project.objects[0];
    expect(countertopData(updated).materialId).toBe('granite-black');
    expect(countertopData(updated).sinkCutout).toBe(true);
    expect(updated.heightIn).toBe(2);
  });
  test('island stores seating and appliance layout',()=>{
    const island=createIsland({id:'island'}); let project=createEditorProject(room,design); project={...project,objects:[island]};
    project=updateIsland(project,'island',{seatingCount:4,seatingOverhangIn:15,sink:true,dishwasher:true,waterfallLeft:true});
    expect(islandData(project.objects[0])).toMatchObject({seatingCount:4,seatingOverhangIn:15,sink:true,dishwasher:true,waterfallLeft:true});
  });
  test('unknown objects are not modified',()=>{
    const wall=createEditorProject(room,design).objects.find(o=>o.kind==='wall')!; const project={...createEditorProject(room,design),objects:[wall]};
    expect(updateCountertop(project,wall.id,{thicknessIn:3})).toEqual(project);
  });
});
