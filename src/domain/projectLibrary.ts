import { EditorProject } from './editor';
import { parseProjectDetailed, serializeProject, summarizeProject } from './projectIO';

export type ProjectStorage={
  getItem:(key:string)=>Promise<string|null>;
  setItem:(key:string,value:string)=>Promise<void>;
  removeItem:(key:string)=>Promise<void>;
};
export type ProjectLibraryEntry={
  id:string;
  name:string;
  createdAt:string;
  updatedAt:string;
  objectCount:number;
  walls:number;
  cabinets:number;
  islands:number;
  openings:number;
  appliances:number;
  lighting:number;
};
export type ProjectLibraryResult<T>={ok:true;value:T}|{ok:false;message:string};

export const PROJECT_LIBRARY_INDEX_KEY='kitchen-ai-project-library-v1';
export const PROJECT_LIBRARY_PREFIX='kitchen-ai-library-project:';
export const MAX_LIBRARY_PROJECTS=50;

const projectKey=(id:string)=>`${PROJECT_LIBRARY_PREFIX}${id}`;
const now=()=>new Date().toISOString();
const safeId=(value:string)=>value.trim().replace(/[^a-z0-9-_]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,120)||`project-${Date.now()}`;
const uniqueId=(base:string,ids:Set<string>)=>{let candidate=safeId(base),index=2;while(ids.has(candidate)){candidate=`${safeId(base)}-${index}`;index++;}return candidate;};
const isEntry=(value:unknown):value is ProjectLibraryEntry=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&typeof(value as ProjectLibraryEntry).id==='string'&&typeof(value as ProjectLibraryEntry).name==='string'&&typeof(value as ProjectLibraryEntry).updatedAt==='string';

async function writeIndex(storage:ProjectStorage,entries:ProjectLibraryEntry[]){
  const sorted=[...entries].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.name.localeCompare(b.name)).slice(0,MAX_LIBRARY_PROJECTS);
  await storage.setItem(PROJECT_LIBRARY_INDEX_KEY,JSON.stringify(sorted));
  return sorted;
}

export async function loadProjectLibrary(storage:ProjectStorage):Promise<ProjectLibraryEntry[]>{
  try{
    const raw=await storage.getItem(PROJECT_LIBRARY_INDEX_KEY);
    if(!raw)return[];
    const value=JSON.parse(raw);
    if(!Array.isArray(value))throw new Error('Invalid library index');
    const entries=value.filter(isEntry).map(entry=>({...entry,id:safeId(entry.id),name:entry.name.slice(0,500)}));
    const deduped=[...new Map(entries.map(entry=>[entry.id,entry])).values()];
    if(deduped.length!==value.length)await writeIndex(storage,deduped);
    return deduped.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.name.localeCompare(b.name));
  }catch{
    await storage.setItem(PROJECT_LIBRARY_INDEX_KEY,'[]');
    return[];
  }
}

function entryFromProject(project:EditorProject,createdAt:string):ProjectLibraryEntry{
  const summary=summarizeProject(project);
  return{id:project.id,name:project.name,createdAt,updatedAt:project.updatedAt,objectCount:summary.objectCount,walls:summary.walls,cabinets:summary.cabinets,islands:summary.islands,openings:summary.openings,appliances:summary.appliances,lighting:summary.lighting};
}

export async function saveProjectToLibrary(storage:ProjectStorage,project:EditorProject):Promise<ProjectLibraryResult<ProjectLibraryEntry>>{
  try{
    const entries=await loadProjectLibrary(storage),existing=entries.find(entry=>entry.id===project.id),createdAt=existing?.createdAt??now(),updatedAt=project.updatedAt||now(),saved={...project,id:safeId(project.id),name:(project.name||'Kitchen Project').trim().slice(0,500)||'Kitchen Project',updatedAt};
    await storage.setItem(projectKey(saved.id),serializeProject(saved));
    const entry=entryFromProject(saved,createdAt),next=[entry,...entries.filter(item=>item.id!==entry.id)];
    const trimmed=await writeIndex(storage,next);
    const removed=next.filter(item=>!trimmed.some(keep=>keep.id===item.id));
    await Promise.all(removed.map(item=>storage.removeItem(projectKey(item.id))));
    return{ok:true,value:entry};
  }catch{return{ok:false,message:'Kitchen AI could not save this project to the local library.'};}
}

