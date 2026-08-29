import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import {
  autosaveStatusLabel, ProjectAutosaveController, ProjectStorageAdapter,
  projectAutosaveFingerprint,
} from '../domain/projectAutosave';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`autosave-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Autosave Kitchen');

function memoryStorage(){
  const values=new Map<string,string>(),writes:string[]=[];
  const storage:ProjectStorageAdapter={
    async save(key,value){values.set(key,value);writes.push(value);},
    async load(key){return values.get(key)??null;},
    async remove(key){values.delete(key);},
  };
  return{storage,values,writes};
}

describe('project autosave controller',()=>{
  test('ignores view-only and selection changes by default',()=>{
    const initial=project();
    const selected={...initial,selectedId:'wall-north'};
    const zoomed={...initial,view2d:{...initial.view2d,zoom:1.75,pan:{x:80,y:-30}}};
    const camera={...initial,camera3d:{...initial.camera3d,distance:900}};
    expect(projectAutosaveFingerprint(selected)).toBe(projectAutosaveFingerprint(initial));
    expect(projectAutosaveFingerprint(zoomed)).toBe(projectAutosaveFingerprint(initial));
    expect(projectAutosaveFingerprint(camera)).toBe(projectAutosaveFingerprint(initial));
  });

  test('can optionally persist view state while still ignoring selection',()=>{
    const initial=project();
    const zoomed={...initial,view2d:{...initial.view2d,zoom:1.5}};
    expect(projectAutosaveFingerprint(zoomed,true)).not.toBe(projectAutosaveFingerprint(initial,true));
    expect(projectAutosaveFingerprint({...initial,selectedId:'wall-north'},true)).toBe(projectAutosaveFingerprint(initial,true));
  });

  test('coalesces multiple edits into one saved project',async()=>{
    const memory=memoryStorage();
    const controller=new ProjectAutosaveController(memory.storage,{delayMs:100000});
    const initial=project();
    const cabinet=objectDefaults('base-cabinet',{id:'autosave-cabinet'});
    const first={...initial,objects:[...initial.objects,cabinet]};
    const second={...first,objects:first.objects.map(object=>object.id===cabinet.id?{...object,widthIn:42}:object)};
    expect(controller.schedule(first)).toBe(true);
    expect(controller.schedule(second)).toBe(true);
    expect(controller.status.phase).toBe('dirty');
    await controller.flush();
    expect(memory.writes).toHaveLength(1);
    expect(memory.writes[0]).toContain('"widthIn":42');
    expect(controller.status.phase).toBe('saved');
    await controller.dispose(false);
  });

  test('does not write the same project twice',async()=>{
    const memory=memoryStorage();
    const controller=new ProjectAutosaveController(memory.storage,{delayMs:100000});
    const initial=project();
    controller.schedule(initial);
    await controller.flush();
    expect(controller.schedule(initial)).toBe(false);
    await controller.flush();
    expect(memory.writes).toHaveLength(1);
    await controller.dispose(false);
  });

  test('exposes Dirty, Saving and Saved status transitions',async()=>{
    let release:()=>void=()=>undefined;
    const storage:ProjectStorageAdapter={save:()=>new Promise<void>(resolve=>{release=resolve;})};
    const controller=new ProjectAutosaveController(storage,{delayMs:100000});
    const statuses:string[]=[];
    const unsubscribe=controller.subscribe(status=>statuses.push(status.phase));
    controller.schedule(project());
    const flush=controller.flush();
    expect(controller.status.phase).toBe('saving');
    release();
    await flush;
    expect(statuses).toEqual(expect.arrayContaining(['idle','dirty','saving','saved']));
    expect(autosaveStatusLabel(controller.status)).toBe('Saved');
    unsubscribe();
    await controller.dispose(false);
  });

  test('retains pending data and reports error after a failed save',async()=>{
    let fail=true;
    const storage:ProjectStorageAdapter={save:async()=>{if(fail)throw new Error('Storage unavailable');}};
    const controller=new ProjectAutosaveController(storage,{delayMs:100000});
    controller.schedule(project());
    expect(await controller.flush()).toBe(false);
    expect(controller.status.phase).toBe('error');
    expect(controller.status.dirty).toBe(true);
    expect(autosaveStatusLabel(controller.status)).toContain('Storage unavailable');
    fail=false;
    expect(await controller.flush()).toBe(true);
    expect(controller.status.phase).toBe('saved');
    await controller.dispose(false);
  });

  test('loads, migrates and marks an existing project as saved',async()=>{
    const memory=memoryStorage();
    const initial=project();
    await memory.storage.save('kitchen-ai.active-project',JSON.stringify(initial));
    const controller=new ProjectAutosaveController(memory.storage);
    const loaded=await controller.load();
    expect(loaded?.id).toBe(initial.id);
    expect(controller.status.phase).toBe('saved');
    expect(controller.status.dirty).toBe(false);
    await controller.dispose(false);
  });

  test('cancel clears pending save without deleting current storage',async()=>{
    const memory=memoryStorage();
    const controller=new ProjectAutosaveController(memory.storage,{delayMs:100000});
    controller.schedule(project());
    controller.cancelPending();
    expect(controller.status.dirty).toBe(false);
    expect(await controller.flush()).toBe(false);
    expect(memory.writes).toHaveLength(0);
    await controller.dispose(false);
  });
});
