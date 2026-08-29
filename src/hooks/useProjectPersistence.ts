import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorProject } from '../domain/editor';

export type ProjectSaveState='saved'|'saving'|'error';
export type ProjectSaveStatus={
  state:ProjectSaveState;
  label:string;
  lastSavedAt?:string;
  error?:string;
};

type ChangeHandler=(project:EditorProject)=>void|Promise<void>;

const timeLabel=(date:Date)=>date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});

export function useProjectPersistence(onProjectChange:ChangeHandler){
  const[status,setStatus]=useState<ProjectSaveStatus>({state:'saved',label:'Saved'});
  const sequence=useRef(0);
  const mounted=useRef(true);

  useEffect(()=>()=>{mounted.current=false;},[]);

  const persist=useCallback(async(project:EditorProject,explicit=false)=>{
    const request=++sequence.current;
    if(mounted.current)setStatus(previous=>({...previous,state:'saving',label:explicit?'Saving project…':'Saving…',error:undefined}));
    try{
      await Promise.resolve(onProjectChange(project));
      if(!mounted.current||request!==sequence.current)return;
      const now=new Date();
      setStatus({state:'saved',label:explicit?'Project saved':`Saved ${timeLabel(now)}`,lastSavedAt:now.toISOString()});
    }catch(error){
      if(!mounted.current||request!==sequence.current)return;
      const message=error instanceof Error?error.message:'Kitchen AI could not save this project.';
      setStatus({state:'error',label:'Save failed',error:message});
    }
  },[onProjectChange]);

  const markSaved=useCallback(()=>{
    const now=new Date();
    setStatus({state:'saved',label:`Saved ${timeLabel(now)}`,lastSavedAt:now.toISOString()});
  },[]);

  return{status,persist,saveNow:(project:EditorProject)=>persist(project,true),markSaved};
}