export async function openProjectFromLibrary(storage:ProjectStorage,id:string):Promise<ProjectLibraryResult<EditorProject>>{
  try{
    const raw=await storage.getItem(projectKey(safeId(id)));
    if(!raw)return{ok:false,message:'The selected project is no longer available.'};
    const parsed=parseProjectDetailed(raw);
    if(!parsed.ok)return{ok:false,message:parsed.message};
    return{ok:true,value:parsed.project};
  }catch{return{ok:false,message:'Kitchen AI could not open this local project.'};}
}

export async function deleteProjectFromLibrary(storage:ProjectStorage,id:string):Promise<ProjectLibraryResult<ProjectLibraryEntry[]>>{
  try{
    const safe=safeId(id),entries=await loadProjectLibrary(storage),next=entries.filter(entry=>entry.id!==safe);
    await storage.removeItem(projectKey(safe));
    await writeIndex(storage,next);
    return{ok:true,value:next};
  }catch{return{ok:false,message:'Kitchen AI could not delete this local project.'};}
}

export async function duplicateProjectInLibrary(storage:ProjectStorage,id:string,name?:string):Promise<ProjectLibraryResult<EditorProject>>{
  const opened=await openProjectFromLibrary(storage,id);
  if(!opened.ok)return opened;
  const entries=await loadProjectLibrary(storage),ids=new Set(entries.map(entry=>entry.id)),baseName=(name?.trim()||`${opened.value.name} Copy`).slice(0,500),newId=uniqueId(baseName,ids),timestamp=now(),copy:{value:EditorProject}={value:{...opened.value,id:newId,name:baseName,selectedId:undefined,updatedAt:timestamp}};
  const saved=await saveProjectToLibrary(storage,copy.value);
  return saved.ok?{ok:true,value:copy.value}:saved;
}

export async function renameProjectInLibrary(storage:ProjectStorage,id:string,name:string):Promise<ProjectLibraryResult<EditorProject>>{
  const opened=await openProjectFromLibrary(storage,id);
  if(!opened.ok)return opened;
  const next={...opened.value,name:name.trim().slice(0,500)||'Kitchen Project',updatedAt:now()};
  const saved=await saveProjectToLibrary(storage,next);
  return saved.ok?{ok:true,value:next}:saved;
}

export async function repairProjectLibrary(storage:ProjectStorage):Promise<ProjectLibraryEntry[]>{
  const entries=await loadProjectLibrary(storage),valid:ProjectLibraryEntry[]=[];
  for(const entry of entries){
    const opened=await openProjectFromLibrary(storage,entry.id);
    if(opened.ok)valid.push(entry);else await storage.removeItem(projectKey(entry.id));
  }
  return writeIndex(storage,valid);
}

export async function importProjectToLibrary(storage:ProjectStorage,serialized:string,preferredName?:string):Promise<ProjectLibraryResult<EditorProject>>{
  const parsed=parseProjectDetailed(serialized);
  if(!parsed.ok)return{ok:false,message:parsed.message};
  const entries=await loadProjectLibrary(storage),ids=new Set(entries.map(entry=>entry.id)),name=(preferredName?.trim()||parsed.project.name||'Imported Kitchen Project').slice(0,500),id=ids.has(parsed.project.id)?uniqueId(name,ids):safeId(parsed.project.id),project={...parsed.project,id,name,updatedAt:now()};
  const saved=await saveProjectToLibrary(storage,project);
  return saved.ok?{ok:true,value:project}:saved;
}
