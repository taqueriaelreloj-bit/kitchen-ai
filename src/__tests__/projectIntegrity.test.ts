import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, attachOpening, openingData } from '../domain/openings';
import { deleteObjectCascade, inspectProjectIntegrity, repairProjectIntegrity } from '../domain/projectIntegrity';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`integrity-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Kitchen AI project integrity',()=>{
  test('cascade deletion removes a wall and its attached openings',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    expect(openingData(door).parentWallId).toBe('wall-north');
    const result=deleteObjectCascade(project,'wall-north');
    expect(new Set(result.removedIds)).toEqual(new Set(['wall-north',door.id]));
    expect(result.project.objects.some(object=>object.id==='wall-north'||object.id===door.id)).toBe(false);
  });

  test('deleting a regular object leaves unrelated objects intact',()=>{
    const project=createEditorProject(room,design);
    const result=deleteObjectCascade(project,'base-1');
    expect(result.removedIds).toEqual(['base-1']);
    expect(result.project.objects.some(object=>object.id==='wall-north')).toBe(true);
  });

  test('detects duplicate IDs, missing selection and orphan openings',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=attachOpening(project,window.id,'wall-north',24);
    const duplicate={...project.objects.find(object=>object.id==='base-1')!};
    project={...project,objects:[...project.objects.filter(object=>object.id!=='wall-north'),duplicate],selectedId:'missing'};
    const codes=inspectProjectIntegrity(project).map(issue=>issue.code);
    expect(codes).toContain('duplicate-object-id');
    expect(codes).toContain('selected-object-missing');
    expect(codes).toContain('orphan-opening');
  });

  test('repairs duplicate IDs and clears an invalid selected object',()=>{
    const project=createEditorProject(room,design);
    const duplicate={...project.objects[0]};
    const repaired=repairProjectIntegrity({...project,objects:[...project.objects,duplicate],selectedId:'missing'});
    const ids=repaired.objects.map(object=>object.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(id=>id.includes('-repaired-'))).toBe(true);
    expect(repaired.selectedId).toBeUndefined();
  });

  test('restores cabinet hardware and toe-kick defaults safely',()=>{
    const project=createEditorProject(room,design);
    const brokenBase={...objectDefaults('base-cabinet',{id:'broken-base'}),hardware:undefined,toeKick:undefined};
    const brokenUpper={...objectDefaults('wall-cabinet',{id:'broken-upper'}),hardware:undefined,toeKick:{enabled:true,heightIn:4,recessIn:3,color:'#fff',finish:'Satin'}};
    const repaired=repairProjectIntegrity({...project,objects:[brokenBase,brokenUpper]});
    const base=repaired.objects.find(object=>object.id==='broken-base')!;
    const upper=repaired.objects.find(object=>object.id==='broken-upper')!;
    expect(base.hardware?.style).toBeTruthy();
    expect(base.toeKick).toMatchObject({enabled:true,heightIn:4,recessIn:3});
    expect(upper.hardware?.style).toBeTruthy();
    expect(upper.toeKick).toBeUndefined();
  });

  test('repairs non-finite and negative dimensions',()=>{
    const project=createEditorProject(room,design);
    const broken={...objectDefaults('base-cabinet',{id:'broken'}),x:Number.NaN,widthIn:-30,heightIn:Number.POSITIVE_INFINITY};
    expect(inspectProjectIntegrity({...project,objects:[broken]}).some(issue=>issue.severity==='error')).toBe(true);
    const repaired=repairProjectIntegrity({...project,objects:[broken]});
    const object=repaired.objects[0];
    expect(Number.isFinite(object.x)).toBe(true);
    expect(Number.isFinite(object.heightIn)).toBe(true);
    expect(object.widthIn).toBe(0);
  });

  test('detaches an opening whose wall is missing instead of crashing',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    const withoutWall={...project,objects:project.objects.filter(object=>object.id!=='wall-north')};
    const repaired=repairProjectIntegrity(withoutWall);
    const repairedDoor=repaired.objects.find(object=>object.id===door.id)!;
    expect(openingData(repairedDoor).parentWallId).toBeUndefined();
    expect(inspectProjectIntegrity(repaired).some(issue=>issue.code==='orphan-opening')).toBe(false);
    expect(inspectProjectIntegrity(repaired).some(issue=>issue.code==='unattached-opening')).toBe(true);
  });

  test('keeps valid attached openings clamped and attached after repair',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=attachOpening(project,window.id,'wall-north',10_000);
    const repaired=repairProjectIntegrity(project);
    const repairedWindow=repaired.objects.find(object=>object.id===window.id)!;
    const wall=repaired.objects.find(object=>object.id==='wall-north')!;
    expect(openingData(repairedWindow).parentWallId).toBe(wall.id);
    expect(openingData(repairedWindow).wallOffsetIn).toBeLessThanOrEqual(wall.widthIn-repairedWindow.widthIn);
  });
});
