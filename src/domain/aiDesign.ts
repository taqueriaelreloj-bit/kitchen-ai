import { CABINET_FINISHES } from './catalogs';
import { createIsland, updateCountertop, updateIsland } from './countertops';
import { generateDesigns } from './design';
import {
  EditorObject, EditorProject, isBaseCabinetKind, isCabinetKind, isTallCabinetKind,
  isWallCabinetKind, objectDefaults,
} from './editor';
import { findIslandPosition } from './layoutValidation';
import { isLighting } from './lighting';
import { openingData } from './openings';

export type AILayoutType = 'Single Wall'|'L-Shape'|'Galley'|'U-Shape';
export type AIDesignSuggestion = {
  id:string;
  name:string;
  description:string;
  layout:AILayoutType;
  style:'warm'|'modern'|'classic';
  includesIsland:boolean;
};

type Rect={left:number;top:number;right:number;bottom:number};
type Placement={x:number;y:number;rotation:number};
type OpeningZone={kind:'door'|'window';area:Rect};

const inches=(meters:number)=>meters*39.3701;
const rect=(x:number,y:number,width:number,depth:number):Rect=>({left:x,top:y,right:x+width,bottom:y+depth});
const overlaps=(a:Rect,b:Rect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const normalizedRotation=(value:number)=>((value%360)+360)%360;

const objectRect=(object:EditorObject):Rect=>{
  const rotation=normalizedRotation(object.rotation),vertical=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
  if(!vertical)return rect(object.x,object.y,object.widthIn,object.depthIn);
  const centerX=object.x+object.widthIn/2,centerY=object.y+object.depthIn/2;
  return rect(centerX-object.depthIn/2,centerY-object.widthIn/2,object.depthIn,object.widthIn);
};

const cabinetFinishForStyle=(style:AIDesignSuggestion['style'])=>{
  const target=style==='warm'?'White Oak':style==='modern'?'Warm White':'Navy';
  return CABINET_FINISHES.find(item=>item.name===target)??CABINET_FINISHES[0];
};

export function aiDesignSuggestions(project:EditorProject):AIDesignSuggestion[]{
  const base=generateDesigns(project.room);
  const width=inches(project.room.widthM),length=inches(project.room.lengthM);
  const layouts:AILayoutType[]=width>=132&&length>=144?['L-Shape','U-Shape','Galley']:width>=108?['L-Shape','Galley','Single Wall']:['Single Wall','L-Shape','Galley'];
  return base.map((design,index)=>({
    id:`ai-${design.style}-${layouts[index]}`,
    name:`${layouts[index]} · ${design.name}`,
    description:design.description,
    layout:layouts[index],
    style:design.style,
    includesIsland:design.includesIsland&&layouts[index]!=='Galley',
  }));
}

const cabinet=(kind:EditorObject['kind'],id:string,name:string,x:number,y:number,widthIn:number,rotation=0)=>objectDefaults(kind,{id,name,x,y,widthIn,rotation});
function row(startX:number,startY:number,totalWidth:number,prefix:string,rotation=0):EditorObject[]{
  const widths=[24,30,36,24,30,36];
  const objects:EditorObject[]=[];let cursor=0,index=0;
  while(cursor<totalWidth-18&&index<10){
    const width=Math.min(widths[index%widths.length],Math.max(18,totalWidth-cursor));
    const x=startX+(rotation===90?0:cursor),y=startY+(rotation===90?cursor:0);
    objects.push(cabinet(index===1?'drawer-base':index===2?'sink-base':'base-cabinet',`${prefix}-base-${index}`,index===2?'Sink Base':index===1?'Drawer Base':'Base Cabinet',x,y,width,rotation));
    objects.push(objectDefaults('wall-cabinet',{id:`${prefix}-upper-${index}`,name:'Wall Cabinet',x,y,widthIn:width,rotation}));
    cursor+=width;index++;
  }
  return objects;
}

function openingClearZones(project:EditorProject):OpeningZone[]{
  const zones:OpeningZone[]=[];
  for(const opening of project.objects){
    if(opening.kind!=='door'&&opening.kind!=='window')continue;
    const data=openingData(opening);
    const wall=data.parentWallId?project.objects.find(object=>object.id===data.parentWallId&&object.kind==='wall'):undefined;
    if(!wall)continue;
    const rotation=normalizedRotation(wall.rotation),offset=Math.max(0,Math.min(wall.widthIn-opening.widthIn,data.wallOffsetIn??0));
    const radians=rotation*Math.PI/180;
    const centerAlong=offset+opening.widthIn/2;
    const centerX=wall.x+Math.cos(radians)*centerAlong-Math.sin(radians)*(wall.depthIn/2);
    const centerY=wall.y+Math.sin(radians)*centerAlong+Math.cos(radians)*(wall.depthIn/2);
    const vertical=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
    const clearanceDepth=opening.kind==='door'?104:96;
    const clearanceWidth=opening.widthIn+6;
    zones.push({
      kind:opening.kind,
      area:vertical
        ? rect(centerX-clearanceDepth/2,centerY-clearanceWidth/2,clearanceDepth,clearanceWidth)
        : rect(centerX-clearanceWidth/2,centerY-clearanceDepth/2,clearanceWidth,clearanceDepth),
    });
  }
  return zones;
}

function clearCabinetryForOpenings(objects:EditorObject[],zones:OpeningZone[]):EditorObject[]{
  if(!zones.length)return objects;
  return objects.filter(object=>{
    if(!isCabinetKind(object.kind))return true;
    for(const zone of zones){
      if(!overlaps(objectRect(object),zone.area))continue;
      if(zone.kind==='door')return false;
      if(isWallCabinetKind(object.kind)||isTallCabinetKind(object.kind))return false;
    }
    return true;
  });
}

function appliance(kind:'Refrigerator'|'Range',placement:Placement):EditorObject{
  return kind==='Refrigerator'
    ? objectDefaults('appliance',{id:'ai-refrigerator',name:'Refrigerator',widthIn:36,depthIn:30,heightIn:70,color:'#A7ADAE',material:'Stainless Steel',...placement})
    : objectDefaults('appliance',{id:'ai-range',name:'Range',widthIn:30,depthIn:28,heightIn:36,color:'#555B5C',material:'Stainless Steel',...placement});
}

const uniquePlacements=(items:Placement[])=>items.filter((item,index)=>items.findIndex(other=>other.x===item.x&&other.y===item.y&&other.rotation===item.rotation)===index);
function northRunPlacements(widthIn:number,runX:number,preferredX:number,y=120):Placement[]{
  return uniquePlacements([
    {x:preferredX,y,rotation:0},
    {x:120+Math.max(0,(runX-widthIn)/2),y,rotation:0},
    {x:120,y,rotation:0},
    {x:120+Math.max(0,runX-widthIn),y,rotation:0},
  ]);
}
function verticalRunPlacements(widthIn:number,runY:number,preferredY:number,x=120):Placement[]{
  const length=Math.max(60,runY-36);
  return uniquePlacements([
    {x,y:preferredY,rotation:90},
    {x,y:150+Math.max(0,(length-widthIn)/2),rotation:90},
    {x,y:150,rotation:90},
    {x,y:150+Math.max(0,length-widthIn),rotation:90},
  ]);
}

function corePlacementCandidates(kind:'Refrigerator'|'Range',layout:AILayoutType,runX:number,runY:number):Placement[]{
  if(kind==='Refrigerator'){
    if(layout==='U-Shape')return verticalRunPlacements(36,runY,150+Math.max(12,runY-36));
    return northRunPlacements(36,runX,120+Math.max(0,runX-36));
  }
  if(layout==='L-Shape')return verticalRunPlacements(30,runY,150+Math.max(12,Math.min(runY-30,runY*.48)));
  if(layout==='Galley')return northRunPlacements(30,runX,120+Math.max(18,Math.min(runX-30,runX*.45)),240);
  if(layout==='U-Shape')return northRunPlacements(30,runX,120+Math.max(36,Math.min(runX-30,runX*.55)));
  return northRunPlacements(30,runX,120);
}

function choosePlacement(kind:'Refrigerator'|'Range',candidates:Placement[],zones:OpeningZone[],occupied:EditorObject[]=[]):EditorObject{
  const forbidden=zones.map(zone=>zone.area);
  for(const candidate of candidates){
    const proposed=appliance(kind,candidate),area=objectRect(proposed);
    if(forbidden.some(zone=>overlaps(area,zone)))continue;
    if(occupied.some(object=>overlaps(area,objectRect(object))))continue;
    return proposed;
  }
  return appliance(kind,candidates[0]);
}

function ensureSinkBase(objects:EditorObject[],appliances:EditorObject[],zones:OpeningZone[]):EditorObject[]{
  if(objects.some(object=>object.kind==='sink-base'))return objects;
  const available=objects.find(object=>isBaseCabinetKind(object.kind)&&!appliances.some(item=>overlaps(objectRect(object),objectRect(item))));
  if(available)return objects.map(object=>object.id===available.id?{...object,kind:'sink-base',name:'Sink Base'}:object);
  const doorZones=zones.filter(zone=>zone.kind==='door').map(zone=>zone.area);
  const candidates=[
    objectDefaults('sink-base',{id:'ai-fallback-sink',name:'Sink Base',x:174,y:120,widthIn:36}),
    objectDefaults('sink-base',{id:'ai-fallback-sink',name:'Sink Base',x:210,y:120,widthIn:36}),
    objectDefaults('sink-base',{id:'ai-fallback-sink',name:'Sink Base',x:120,y:204,widthIn:36,rotation:90}),
  ];
  const fallback=candidates.find(candidate=>{
    const area=objectRect(candidate);
    return !appliances.some(item=>overlaps(area,objectRect(item)))&&!doorZones.some(zone=>overlaps(area,zone))&&!objects.some(item=>isCabinetKind(item.kind)&&overlaps(area,objectRect(item)));
  });
  return fallback?[...objects,fallback]:objects;
}

function addCoreAppliances(objects:EditorObject[],layout:AILayoutType,runX:number,runY:number,zones:OpeningZone[]):EditorObject[]{
  const refrigerator=choosePlacement('Refrigerator',corePlacementCandidates('Refrigerator',layout,runX,runY),zones);
  const range=choosePlacement('Range',corePlacementCandidates('Range',layout,runX,runY),zones,[refrigerator]);
  const appliances=[refrigerator,range];
  const cleared=objects.filter(object=>!isCabinetKind(object.kind)||!appliances.some(item=>overlaps(objectRect(object),objectRect(item))));
  return [...ensureSinkBase(cleared,appliances,zones),...appliances];
}

export function applyAIDesignSuggestion(project:EditorProject,suggestion:AIDesignSuggestion):EditorProject{
  const preserved=project.objects.filter(object=>
    object.kind==='wall'||object.kind==='door'||object.kind==='window'||isLighting(object)||
    (!isCabinetKind(object.kind)&&object.kind!=='countertop'&&object.kind!=='appliance')
  );
  const roomWidth=Math.max(96,inches(project.room.widthM)),roomLength=Math.max(96,inches(project.room.lengthM));
  const runX=Math.min(roomWidth-24,144),runY=Math.min(roomLength-24,132);
  const zones=openingClearZones(project);
  let generated:EditorObject[]=[];
  if(suggestion.layout==='Single Wall')generated.push(...row(120,120,runX,'ai-north'));
  if(suggestion.layout==='L-Shape'){generated.push(...row(120,120,runX,'ai-north'));generated.push(...row(120,150,Math.max(60,runY-36),'ai-west',90));}
  if(suggestion.layout==='Galley'){generated.push(...row(120,120,runX,'ai-galley-a'));generated.push(...row(120,240,runX,'ai-galley-b'));}
  if(suggestion.layout==='U-Shape'){generated.push(...row(120,120,runX,'ai-north'));generated.push(...row(120,150,Math.max(60,runY-36),'ai-west',90));generated.push(...row(120+runX,150,Math.max(60,runY-36),'ai-east',90));}
  generated=clearCabinetryForOpenings(generated,zones);
  generated=addCoreAppliances(generated,suggestion.layout,runX,runY,zones);
  const finish=cabinetFinishForStyle(suggestion.style);
  generated=generated.map(object=>isCabinetKind(object.kind)?{
    ...object,color:finish.baseColor,finishId:finish.id,
    toeKick:object.toeKick?{...object.toeKick,color:finish.baseColor,finish:finish.finishType}:object.toeKick,
  }:object);
  const islandWidth=Math.min(84,Math.max(60,roomWidth*.42)),islandDepth=42;
  const islandPosition=suggestion.includesIsland?findIslandPosition(generated,roomWidth,roomLength,islandWidth,islandDepth,36):undefined;
  const includesIsland=Boolean(islandPosition);
  let next:EditorProject={
    ...project,
    design:{...project.design,style:suggestion.style,cabinetColor:suggestion.style==='warm'?'wood':suggestion.style==='modern'?'white':'navy',includesIsland},
    objects:[...preserved,...generated],selectedId:undefined,updatedAt:new Date().toISOString(),
  };
  if(islandPosition){
    const island=createIsland({id:'ai-island',name:'AI Island',x:islandPosition.x,y:islandPosition.y,widthIn:islandWidth,depthIn:islandDepth,color:finish.baseColor,finishId:finish.id});
    next={...next,objects:[...next.objects,island],selectedId:island.id};
    next=updateIsland(next,island.id,{seatingCount:3,sink:suggestion.style!=='classic',dishwasher:suggestion.style!=='classic'});
    next=updateCountertop(next,island.id,{materialId:suggestion.style==='classic'?'quartz-calacatta':'quartz-white'});
  }
  return next;
}
