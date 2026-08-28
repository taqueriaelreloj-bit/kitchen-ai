import { CABINET_FINISHES } from './catalogs';
import { createIsland, updateCountertop, updateIsland } from './countertops';
import { generateDesigns } from './design';
import { EditorObject, EditorProject, isCabinetKind, objectDefaults } from './editor';
import { findIslandPosition } from './layoutValidation';
import { isLighting } from './lighting';

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
const inches=(meters:number)=>meters*39.3701;
const rect=(x:number,y:number,width:number,depth:number):Rect=>({left:x,top:y,right:x+width,bottom:y+depth});
const overlaps=(a:Rect,b:Rect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const objectRect=(object:EditorObject)=>{
  const rotation=((object.rotation%360)+360)%360,vertical=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
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
  return base.map((design,index)=>({id:`ai-${design.style}-${layouts[index]}`,name:`${layouts[index]} · ${design.name}`,description:design.description,layout:layouts[index],style:design.style,includesIsland:design.includesIsland&&layouts[index]!=='Galley'}));
}

const cabinet=(kind:EditorObject['kind'],id:string,name:string,x:number,y:number,widthIn:number,rotation=0)=>objectDefaults(kind,{id,name,x,y,widthIn,rotation});
function row(startX:number,startY:number,totalWidth:number,prefix:string,rotation=0):EditorObject[]{
  const widths=[24,30,36,24,30,36];
  const objects:EditorObject[]=[];let cursor=0,index=0;
  while(cursor<totalWidth-18&&index<10){
    const width=Math.min(widths[index%widths.length],Math.max(18,totalWidth-cursor));
    objects.push(cabinet(index===1?'drawer-base':index===2?'sink-base':'base-cabinet',`${prefix}-base-${index}`,index===2?'Sink Base':index===1?'Drawer Base':'Base Cabinet',startX+(rotation===90?0:cursor),startY+(rotation===90?cursor:0),width,rotation));
    objects.push(objectDefaults('wall-cabinet',{id:`${prefix}-upper-${index}`,name:'Wall Cabinet',x:startX+(rotation===90?0:cursor),y:startY+(rotation===90?cursor:0),widthIn:width,rotation}));
    cursor+=width;index++;
  }
  return objects;
}

function moveApplianceAwayFromSink(appliance:EditorObject,sink:EditorObject|undefined):EditorObject{
  if(!sink)return appliance;
  const applianceArea=objectRect(appliance),sinkArea=objectRect(sink);
  if(!overlaps(applianceArea,sinkArea))return appliance;
  const rotation=((appliance.rotation%360)+360)%360,vertical=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
  if(vertical)return {...appliance,y:appliance.y+(sinkArea.bottom-applianceArea.top)+2};
  return {...appliance,x:appliance.x+(sinkArea.right-applianceArea.left)+2};
}

function addCoreAppliances(objects:EditorObject[],layout:AILayoutType,runX:number,runY:number):EditorObject[]{
  const refrigeratorProps:Partial<EditorObject>={x:120+Math.max(0,runX-36),y:120,rotation:0};
  const rangeProps:Partial<EditorObject>={x:120,y:120,rotation:0};
  if(layout==='L-Shape')Object.assign(rangeProps,{x:120,y:150+Math.max(12,Math.min(runY-30,runY*.48)),rotation:90});
  if(layout==='Galley')Object.assign(rangeProps,{x:120+Math.max(18,Math.min(runX-30,runX*.45)),y:240,rotation:0});
  if(layout==='U-Shape')Object.assign(refrigeratorProps,{x:120,y:150+Math.max(12,runY-36),rotation:90});
  const sink=objects.find(object=>object.kind==='sink-base');
  let refrigerator=objectDefaults('appliance',{id:'ai-refrigerator',name:'Refrigerator',widthIn:36,depthIn:30,heightIn:70,color:'#A7ADAE',material:'Stainless Steel',...refrigeratorProps});
  let range=objectDefaults('appliance',{id:'ai-range',name:'Range',widthIn:30,depthIn:28,heightIn:36,color:'#555B5C',material:'Stainless Steel',...rangeProps});
  refrigerator=moveApplianceAwayFromSink(refrigerator,sink);
  range=moveApplianceAwayFromSink(range,sink);
  const applianceRects=[objectRect(refrigerator),objectRect(range)];
  const cleared=objects.filter(object=>object.kind==='sink-base'||!applianceRects.some(area=>overlaps(objectRect(object),area)));
  return [...cleared,refrigerator,range];
}

export function applyAIDesignSuggestion(project:EditorProject,suggestion:AIDesignSuggestion):EditorProject{
  const preserved=project.objects.filter(object=>object.kind==='wall'||object.kind==='door'||object.kind==='window'||isLighting(object)||(!isCabinetKind(object.kind)&&object.kind!=='countertop'&&object.kind!=='appliance'));
  const roomWidth=Math.max(96,inches(project.room.widthM)),roomLength=Math.max(96,inches(project.room.lengthM));
  const runX=Math.min(roomWidth-24,144),runY=Math.min(roomLength-24,132);
  let generated:EditorObject[]=[];
  if(suggestion.layout==='Single Wall')generated.push(...row(120,120,runX,'ai-north'));
  if(suggestion.layout==='L-Shape'){generated.push(...row(120,120,runX,'ai-north'));generated.push(...row(120,150,Math.max(60,runY-36),'ai-west',90));}
  if(suggestion.layout==='Galley'){generated.push(...row(120,120,runX,'ai-galley-a'));generated.push(...row(120,240,runX,'ai-galley-b'));}
  if(suggestion.layout==='U-Shape'){generated.push(...row(120,120,runX,'ai-north'));generated.push(...row(120,150,Math.max(60,runY-36),'ai-west',90));generated.push(...row(120+runX,150,Math.max(60,runY-36),'ai-east',90));}
  generated=addCoreAppliances(generated,suggestion.layout,runX,runY);
  const finish=cabinetFinishForStyle(suggestion.style);
  generated=generated.map(object=>isCabinetKind(object.kind)?{...object,color:finish.baseColor,finishId:finish.id,toeKick:object.toeKick?{...object.toeKick,color:finish.baseColor,finish:finish.finishType}:object.toeKick}:object);
  const islandWidth=Math.min(84,Math.max(60,roomWidth*.42)),islandDepth=42;
  const islandPosition=suggestion.includesIsland?findIslandPosition(generated,roomWidth,roomLength,islandWidth,islandDepth,36):undefined;
  const includesIsland=Boolean(islandPosition);
  let next:EditorProject={...project,design:{...project.design,style:suggestion.style,cabinetColor:suggestion.style==='warm'?'wood':suggestion.style==='modern'?'white':'navy',includesIsland},objects:[...preserved,...generated],selectedId:undefined,updatedAt:new Date().toISOString()};
  if(islandPosition){
    const island=createIsland({id:'ai-island',name:'AI Island',x:islandPosition.x,y:islandPosition.y,widthIn:islandWidth,depthIn:islandDepth,color:finish.baseColor,finishId:finish.id});
    next={...next,objects:[...next.objects,island],selectedId:island.id};
    next=updateIsland(next,island.id,{seatingCount:3,sink:suggestion.style!=='classic',dishwasher:suggestion.style!=='classic'});
    next=updateCountertop(next,island.id,{materialId:suggestion.style==='classic'?'quartz-calacatta':'quartz-white'});
  }
  return next;
}
