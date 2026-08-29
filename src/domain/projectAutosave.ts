import { EditorProject } from './editor';
import { parseProject, serializeProject } from './projectIO';

export type AutosavePhase='idle'|'dirty'|'saving'|'saved'|'error';
export type AutosaveStatus={
  phase:AutosavePhase;
  dirty:boolean;
  saving:boolean;
  lastSavedAt?:string;
  error?:string;
  pendingRevision:number;
  savedRevision:number;
};
export type ProjectStorageAdapter={
  save:(key:string,value:string)=>Promise<void>;
  load?:(key:string)=>Promise<string|null>;
  remove?:(key:string)=>Promise<void>;
};
export type AutosaveOptions={
  delayMs?:number;
  includeViewState?:boolean;
  storageKey?:string;
};
export type AutosaveListener=(status:AutosaveStatus)=>void;

type PersistentProject=Omit<EditorProject,'selectedId'|'viewMode'|'view2d'|'camera3d'> & Partial<Pick<EditorProject,'viewMode'|'view2d'|'camera3d'>>;

const persistentProject=(project:EditorProject,includeViewState:boolean):PersistentProject=>{
  const {selectedId:_,viewMode,view2d,camera3d,...design}=project;
  return includeViewState?{...design,viewMode,view2d,camera3d}:design;
};

export function projectAutosaveFingerprint(project:EditorProject,includeViewState=false){
  return JSON.stringify(persistentProject(project,includeViewState));
}

export class ProjectAutosaveController{
  private timer?:ReturnType<typeof setTimeout>;
  private pending?:EditorProject;
  private pendingFingerprint?:string;
  private lastSavedFingerprint?:string;
  private listeners=new Set<AutosaveListener>();
  private revision=0;
  private savedRevision=0;
  private disposed=false;
  private currentStatus:AutosaveStatus={phase:'idle',dirty:false,saving:false,pendingRevision:0,savedRevision:0};

  readonly delayMs:number;
  readonly includeViewState:boolean;
  readonly storageKey:string;

  constructor(private readonly storage:ProjectStorageAdapter,options:AutosaveOptions={}){
    this.delayMs=Math.max(0,options.delayMs??650);
    this.includeViewState=options.includeViewState??false;
    this.storageKey=options.storageKey??'kitchen-ai.active-project';
  }

  get status(){return this.currentStatus;}

  subscribe(listener:AutosaveListener){
    this.listeners.add(listener);
    listener(this.currentStatus);
    return()=>this.listeners.delete(listener);
  }

  private update(patch:Partial<AutosaveStatus>){
    this.currentStatus={...this.currentStatus,...patch,pendingRevision:this.revision,savedRevision:this.savedRevision};
    this.listeners.forEach(listener=>listener(this.currentStatus));
  }

  markSaved(project:EditorProject){
    this.lastSavedFingerprint=projectAutosaveFingerprint(project,this.includeViewState);
    this.savedRevision=this.revision;
    this.update({phase:'saved',dirty:false,saving:false,lastSavedAt:new Date().toISOString(),error:undefined});
  }

  schedule(project:EditorProject){
    if(this.disposed)return false;
    const fingerprint=projectAutosaveFingerprint(project,this.includeViewState);
    if(fingerprint===this.lastSavedFingerprint||fingerprint===this.pendingFingerprint)return false;
    this.revision++;
    this.pending=project;
    this.pendingFingerprint=fingerprint;
    if(this.timer)clearTimeout(this.timer);
    this.update({phase:'dirty',dirty:true,saving:false,error:undefined});
    this.timer=setTimeout(()=>{void this.flush();},this.delayMs);
    return true;
  }

  async flush(){
    if(this.disposed||!this.pending||!this.pendingFingerprint)return false;
    if(this.timer){clearTimeout(this.timer);this.timer=undefined;}
    const project=this.pending,fingerprint=this.pendingFingerprint,revision=this.revision;
    this.pending=undefined;
    this.pendingFingerprint=undefined;
    if(fingerprint===this.lastSavedFingerprint){
      this.savedRevision=revision;
      this.update({phase:'saved',dirty:false,saving:false,error:undefined});
      return false;
    }
    this.update({phase:'saving',dirty:true,saving:true,error:undefined});
    try{
      await this.storage.save(this.storageKey,serializeProject(project));
      this.lastSavedFingerprint=fingerprint;
      this.savedRevision=revision;
      const newerPending=Boolean(this.pendingFingerprint&&this.pendingFingerprint!==fingerprint);
      this.update({phase:newerPending?'dirty':'saved',dirty:newerPending,saving:false,lastSavedAt:new Date().toISOString(),error:undefined});
      return true;
    }catch(error){
      if(!this.pending){this.pending=project;this.pendingFingerprint=fingerprint;}
      this.update({phase:'error',dirty:true,saving:false,error:error instanceof Error?error.message:String(error)});
      return false;
    }
  }

  cancelPending(){
    if(this.timer){clearTimeout(this.timer);this.timer=undefined;}
    this.pending=undefined;
    this.pendingFingerprint=undefined;
    this.update({phase:this.lastSavedFingerprint?'saved':'idle',dirty:false,saving:false,error:undefined});
  }

  async load(){
    if(!this.storage.load)return undefined;
    const value=await this.storage.load(this.storageKey);
    if(!value)return undefined;
    const project=parseProject(value);
    if(project)this.markSaved(project);
    return project??undefined;
  }

  async remove(){
    this.cancelPending();
    if(this.storage.remove)await this.storage.remove(this.storageKey);
    this.lastSavedFingerprint=undefined;
    this.savedRevision=0;
    this.update({phase:'idle',dirty:false,saving:false,lastSavedAt:undefined,error:undefined});
  }

  async dispose(flush=true){
    if(this.disposed)return;
    if(flush)await this.flush();
    if(this.timer)clearTimeout(this.timer);
    this.timer=undefined;
    this.listeners.clear();
    this.disposed=true;
  }
}

export function autosaveStatusLabel(status:AutosaveStatus){
  if(status.phase==='saving')return'Saving…';
  if(status.phase==='dirty')return'Unsaved changes';
  if(status.phase==='error')return`Save error${status.error?`: ${status.error}`:''}`;
  if(status.phase==='saved')return'Saved';
  return'Ready';
}
