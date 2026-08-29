import { EditorObject, EditorProject } from './editor';
import { localToWorld, objectCenter, TransformPoint } from './objectTransform';
import { KitchenDesign } from './types';

export type ObjectAnchor='center'|'north'|'south'|'east'|'west'|'north-east'|'north-west'|'south-east'|'south-west';
export type MeasurementAnchor={type:'point';x:number;y:number}|{type:'object';objectId:string;anchor:ObjectAnchor};
export type MeasurementMode='direct'|'horizontal'|'vertical';
export type MeasurementAnnotation={
  id:string;
  name:string;
  start:MeasurementAnchor;
  end:MeasurementAnchor;
  mode:MeasurementMode;
  offsetIn:number;
  visible:boolean;
  locked:boolean;
  precisionIn:number;
};
export type ResolvedMeasurement={
  id:string;
  valid:boolean;
  name:string;
  start:TransformPoint;
  end:TransformPoint;
  lineStart:TransformPoint;
  lineEnd:TransformPoint;
  distanceIn:number;
  label:string;
  angleDegrees:number;
  missingObjectIds:string[];
};

type DesignWithMetadata=KitchenDesign&{editorMetadata?:{measurements?:MeasurementAnnotation[];[key:string]:unknown}};

const uid=()=>`measurement-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const round=(value:number,increment:number)=>Math.round(value/increment)*increment;
const rounded=(value:number)=>Math.round(value*1000)/1000;
const point=(x:number,y:number):TransformPoint=>({x:rounded(x),y:rounded(y)});

export function projectMeasurements(project:EditorProject):MeasurementAnnotation[]{
  const metadata=(project.design as DesignWithMetadata).editorMetadata;
  return Array.isArray(metadata?.measurements)?metadata!.measurements!.map(item=>({...item,start:{...item.start},end:{...item.end}})):[];
}

export function setProjectMeasurements(project:EditorProject,measurements:MeasurementAnnotation[]):EditorProject{
  const design=project.design as DesignWithMetadata;
  return{
    ...project,
    design:{...design,editorMetadata:{...(design.editorMetadata??{}),measurements:measurements.map(item=>({...item,start:{...item.start},end:{...item.end}}))}},
    updatedAt:new Date().toISOString(),
  };
}

export function addMeasurement(project:EditorProject,measurement:Omit<MeasurementAnnotation,'id'>|MeasurementAnnotation):EditorProject{
  const next:'id' extends keyof typeof measurement?MeasurementAnnotation:MeasurementAnnotation='id'in measurement?measurement:{...measurement,id:uid()} as MeasurementAnnotation;
  return setProjectMeasurements(project,[...projectMeasurements(project),{...next,start:{...next.start},end:{...next.end}}]);
}

export function updateMeasurement(project:EditorProject,id:string,patch:Partial<MeasurementAnnotation>):EditorProject{
  const measurements=projectMeasurements(project),index=measurements.findIndex(item=>item.id===id);
  if(index<0)return project;
  measurements[index]={...measurements[index],...patch,start:patch.start?{...patch.start}:measurements[index].start,end:patch.end?{...patch.end}:measurements[index].end};
  return setProjectMeasurements(project,measurements);
}

export function deleteMeasurement(project:EditorProject,id:string):EditorProject{
  const current=projectMeasurements(project),next=current.filter(item=>item.id!==id);
  return next.length===current.length?project:setProjectMeasurements(project,next);
}

function anchorPosition(object:EditorObject,anchor:ObjectAnchor):TransformPoint{
  const center=objectCenter(object),halfWidth=object.widthIn/2,halfDepth=object.depthIn/2;
  const local=anchor==='center'?{x:0,y:0}:anchor==='north'?{x:0,y:-halfDepth}:anchor==='south'?{x:0,y:halfDepth}:anchor==='east'?{x:halfWidth,y:0}:anchor==='west'?{x:-halfWidth,y:0}:anchor==='north-east'?{x:halfWidth,y:-halfDepth}:anchor==='north-west'?{x:-halfWidth,y:-halfDepth}:anchor==='south-east'?{x:halfWidth,y:halfDepth}:{x:-halfWidth,y:halfDepth};
  const world=localToWorld(local,object.rotation);
  return point(center.x+world.x,center.y+world.y);
}

export function resolveMeasurementAnchor(project:EditorProject,anchor:MeasurementAnchor):{point:TransformPoint;missingObjectId?:string}{
  if(anchor.type==='point')return{point:point(anchor.x,anchor.y)};
  const object=project.objects.find(item=>item.id===anchor.objectId);
  return object?{point:anchorPosition(object,anchor.anchor)}:{point:{x:0,y:0},missingObjectId:anchor.objectId};
}

export function formatMeasurement(valueIn:number,precisionIn=.125){
  const safe=Math.max(0,Number.isFinite(valueIn)?valueIn:0),roundedIn=round(safe,Math.max(.001,precisionIn));
  const feet=Math.floor(roundedIn/12),inches=roundedIn-feet*12;
  const inchText=Math.abs(inches-Math.round(inches))<.001?`${Math.round(inches)}`:`${Math.round(inches*1000)/1000}`;
  return feet>0?`${feet}' ${inchText}\"`:`${inchText}\"`;
}

