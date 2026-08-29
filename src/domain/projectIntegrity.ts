import {
  DEFAULT_HARDWARE,
  DEFAULT_TOE_KICK,
  EditorObject,
  EditorProject,
  isBaseLikeKind,
  isCabinetKind,
  isWallCabinetKind,
  objectDefaults,
} from './editor';
import { attachOpening, openingData } from './openings';

export type IntegritySeverity='error'|'warning'|'info';
export type IntegrityIssue={
  id:string;
  severity:IntegritySeverity;
  code:string;
  message:string;
  objectId?:string;
  relatedObjectIds?:string[];
};
export type CascadeDeleteResult={project:EditorProject;removedIds:string[]};

const finite=(value:number)=>Number.isFinite(value);
const now=()=>new Date().toISOString();

export function inspectProjectIntegrity(project:EditorProject):IntegrityIssue[]{
  const issues:IntegrityIssue[]=[];
  const counts=new Map<string,number>();
  for(const object of project.objects)counts.set(object.id,(counts.get(object.id)??0)+1);
  for(const[id,count]of counts){
    if(count>1)issues.push({id:`duplicate-${id}`,severity:'error',code:'duplicate-object-id',message:`Object ID ${id} appears ${count} times.`,objectId:id});
  }
  const ids=new Set(project.objects.map(object=>object.id));
  if(project.selectedId&&!ids.has(project.selectedId))issues.push({id:'missing-selection',severity:'warning',code:'selected-object-missing',message:'The selected object no longer exists.',objectId:project.selectedId});
  const walls=new Set(project.objects.filter(object=>object.kind==='wall').map(object=>object.id));
  for(const object of project.objects){
    if(!finite(object.x)||!finite(object.y)||!finite(object.widthIn)||!finite(object.depthIn)||!finite(object.heightIn)||!finite(object.rotation))issues.push({id:`invalid-number-${object.id}`,severity:'error',code:'invalid-object-number',message:`${object.name} contains a non-finite coordinate or dimension.`,objectId:object.id});
    if(object.widthIn<0||object.depthIn<0||object.heightIn<0)issues.push({id:`negative-size-${object.id}`,severity:'error',code:'negative-object-size',message:`${object.name} contains a negative dimension.`,objectId:object.id});
    if(object.kind==='door'||object.kind==='window'){
      const parent=openingData(object).parentWallId;
      if(parent&&!walls.has(parent))issues.push({id:`orphan-opening-${object.id}`,severity:'error',code:'orphan-opening',message:`${object.name} references a missing wall.`,objectId:object.id,relatedObjectIds:[parent]});
      if(!parent)issues.push({id:`unattached-opening-${object.id}`,severity:'warning',code:'unattached-opening',message:`${object.name} is not attached to a wall.`,objectId:object.id});
    }
    if(isCabinetKind(object.kind)&&!object.hardware)issues.push({id:`missing-hardware-${object.id}`,severity:'warning',code:'missing-hardware-default',message:`${object.name} is missing hardware defaults.`,objectId:object.id});
    if(isBaseLikeKind(object.kind)&&!object.toeKick)issues.push({id:`missing-toe-${object.id}`,severity:'warning',code:'missing-toe-kick-default',message:`${object.name} is missing toe-kick defaults.`,objectId:object.id});
    if(isWallCabinetKind(object.kind)&&object.toeKick)issues.push({id:`upper-toe-${object.id}`,severity:'warning',code:'wall-cabinet-toe-kick',message:`${object.name} should not have a toe kick.`,objectId:object.id});
  }
  return issues;
}

function safeNumber(value:number,fallback:number,min?:number){
  const normalized=finite(value)?value:fallback;
  return min===undefined?normalized:Math.max(min,normalized);
}

function normalizeObject(object:EditorObject):EditorObject{
  const defaults=objectDefaults(object.kind);
  const normalized:EditorObject={
    ...object,
    x:safeNumber(object.x,defaults.x),
    y:safeNumber(object.y,defaults.y),
    widthIn:safeNumber(object.widthIn,defaults.widthIn,0),
    depthIn:safeNumber(object.depthIn,defaults.depthIn,0),
    heightIn:safeNumber(object.heightIn,defaults.heightIn,0),
    rotation:safeNumber(object.rotation,defaults.rotation),
    elevationIn:object.elevationIn===undefined?undefined:safeNumber(object.elevationIn,0),
  };
  if(isCabinetKind(normalized.kind))normalized.hardware={...DEFAULT_HARDWARE,...(normalized.hardware??{})};
  if(isBaseLikeKind(normalized.kind))normalized.toeKick={...DEFAULT_TOE_KICK,...(normalized.toeKick??{}),color:normalized.toeKick?.color??normalized.color??DEFAULT_TOE_KICK.color};
  if(isWallCabinetKind(normalized.kind))normalized.toeKick=undefined;
  return normalized;
}

function uniqueIds(objects:EditorObject[]){
  const used=new Set<string>();
  return objects.map(object=>{
    if(!used.has(object.id)){used.add(object.id);return object;}
    let index=2,next=`${object.id}-repaired-${index}`;
    while(used.has(next)){index++;next=`${object.id}-repaired-${index}`;}
    used.add(next);
    return{...object,id:next,name:`${object.name} Repaired`};
  });
}

export function repairProjectIntegrity(project:EditorProject):EditorProject{
  let repaired:EditorProject={...project,objects:uniqueIds(project.objects.map(normalizeObject)),updatedAt:now()};
  const walls=new Set(repaired.objects.filter(object=>object.kind==='wall').map(object=>object.id));
  repaired={...repaired,objects:repaired.objects.map(object=>{
    if(object.kind!=='door'&&object.kind!=='window')return object;
    const data=openingData(object);
    if(!data.parentWallId||walls.has(data.parentWallId))return object;
    return{...object,parentWallId:undefined} as EditorObject;
  })};
  for(const object of repaired.objects){
    if(object.kind!=='door'&&object.kind!=='window')continue;
    const data=openingData(object);
    if(!data.parentWallId)continue;
    const wall=repaired.objects.find(item=>item.id===data.parentWallId&&item.kind==='wall');
    if(wall)repaired=attachOpening(repaired,object.id,wall.id,data.wallOffsetIn??0);
  }
  const ids=new Set(repaired.objects.map(object=>object.id));
  if(repaired.selectedId&&!ids.has(repaired.selectedId))repaired={...repaired,selectedId:undefined};
  return{...repaired,updatedAt:now()};
}

export function deleteObjectCascade(project:EditorProject,id:string):CascadeDeleteResult{
  const target=project.objects.find(object=>object.id===id);
  if(!target)return{project,removedIds:[]};
  const removed=new Set<string>([id]);
  if(target.kind==='wall'){
    for(const object of project.objects){
      if((object.kind==='door'||object.kind==='window')&&openingData(object).parentWallId===id)removed.add(object.id);
    }
  }
  return{
    removedIds:[...removed],
    project:{...project,objects:project.objects.filter(object=>!removed.has(object.id)),selectedId:project.selectedId&&removed.has(project.selectedId)?undefined:project.selectedId,updatedAt:now()},
  };
}
