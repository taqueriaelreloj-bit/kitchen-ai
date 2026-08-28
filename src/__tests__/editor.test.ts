import { applyCabinetFinish, applyHardware, applyToeKick, applyWallPaint, createEditorProject, deleteObject, duplicateObject, migrateProject, objectDefaults, reset2DView, reset3DView, updateObject } from '../domain/editor';
import { CABINET_FINISHES, HARDWARE_FINISHES, WALL_PAINTS } from '../domain/catalogs';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const makeProject=()=>{ const room=reconstructRoom(photos); const design=generateDesigns(room)[0]; return createEditorProject(room,design); };

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
    const project=makeProject(); const source=project.objects.find(o=>o.kind==='base-cabinet')!;
    const next=duplicateObject(project,source.id); const copy=next.objects[next.objects.length-1];
    expect(copy.toeKick).toEqual(source.toeKick);
    expect(copy.toeKick).not.toBe(source.toeKick);
    expect(copy.hardware).toEqual(source.hardware);
    expect(copy.hardware).not.toBe(source.hardware);
  });

  test('updates width while retaining toe kick',()=>{
    const project=makeProject(); const source=project.objects.find(o=>o.kind==='base-cabinet')!;
    const next=updateObject(project,source.id,{widthIn:48}); const changed=next.objects.find(o=>o.id===source.id)!;
    expect(changed.widthIn).toBe(48);
    expect(changed.toeKick?.enabled).toBe(true);
  });

  test('migrates legacy room and design safely to version 2',()=>{
    const room=reconstructRoom(photos); const design=generateDesigns(room)[0]; const migrated=migrateProject({room,design});
    expect(migrated?.version).toBe(2);
    expect(migrated?.objects.some(o=>o.kind==='base-cabinet')).toBe(true);
  });

  test('deletes an object and clears selection',()=>{
    let project=makeProject(); const target=project.objects[0]; project={...project,selectedId:target.id};
    const next=deleteObject(project,target.id);
    expect(next.objects.some(o=>o.id===target.id)).toBe(false);
    expect(next.selectedId).toBeUndefined();
  });

  test('applies toe kick settings to all base-like cabinets but not wall cabinets',()=>{
    let project=makeProject(); project={...project,objects:[...project.objects,objectDefaults('base-cabinet',{id:'base-2'}),objectDefaults('island',{id:'island-test'})]};
    const next=applyToeKick(project,{heightIn:5,recessIn:2},true);
    expect(next.objects.filter(o=>o.kind==='base-cabinet'||o.kind==='island').every(o=>o.toeKick?.heightIn===5&&o.toeKick?.recessIn===2)).toBe(true);
    expect(next.objects.find(o=>o.kind==='wall-cabinet')?.toeKick).toBeUndefined();
  });

  test('applies cabinet finish by scope and keeps toe kick color synchronized',()=>{
    const finish=CABINET_FINISHES.find(x=>x.name==='Navy') ?? CABINET_FINISHES[0];
    const project=makeProject(); const next=applyCabinetFinish(project,finish.id,'base');
    const base=next.objects.find(o=>o.kind==='base-cabinet')!; const wall=next.objects.find(o=>o.kind==='wall-cabinet')!;
    expect(base.finishId).toBe(finish.id); expect(base.color).toBe(finish.baseColor); expect(base.toeKick?.color).toBe(finish.baseColor);
    expect(wall.finishId).not.toBe(finish.id);
  });

  test('applies hardware to all cabinets without touching walls',()=>{
    const hardware=HARDWARE_FINISHES.find(x=>x.name==='Matte Black') ?? HARDWARE_FINISHES[0];
    const project=makeProject(); const next=applyHardware(project,{style:'T-Bar Pull',finishId:hardware.id,size:'8 inches'},'all');
    expect(next.objects.filter(o=>o.kind.includes('cabinet')||o.kind==='island').every(o=>o.hardware?.style==='T-Bar Pull'&&o.hardware.finishId===hardware.id)).toBe(true);
    expect(next.objects.find(o=>o.kind==='wall')?.hardware).toBeUndefined();
  });

  test('applies paint to every wall and resets views without changing design objects',()=>{
    const paint=WALL_PAINTS.find(x=>x.name==='Naval') ?? WALL_PAINTS[0];
    let project=makeProject(); const count=project.objects.length;
    project=applyWallPaint(project,paint.id,true);
    expect(project.objects.filter(o=>o.kind==='wall').every(o=>o.wallPaintId===paint.id)).toBe(true);
    project={...project,view2d:{...project.view2d,zoom:1.8,pan:{x:200,y:-80}},camera3d:{...project.camera3d,distance:900,yaw:50,pitch:60}};
    const reset2d=reset2DView(project); const reset3d=reset3DView(project);
    expect(reset2d.view2d.zoom).toBe(1); expect(reset2d.view2d.pan).toEqual({x:0,y:0});
    expect(reset3d.camera3d.distance).toBe(520); expect(reset3d.camera3d.yaw).toBe(-28);
    expect(reset3d.objects).toHaveLength(count);
  });
});