import { createEditorProject, deleteObject, duplicateObject, migrateProject, objectDefaults, updateObject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));

describe('Kitchen AI professional editor model',()=>{
  test('creates base cabinets with a 4 inch recessed toe kick',()=>{
    const cabinet=objectDefaults('base-cabinet');
    expect(cabinet.toeKick?.enabled).toBe(true);
    expect(cabinet.toeKick?.heightIn).toBe(4);
    expect(cabinet.toeKick?.recessIn).toBe(3);
  });

  test('does not add toe kick to wall cabinets',()=>{
    expect(objectDefaults('wall-cabinet').toeKick).toBeUndefined();
  });

  test('duplicates cabinet properties without sharing nested objects',()=>{
    const room=reconstructRoom(photos); const design=generateDesigns(room)[0]; const project=createEditorProject(room,design);
    const source=project.objects.find(o=>o.kind==='base-cabinet')!;
    const next=duplicateObject(project,source.id); const copy=next.objects[next.objects.length-1];
    expect(copy.toeKick).toEqual(source.toeKick);
    expect(copy.toeKick).not.toBe(source.toeKick);
    expect(copy.hardware).toEqual(source.hardware);
    expect(copy.hardware).not.toBe(source.hardware);
  });

  test('updates width while retaining toe kick',()=>{
    const room=reconstructRoom(photos); const design=generateDesigns(room)[0]; const project=createEditorProject(room,design);
    const source=project.objects.find(o=>o.kind==='base-cabinet')!;
    const next=updateObject(project,source.id,{widthIn:48});
    const changed=next.objects.find(o=>o.id===source.id)!;
    expect(changed.widthIn).toBe(48);
    expect(changed.toeKick?.enabled).toBe(true);
  });

  test('migrates legacy room and design safely to version 2',()=>{
    const room=reconstructRoom(photos); const design=generateDesigns(room)[0];
    const migrated=migrateProject({room,design});
    expect(migrated?.version).toBe(2);
    expect(migrated?.objects.some(o=>o.kind==='base-cabinet')).toBe(true);
  });

  test('deletes an object and clears selection',()=>{
    const room=reconstructRoom(photos); const design=generateDesigns(room)[0]; let project=createEditorProject(room,design);
    const target=project.objects[0]; project={...project,selectedId:target.id};
    const next=deleteObject(project,target.id);
    expect(next.objects.some(o=>o.id===target.id)).toBe(false);
    expect(next.selectedId).toBeUndefined();
  });
});
