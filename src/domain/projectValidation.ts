import { EditorProject, ObjectKind } from './editor';
import { KitchenDesign, RoomModel } from './types';

export const MAX_PROJECT_FILE_BYTES=5_000_000;
export const MAX_PROJECT_OBJECTS=5_000;
export const MAX_TEXT_LENGTH=500;

export type ProjectValidationCode =
  |'invalid-json'
  |'invalid-root'
  |'file-too-large'
  |'dangerous-key'
  |'missing-room'
  |'invalid-room'
  |'missing-design'
  |'invalid-design'
  |'too-many-objects'
  |'invalid-object'
  |'duplicate-object-id';

export type ProjectValidationResult =
  |{ok:true;value:unknown}
  |{ok:false;code:ProjectValidationCode;message:string};

const OBJECT_KINDS:ObjectKind[]=[
  'wall','base-cabinet','sink-base','drawer-base','corner-cabinet','wall-cabinet','glass-upper',
  'tall-cabinet','pantry-cabinet','oven-cabinet','refrigerator-cabinet','island','door','window',
  'appliance','countertop','hardware',
];
const dangerousKeys=new Set(['__proto__','prototype','constructor']);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const text=(value:unknown,max=MAX_TEXT_LENGTH):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function findDangerousKey(value:unknown,depth=0):string|undefined{
  if(depth>16)return undefined;
  if(Array.isArray(value)){
    for(const item of value){const found=findDangerousKey(item,depth+1);if(found)return found;}
    return undefined;
  }
  if(!record(value))return undefined;
  for(const key of Object.keys(value)){
    if(dangerousKeys.has(key))return key;
    const found=findDangerousKey(value[key],depth+1);if(found)return found;
  }
  return undefined;
}

function validRoom(value:unknown):value is RoomModel{
  if(!record(value)||!text(value.id,200))return false;
  const widthM=value.widthM,lengthM=value.lengthM,heightM=value.heightM;
  if(!finite(widthM)||!finite(lengthM)||!finite(heightM))return false;
  if(widthM<1||widthM>50||lengthM<1||lengthM>50||heightM<1||heightM>50)return false;
  const confidence=value.confidence;
  if(confidence!==undefined&&(!finite(confidence)||confidence<0||confidence>1))return false;
  if(value.openings!==undefined&&!Array.isArray(value.openings))return false;
  if(value.photos!==undefined&&!Array.isArray(value.photos))return false;
  return true;
}

function validDesign(value:unknown):value is KitchenDesign{
  if(!record(value))return false;
  if(!text(value.id,200)||!text(value.name,MAX_TEXT_LENGTH))return false;
  if(value.description!==undefined&&typeof value.description!=='string')return false;
  if(value.includesIsland!==undefined&&typeof value.includesIsland!=='boolean')return false;
  return true;
}

function validObject(value:unknown):value is EditorProject['objects'][number]{
  if(!record(value)||!text(value.id,200)||!text(value.name,MAX_TEXT_LENGTH))return false;
  if(typeof value.kind!=='string'||!OBJECT_KINDS.includes(value.kind as ObjectKind))return false;
  const x=value.x,y=value.y,widthIn=value.widthIn,depthIn=value.depthIn,heightIn=value.heightIn,rotation=value.rotation;
  if(!finite(x)||!finite(y)||!finite(widthIn)||!finite(depthIn)||!finite(heightIn)||!finite(rotation))return false;
  if(widthIn<0||depthIn<0||heightIn<0)return false;
  if(Math.abs(x)>100_000||Math.abs(y)>100_000||widthIn>10_000||depthIn>10_000||heightIn>10_000)return false;
  const elevationIn=value.elevationIn;
  if(elevationIn!==undefined&&!finite(elevationIn))return false;
  if(value.color!==undefined&&typeof value.color!=='string')return false;
  if(value.finishId!==undefined&&typeof value.finishId!=='string')return false;
  if(value.wallPaintId!==undefined&&typeof value.wallPaintId!=='string')return false;
  return true;
}

export function validateProjectPayload(value:unknown):ProjectValidationResult{
  if(!record(value))return{ok:false,code:'invalid-root',message:'The Kitchen AI project must be a JSON object.'};
  const dangerous=findDangerousKey(value);
  if(dangerous)return{ok:false,code:'dangerous-key',message:`The project contains a blocked property: ${dangerous}.`};
  if(!('room' in value))return{ok:false,code:'missing-room',message:'The project does not contain a room model.'};
  if(!validRoom(value.room))return{ok:false,code:'invalid-room',message:'The room model contains invalid or unsafe dimensions.'};
  if(!('design' in value))return{ok:false,code:'missing-design',message:'The project does not contain a kitchen design.'};
  if(!validDesign(value.design))return{ok:false,code:'invalid-design',message:'The kitchen design metadata is invalid.'};
  if(value.objects!==undefined){
    if(!Array.isArray(value.objects))return{ok:false,code:'invalid-object',message:'Project objects must be an array.'};
    if(value.objects.length>MAX_PROJECT_OBJECTS)return{ok:false,code:'too-many-objects',message:`The project contains more than ${MAX_PROJECT_OBJECTS} objects.`};
    const ids=new Set<string>();
    for(const object of value.objects){
      if(!validObject(object))return{ok:false,code:'invalid-object',message:'One or more design objects contain invalid data.'};
      if(ids.has(object.id))return{ok:false,code:'duplicate-object-id',message:`The project contains a duplicate object ID: ${object.id}.`};
      ids.add(object.id);
    }
  }
  return{ok:true,value};
}

export function parseAndValidateProjectJson(serialized:string):ProjectValidationResult{
  const bytes=typeof TextEncoder!=='undefined'?new TextEncoder().encode(serialized).byteLength:serialized.length;
  if(bytes>MAX_PROJECT_FILE_BYTES)return{ok:false,code:'file-too-large',message:`Project files must be smaller than ${Math.round(MAX_PROJECT_FILE_BYTES/1_000_000)} MB.`};
  try{return validateProjectPayload(JSON.parse(serialized));}
  catch{return{ok:false,code:'invalid-json',message:'The selected file is not valid JSON.'};}
}
