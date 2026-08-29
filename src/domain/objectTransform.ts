import { EditorObject } from './editor';

export type ResizeHandle='n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw';
export type TransformPoint={x:number;y:number};
export type ResizeOptions={minWidthIn?:number;minDepthIn?:number;snapIncrementIn?:number};
export type SelectionBounds={left:number;top:number;right:number;bottom:number;width:number;height:number;centerX:number;centerY:number};

const radians=(degrees:number)=>degrees*Math.PI/180;
const degrees=(value:number)=>value*180/Math.PI;
const round=(value:number)=>Math.round(value*100)/100;
const clamp=(value:number,min:number)=>Math.max(min,value);
const includes=(handle:ResizeHandle,direction:string)=>handle.includes(direction);
const snap=(value:number,increment:number|undefined)=>increment&&increment>0?Math.round(value/increment)*increment:value;

export function objectCenter(object:EditorObject):TransformPoint{
  return{x:object.x+object.widthIn/2,y:object.y+object.depthIn/2};
}

export function localToWorld(vector:TransformPoint,rotation:number):TransformPoint{
  const angle=radians(rotation),cos=Math.cos(angle),sin=Math.sin(angle);
  return{x:vector.x*cos-vector.y*sin,y:vector.x*sin+vector.y*cos};
}

export function worldToLocal(vector:TransformPoint,rotation:number):TransformPoint{
  const angle=radians(rotation),cos=Math.cos(angle),sin=Math.sin(angle);
  return{x:vector.x*cos+vector.y*sin,y:-vector.x*sin+vector.y*cos};
}

export function resizeObject(object:EditorObject,handle:ResizeHandle,worldDelta:TransformPoint,options:ResizeOptions={}):EditorObject{
  const minWidth=options.minWidthIn??3,minDepth=options.minDepthIn??3,local=worldToLocal(worldDelta,object.rotation);
  const east=includes(handle,'e'),west=includes(handle,'w'),north=includes(handle,'n'),south=includes(handle,'s');
  let width=object.widthIn,depth=object.depthIn;
  if(east)width=object.widthIn+local.x;
  if(west)width=object.widthIn-local.x;
  if(south)depth=object.depthIn+local.y;
  if(north)depth=object.depthIn-local.y;
  width=clamp(snap(width,options.snapIncrementIn),minWidth);
  depth=clamp(snap(depth,options.snapIncrementIn),minDepth);
  const widthChange=width-object.widthIn,depthChange=depth-object.depthIn;
  const shiftLocal={
    x:east?widthChange/2:west?-widthChange/2:0,
    y:south?depthChange/2:north?-depthChange/2:0,
  };
  const shiftWorld=localToWorld(shiftLocal,object.rotation),center=objectCenter(object);
  return{
    ...object,
    x:round(center.x+shiftWorld.x-width/2),
    y:round(center.y+shiftWorld.y-depth/2),
    widthIn:round(width),
    depthIn:round(depth),
  };
}

export function rotateObjectTowardPoint(object:EditorObject,pointer:TransformPoint,snapDegrees=15):EditorObject{
  const center=objectCenter(object),raw=degrees(Math.atan2(pointer.y-center.y,pointer.x-center.x));
  const increment=Math.max(1,Math.min(90,snapDegrees));
  const rotation=round(Math.round(raw/increment)*increment);
  return{...object,rotation};
}

export function nudgeObject(object:EditorObject,delta:TransformPoint,snapIncrementIn?:number):EditorObject{
  const x=snap(object.x+delta.x,snapIncrementIn),y=snap(object.y+delta.y,snapIncrementIn);
  return{...object,x:round(x),y:round(y)};
}

export function selectionBounds(object:EditorObject):SelectionBounds{
  const center=objectCenter(object),angle=radians(object.rotation),cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
  const width=object.widthIn*cos+object.depthIn*sin,height=object.widthIn*sin+object.depthIn*cos;
  return{left:round(center.x-width/2),top:round(center.y-height/2),right:round(center.x+width/2),bottom:round(center.y+height/2),width:round(width),height:round(height),centerX:round(center.x),centerY:round(center.y)};
}

export function localEdgeCenter(object:EditorObject,edge:'n'|'s'|'e'|'w'):TransformPoint{
  const local=edge==='e'?{x:object.widthIn/2,y:0}:edge==='w'?{x:-object.widthIn/2,y:0}:edge==='s'?{x:0,y:object.depthIn/2}:{x:0,y:-object.depthIn/2};
  const center=objectCenter(object),world=localToWorld(local,object.rotation);
  return{x:round(center.x+world.x),y:round(center.y+world.y)};
}