export function resolveMeasurement(project:EditorProject,measurement:MeasurementAnnotation):ResolvedMeasurement{
  const startResult=resolveMeasurementAnchor(project,measurement.start),endResult=resolveMeasurementAnchor(project,measurement.end),missing=[startResult.missingObjectId,endResult.missingObjectId].filter((value):value is string=>Boolean(value));
  const start=startResult.point,end=endResult.point,dx=end.x-start.x,dy=end.y-start.y;
  let lineStart={...start},lineEnd={...end},distanceIn=Math.hypot(dx,dy);
  if(measurement.mode==='horizontal'){
    const y=Math.max(start.y,end.y)+measurement.offsetIn;
    lineStart=point(start.x,y);lineEnd=point(end.x,y);distanceIn=Math.abs(dx);
  }else if(measurement.mode==='vertical'){
    const x=Math.max(start.x,end.x)+measurement.offsetIn;
    lineStart=point(x,start.y);lineEnd=point(x,end.y);distanceIn=Math.abs(dy);
  }else if(distanceIn>0&&measurement.offsetIn!==0){
    const normal={x:-dy/distanceIn,y:dx/distanceIn};
    lineStart=point(start.x+normal.x*measurement.offsetIn,start.y+normal.y*measurement.offsetIn);
    lineEnd=point(end.x+normal.x*measurement.offsetIn,end.y+normal.y*measurement.offsetIn);
  }
  return{
    id:measurement.id,
    valid:missing.length===0&&Number.isFinite(distanceIn),
    name:measurement.name,
    start,end,lineStart,lineEnd,
    distanceIn:rounded(distanceIn),
    label:formatMeasurement(distanceIn,measurement.precisionIn),
    angleDegrees:rounded(Math.atan2(lineEnd.y-lineStart.y,lineEnd.x-lineStart.x)*180/Math.PI),
    missingObjectIds:[...new Set(missing)],
  };
}

export function resolveProjectMeasurements(project:EditorProject){
  return projectMeasurements(project).filter(item=>item.visible).map(item=>resolveMeasurement(project,item));
}

export function createObjectDimension(objectId:string,axis:'width'|'depth',name?:string):Omit<MeasurementAnnotation,'id'>{
  return{
    name:name??(axis==='width'?'Object Width':'Object Depth'),
    start:{type:'object',objectId,anchor:axis==='width'?'west':'north'},
    end:{type:'object',objectId,anchor:axis==='width'?'east':'south'},
    mode:'direct',offsetIn:axis==='width'?-8:8,visible:true,locked:false,precisionIn:.125,
  };
}

export function createObjectClearance(firstObjectId:string,secondObjectId:string,name='Object Clearance'):Omit<MeasurementAnnotation,'id'>{
  return{name,start:{type:'object',objectId:firstObjectId,anchor:'center'},end:{type:'object',objectId:secondObjectId,anchor:'center'},mode:'direct',offsetIn:0,visible:true,locked:false,precisionIn:.125};
}

export function createPointMeasurement(start:TransformPoint,end:TransformPoint,mode:MeasurementMode='direct',name='Plan Measurement'):Omit<MeasurementAnnotation,'id'>{
  return{name,start:{type:'point',...point(start.x,start.y)},end:{type:'point',...point(end.x,end.y)},mode,offsetIn:0,visible:true,locked:false,precisionIn:.125};
}

export function removeMeasurementsForDeletedObjects(project:EditorProject,deletedIds:string[]):EditorProject{
  const removed=new Set(deletedIds),measurements=projectMeasurements(project),next=measurements.filter(item=>!(item.start.type==='object'&&removed.has(item.start.objectId))&&!(item.end.type==='object'&&removed.has(item.end.objectId)));
  return next.length===measurements.length?project:setProjectMeasurements(project,next);
}
