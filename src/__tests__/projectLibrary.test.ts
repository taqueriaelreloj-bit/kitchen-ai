import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import {
  deleteProjectFromLibrary,
  duplicateProjectInLibrary,
  importProjectToLibrary,
  loadProjectLibrary,
  MAX_LIBRARY_PROJECTS,
  openProjectFromLibrary,
  ProjectStorage,
  renameProjectInLibrary,
  repairProjectLibrary,
  saveProjectToLibrary,
} from '../domain/projectLibrary';
import { serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

class MemoryStorage implements ProjectStorage{
  values=new Map<string,string>();
  async getItem(key:string){return this.values.get(key)??null;}
  async setItem(key:string,value:string){this.values.set(key,value);}
  async removeItem(key:string){this.values.delete(key);}
}

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`library-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Kitchen AI local project library',()=>{
  test('saves, lists and opens a complete project',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'Luis Kitchen');
    const saved=await saveProjectToLibrary(storage,project);
    expect(saved.ok).toBe(true);
    const entries=await loadProjectLibrary(storage);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({id:project.id,name:'Luis Kitchen',objectCount:project.objects.length});
    const opened=await openProjectFromLibrary(storage,project.id);
    expect(opened.ok).toBe(true);
    if(opened.ok)expect(opened.value.objects.map(object=>object.id)).toEqual(project.objects.map(object=>object.id));
  });

  test('updates the existing entry instead of duplicating it',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'First Name');
    await saveProjectToLibrary(storage,project);
    const changed={...project,name:'Updated Name',objects:[...project.objects,objectDefaults('base-cabinet',{id:'extra'})],updatedAt:'2026-08-29T00:00:00.000Z'};
    await saveProjectToLibrary(storage,changed);
    const entries=await loadProjectLibrary(storage);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({name:'Updated Name',objectCount:changed.objects.length});
  });

  test('duplicates a project with an independent ID and name',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'Original');
    await saveProjectToLibrary(storage,project);
    const duplicated=await duplicateProjectInLibrary(storage,project.id);
    expect(duplicated.ok).toBe(true);
    if(duplicated.ok){expect(duplicated.value.id).not.toBe(project.id);expect(duplicated.value.name).toBe('Original Copy');expect(duplicated.value.objects).toEqual(project.objects);}
    expect(await loadProjectLibrary(storage)).toHaveLength(2);
  });

  test('renames and deletes a local project',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'Before');
    await saveProjectToLibrary(storage,project);
    const renamed=await renameProjectInLibrary(storage,project.id,'After');
    expect(renamed.ok&&renamed.value.name).toBe('After');
    const deleted=await deleteProjectFromLibrary(storage,project.id);
    expect(deleted.ok&&deleted.value).toEqual([]);
    expect((await openProjectFromLibrary(storage,project.id)).ok).toBe(false);
  });

  test('recovers from a corrupt index without crashing',async()=>{
    const storage=new MemoryStorage();
    storage.values.set('kitchen-ai-project-library-v1','{not json');
    expect(await loadProjectLibrary(storage)).toEqual([]);
    expect(storage.values.get('kitchen-ai-project-library-v1')).toBe('[]');
  });

  test('repairs stale index entries whose project bytes are missing',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'Stale');
    await saveProjectToLibrary(storage,project);
    for(const key of [...storage.values.keys()])if(key.startsWith('kitchen-ai-library-project:'))storage.values.delete(key);
    expect(await repairProjectLibrary(storage)).toEqual([]);
    expect(await loadProjectLibrary(storage)).toEqual([]);
  });

  test('imports a complete project and resolves duplicate IDs safely',async()=>{
    const storage=new MemoryStorage(),project=createEditorProject(room,design,'Import Me');
    await saveProjectToLibrary(storage,project);
    const imported=await importProjectToLibrary(storage,serializeProject(project),'Imported Copy');
    expect(imported.ok).toBe(true);
    if(imported.ok){expect(imported.value.id).not.toBe(project.id);expect(imported.value.name).toBe('Imported Copy');}
    expect(await loadProjectLibrary(storage)).toHaveLength(2);
  });

  test('returns a useful error for invalid imported JSON',async()=>{
    const storage=new MemoryStorage(),result=await importProjectToLibrary(storage,'{bad json');
    expect(result.ok).toBe(false);
    if(!result.ok)expect(result.message.length).toBeGreaterThan(5);
  });

  test('limits the library and removes trimmed project bytes',async()=>{
    const storage=new MemoryStorage();
    for(let index=0;index<MAX_LIBRARY_PROJECTS+3;index++){
      const project={...createEditorProject(room,design,`Project ${index}`),id:`project-${index}`,updatedAt:`2026-08-${String(index%28+1).padStart(2,'0')}T00:00:00.000Z`};
      await saveProjectToLibrary(storage,project);
    }
    const entries=await loadProjectLibrary(storage);
    expect(entries).toHaveLength(MAX_LIBRARY_PROJECTS);
    const storedProjects=[...storage.values.keys()].filter(key=>key.startsWith('kitchen-ai-library-project:'));
    expect(storedProjects).toHaveLength(MAX_LIBRARY_PROJECTS);
  });

  test('view changes remain independent between saved projects',async()=>{
    const storage=new MemoryStorage(),a={...createEditorProject(room,design,'A'),id:'a',view2d:{...createEditorProject(room,design).view2d,zoom:.5}},b={...createEditorProject(room,design,'B'),id:'b',view2d:{...createEditorProject(room,design).view2d,zoom:1.8}};
    await saveProjectToLibrary(storage,a);await saveProjectToLibrary(storage,b);
    const openedA=await openProjectFromLibrary(storage,'a'),openedB=await openProjectFromLibrary(storage,'b');
    expect(openedA.ok&&openedA.value.view2d.zoom).toBe(.5);
    expect(openedB.ok&&openedB.value.view2d.zoom).toBe(1.8);
  });
});
