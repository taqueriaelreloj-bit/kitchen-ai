import { generateDesigns } from './design';
import { createEditorProject, EditorObject, EditorProject, objectDefaults } from './editor';
import { RoomModel } from './types';

export type RoomShape='Rectangle'|'L-Shape'|'U-Shape';
export type RoomMeasurementInput={
  widthIn:number;
  lengthIn:number;
  heightIn:number;
  shape:RoomShape;
  projectName?:string;
};
export type RoomPreset={
  id:string;
  name:string;
  widthIn:number;
  lengthIn:number;
  heightIn:number;
  shape:RoomShape;
  description:string;
};
export type MeasuredRoomValidation={valid:boolean;errors:string[]};

export const ROOM_PRESETS:RoomPreset[]=[
  {id:'small-galley',name:'Small Galley',widthIn:96,lengthIn:120,heightIn:96,shape:'Rectangle',description:'8 × 10 ft compact kitchen.'},
  {id:'standard-10x12',name:'Standard Kitchen',widthIn:120,lengthIn:144,heightIn:96,shape:'Rectangle',description:'10 × 12 ft standard room.'},
  {id:'large-12x14',name:'Large Kitchen',widthIn:144,lengthIn:168,heightIn:108,shape:'Rectangle',description:'12 × 14 ft room with 9 ft ceiling.'},
  {id:'open-14x16',name:'Open Kitchen',widthIn:168,lengthIn:192,heightIn:108,shape:'L-Shape',description:'14 × 16 ft open-plan kitchen.'},
  {id:'u-shape-12x15',name:'U-Shape Kitchen',widthIn:144,lengthIn:180,heightIn:96,shape:'U-Shape',description:'12 × 15 ft three-sided layout.'},
];

const meters=(inches:number)=>inches/39.3700787402;
const round=(value:number)=>Math.round(value*10000)/10000;

export function validateMeasuredRoom(input:RoomMeasurementInput):MeasuredRoomValidation{
  const errors:string[]=[];
  if(!Number.isFinite(input.widthIn)||input.widthIn<60||input.widthIn>600)errors.push('Room width must be between 5 ft and 50 ft.');
  if(!Number.isFinite(input.lengthIn)||input.lengthIn<60||input.lengthIn>600)errors.push('Room length must be between 5 ft and 50 ft.');
  if(!Number.isFinite(input.heightIn)||input.heightIn<72||input.heightIn>240)errors.push('Ceiling height must be between 6 ft and 20 ft.');
  if(!['Rectangle','L-Shape','U-Shape'].includes(input.shape))errors.push('Choose a supported room shape.');
  return{valid:errors.length===0,errors};
}

export function measuredRoomModel(input:RoomMeasurementInput):RoomModel{
  const validation=validateMeasuredRoom(input);
  if(!validation.valid)throw new Error(validation.errors.join(' '));
  return{
    id:`manual-room-${Date.now()}`,
    widthM:round(meters(input.widthIn)),
    lengthM:round(meters(input.lengthIn)),
    heightM:round(meters(input.heightIn)),
    layout:input.shape==='Rectangle'?'I':input.shape==='L-Shape'?'L':'U',
    openings:[],
    confidence:1,
    source:'manual-measurements',
    photos:[],
  } as RoomModel;
}

function wall(id:string,name:string,x:number,y:number,widthIn:number,heightIn:number,rotation:number):EditorObject{
  return objectDefaults('wall',{id,name,x,y,widthIn,heightIn,depthIn:4.5,rotation});
}

export function measuredRoomWalls(input:RoomMeasurementInput):EditorObject[]{
  const {widthIn,lengthIn,heightIn,shape}=input;
  const origin={x:120,y:120};
  if(shape==='Rectangle')return[
    wall('wall-north','North Wall',origin.x,origin.y,widthIn,heightIn,0),
    wall('wall-east','East Wall',origin.x+widthIn,origin.y,lengthIn,heightIn,90),
    wall('wall-south','South Wall',origin.x+widthIn,origin.y+lengthIn,widthIn,heightIn,180),
    wall('wall-west','West Wall',origin.x,origin.y+lengthIn,lengthIn,heightIn,270),
  ];
  if(shape==='L-Shape'){
    const notchWidth=Math.max(36,widthIn*.38),notchDepth=Math.max(36,lengthIn*.38);
    return[
      wall('wall-north','North Wall',origin.x,origin.y,widthIn,heightIn,0),
      wall('wall-east-upper','East Upper Wall',origin.x+widthIn,origin.y,lengthIn-notchDepth,heightIn,90),
      wall('wall-notch-horizontal','Notch Wall',origin.x+widthIn,origin.y+lengthIn-notchDepth,notchWidth,heightIn,180),
      wall('wall-notch-vertical','Notch Return',origin.x+widthIn-notchWidth,origin.y+lengthIn-notchDepth,notchDepth,heightIn,90),
      wall('wall-south','South Wall',origin.x+widthIn-notchWidth,origin.y+lengthIn,widthIn-notchWidth,heightIn,180),
      wall('wall-west','West Wall',origin.x,origin.y+lengthIn,lengthIn,heightIn,270),
    ];
  }
  const returnDepth=Math.max(48,lengthIn*.38);
  return[
    wall('wall-north','North Wall',origin.x,origin.y,widthIn,heightIn,0),
    wall('wall-east','East Wall',origin.x+widthIn,origin.y,returnDepth,heightIn,90),
    wall('wall-east-return','East Return',origin.x+widthIn,origin.y+returnDepth,widthIn*.28,heightIn,180),
    wall('wall-west','West Wall',origin.x,origin.y,returnDepth,heightIn,90),
    wall('wall-west-return','West Return',origin.x,origin.y+returnDepth,widthIn*.28,heightIn,0),
  ];
}

export function createMeasuredRoomProject(input:RoomMeasurementInput):EditorProject{
  const room=measuredRoomModel(input),design=generateDesigns(room)[0];
  const project=createEditorProject(room,design,input.projectName?.trim()||'Measured Kitchen');
  return{
    ...project,
    objects:measuredRoomWalls(input),
    selectedId:undefined,
    updatedAt:new Date().toISOString(),
  };
}

export function roomPreset(id:string){return ROOM_PRESETS.find(preset=>preset.id===id);}
export function createProjectFromPreset(id:string,projectName?:string){
  const preset=roomPreset(id);
  if(!preset)throw new Error(`Unknown room preset: ${id}`);
  return createMeasuredRoomProject({...preset,projectName});
}
