import { EditorObject, isCabinetKind } from './editor';

export type CabinetWallPlacement={
  wallId:string;
  wallOffsetIn:number;
  x:number;
  y:number;
  rotation:number;
  distanceIn:number;
};

export type CabinetRunIssue={
  previousId:string;
  nextId:string;
  type:'gap'|'overlap';
  amountIn:number;
};

type Point={x:number;y:number};
const radians=(degrees:number)=>degrees*Math.PI/180;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round=(value:number)=>Math.round(value*100)/100;
const centerOf=(object:EditorObject):Point=>({x:object.x+object.widthIn/2,y:object.y+object.depthIn/2});
const wallVectors=(wall:EditorObject)=>{
  const angle=radians(wall.rotation);
  return{along:{x:Math.cos(angle),y:Math.sin(angle)},normal:{x:-Math.sin(angle),y:Math.cos(angle)}};
};
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const subtract=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const scale=(point:Point,value:number):Point=>({x:point.x*value,y:point.y*value});

export function placeCabinetOnWall(cabinet:EditorObject,wall:EditorObject,requestedOffsetIn:number,clearanceIn=0):CabinetWallPlacement{
  if(wall.kind!=='wall')throw new Error('Cabinets can only be placed on wall objects.');
  if(!isCabinetKind(cabinet.kind)||cabinet.kind==='island')throw new Error('Only wall-based cabinets can be snapped to a wall.');
  const{along,normal}=wallVectors(wall);
  const maximumOffset=Math.max(0,wall.widthIn-cabinet.widthIn);
  const wallOffsetIn=clamp(requestedOffsetIn,0,maximumOffset);
  const wallSurface=add({x:wall.x,y:wall.y},scale(normal,wall.depthIn/2));
  const desiredCenter=add(add(wallSurface,scale(along,wallOffsetIn+cabinet.widthIn/2)),scale(normal,cabinet.depthIn/2+clearanceIn));
  const currentCenter=centerOf(cabinet);
  return{
    wallId:wall.id,
    wallOffsetIn:round(wallOffsetIn),
    x:round(desiredCenter.x-cabinet.widthIn/2),
    y:round(desiredCenter.y-cabinet.depthIn/2),
    rotation:wall.rotation,
    distanceIn:round(Math.hypot(currentCenter.x-desiredCenter.x,currentCenter.y-desiredCenter.y)),
  };
}

export function nearestWallPlacement(cabinet:EditorObject,walls:EditorObject[],maximumDistanceIn=72):CabinetWallPlacement|undefined{
  let best:CabinetWallPlacement|undefined;
  for(const wall of walls){
    if(wall.kind!=='wall')continue;
    const{along,normal}=wallVectors(wall);
    const center=centerOf(cabinet);
    const wallSurface=add({x:wall.x,y:wall.y},scale(normal,wall.depthIn/2));
    const projected=clamp(dot(subtract(center,wallSurface),along)-cabinet.widthIn/2,0,Math.max(0,wall.widthIn-cabinet.widthIn));
    const placement=placeCabinetOnWall(cabinet,wall,projected);
    if(placement.distanceIn<=maximumDistanceIn&&(!best||placement.distanceIn<best.distanceIn))best=placement;
  }
  return best;
}

export function applyCabinetPlacement(objects:EditorObject[],cabinetId:string,placement:CabinetWallPlacement):EditorObject[]{
  return objects.map(object=>object.id===cabinetId?{...object,x:placement.x,y:placement.y,rotation:placement.rotation}:object);
}

export function normalizeCabinetRun(objects:EditorObject[],wall:EditorObject,cabinetIds:string[],startOffsetIn=0,gapIn=0):EditorObject[]{
  const selected=cabinetIds.map(id=>objects.find(object=>object.id===id)).filter((object):object is EditorObject=>Boolean(object&&isCabinetKind(object.kind)&&object.kind!=='island'));
  let offset=clamp(startOffsetIn,0,wall.widthIn);
  const placements=new Map<string,CabinetWallPlacement>();
  for(const cabinet of selected){
    const placement=placeCabinetOnWall(cabinet,wall,offset);
    placements.set(cabinet.id,placement);
    offset=placement.wallOffsetIn+cabinet.widthIn+gapIn;
  }
  return objects.map(object=>{
    const placement=placements.get(object.id);
    return placement?{...object,x:placement.x,y:placement.y,rotation:placement.rotation}:object;
  });
}

export function cabinetRunIssues(objects:EditorObject[],wall:EditorObject,cabinetIds:string[],toleranceIn=.25):CabinetRunIssue[]{
  const{along,normal}=wallVectors(wall);
  const wallSurface=add({x:wall.x,y:wall.y},scale(normal,wall.depthIn/2));
  const cabinets=cabinetIds.map(id=>objects.find(object=>object.id===id)).filter((object):object is EditorObject=>Boolean(object&&isCabinetKind(object.kind)&&object.kind!=='island')).map(object=>({
    object,
    offset:dot(subtract(centerOf(object),wallSurface),along)-object.widthIn/2,
  })).sort((a,b)=>a.offset-b.offset);
  const issues:CabinetRunIssue[]=[];
  for(let index=1;index<cabinets.length;index++){
    const previous=cabinets[index-1],next=cabinets[index];
    const difference=next.offset-(previous.offset+previous.object.widthIn);
    if(Math.abs(difference)<=toleranceIn)continue;
    issues.push({previousId:previous.object.id,nextId:next.object.id,type:difference>0?'gap':'overlap',amountIn:round(Math.abs(difference))});
  }
  return issues;
}
