import { EditorObject, isCabinetKind } from './editor';

export type WallSnapGuide={
  wallId:string;
  start:{x:number;y:number};
  end:{x:number;y:number};
};
export type WallSnapResult={
  x:number;
  y:number;
  rotation:number;
  wallId?:string;
  cabinetId?:string;
  distanceIn:number;
  guide?:WallSnapGuide;
};

type Point={x:number;y:number};
type Segment={start:Point;end:Point;length:number;unit:Point;normal:Point};

const radians=(degrees:number)=>degrees*Math.PI/180;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const subtract=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const scale=(point:Point,value:number):Point=>({x:point.x*value,y:point.y*value});
const normalizedRotation=(value:number)=>((value%360)+360)%360;

export function wallSegment(wall:EditorObject):Segment{
  const angle=radians(wall.rotation),unit={x:Math.cos(angle),y:Math.sin(angle)};
  const start={x:wall.x,y:wall.y},end={x:start.x+unit.x*wall.widthIn,y:start.y+unit.y*wall.widthIn};
  return{start,end,length:wall.widthIn,unit,normal:{x:-unit.y,y:unit.x}};
}

function projectToSegment(point:Point,segment:Segment){
  const relative=subtract(point,segment.start);
  const along=Math.max(0,Math.min(segment.length,dot(relative,segment.unit)));
  const projected=add(segment.start,scale(segment.unit,along));
  return{point:projected,along,distance:distance(point,projected)};
}

function objectCenter(object:EditorObject,x=object.x,y=object.y):Point{
  return{x:x+object.widthIn/2,y:y+object.depthIn/2};
}

function cabinetBackCenter(object:EditorObject,x=object.x,y=object.y,rotation=object.rotation):Point{
  const center=objectCenter(object,x,y),angle=radians(rotation),normal={x:-Math.sin(angle),y:Math.cos(angle)};
  return add(center,scale(normal,-object.depthIn/2));
}

function originFromCenter(object:EditorObject,center:Point):Point{
  return{x:center.x-object.widthIn/2,y:center.y-object.depthIn/2};
}

export function snapObjectToWall(
  object:EditorObject,
  proposed:{x:number;y:number},
  walls:EditorObject[],
  thresholdIn=18,
):WallSnapResult{
  const proposedCenter=objectCenter(object,proposed.x,proposed.y);
  let best:WallSnapResult={x:proposed.x,y:proposed.y,rotation:object.rotation,distanceIn:Number.POSITIVE_INFINITY};
  for(const wall of walls.filter(item=>item.kind==='wall')){
    const segment=wallSegment(wall),projection=projectToSegment(proposedCenter,segment);
    if(projection.distance>thresholdIn)continue;
    const side=dot(subtract(proposedCenter,projection.point),segment.normal)>=0?1:-1;
    const clearance=wall.depthIn/2+object.depthIn/2;
    const snappedCenter=add(projection.point,scale(segment.normal,clearance*side));
    const origin=originFromCenter(object,snappedCenter);
    const result:WallSnapResult={
      x:Math.round(origin.x*100)/100,
      y:Math.round(origin.y*100)/100,
      rotation:normalizedRotation(wall.rotation),
      wallId:wall.id,
      distanceIn:Math.round(projection.distance*100)/100,
      guide:{wallId:wall.id,start:segment.start,end:segment.end},
    };
    if(result.distanceIn<best.distanceIn)best=result;
  }
  return Number.isFinite(best.distanceIn)?best:{x:proposed.x,y:proposed.y,rotation:object.rotation,distanceIn:Number.POSITIVE_INFINITY};
}

function sameRunRotation(a:EditorObject,b:EditorObject,tolerance=.5){
  const difference=Math.abs(normalizedRotation(a.rotation)-normalizedRotation(b.rotation));
  return difference<=tolerance||Math.abs(difference-360)<=tolerance;
}

function runCoordinates(object:EditorObject,x=object.x,y=object.y){
  const angle=radians(object.rotation),unit={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-unit.y,y:unit.x};
  const center=objectCenter(object,x,y);
  return{
    along:dot(center,unit),
    across:dot(center,normal),
    start:dot(center,unit)-object.widthIn/2,
    end:dot(center,unit)+object.widthIn/2,
    unit,
    normal,
  };
}

export function snapObjectToCabinet(
  object:EditorObject,
  proposed:{x:number;y:number;rotation?:number},
  objects:EditorObject[],
  thresholdIn=5,
):WallSnapResult{
  const moving={...object,rotation:proposed.rotation??object.rotation};
  const movingRun=runCoordinates(moving,proposed.x,proposed.y);
  let best:WallSnapResult={x:proposed.x,y:proposed.y,rotation:moving.rotation,distanceIn:Number.POSITIVE_INFINITY};
  for(const target of objects){
    if(target.id===object.id||!isCabinetKind(target.kind)||!sameRunRotation(moving,target))continue;
    const targetRun=runCoordinates(target);
    const acrossDistance=Math.abs(movingRun.across-targetRun.across);
    if(acrossDistance>thresholdIn)continue;
    const candidates=[targetRun.start-movingRun.end,targetRun.end-movingRun.start];
    const delta=candidates.sort((a,b)=>Math.abs(a)-Math.abs(b))[0];
    if(Math.abs(delta)>thresholdIn)continue;
    const center=objectCenter(moving,proposed.x,proposed.y);
    const snappedCenter=add(center,add(scale(movingRun.unit,delta),scale(movingRun.normal,targetRun.across-movingRun.across)));
    const origin=originFromCenter(moving,snappedCenter);
    const score=Math.hypot(delta,acrossDistance);
    if(score<best.distanceIn)best={x:Math.round(origin.x*100)/100,y:Math.round(origin.y*100)/100,rotation:moving.rotation,cabinetId:target.id,distanceIn:Math.round(score*100)/100};
  }
  return best;
}

export function snapObjectToKitchen(
  object:EditorObject,
  proposed:{x:number;y:number},
  objects:EditorObject[],
  options:{wallThresholdIn?:number;cabinetThresholdIn?:number;preferCabinet?:boolean}={},
):WallSnapResult{
  const wall=snapObjectToWall(object,proposed,objects,options.wallThresholdIn??18);
  const aligned={x:wall.x,y:wall.y,rotation:Number.isFinite(wall.distanceIn)?wall.rotation:object.rotation};
  const cabinet=snapObjectToCabinet({...object,rotation:aligned.rotation},aligned,objects,options.cabinetThresholdIn??5);
  if(Number.isFinite(cabinet.distanceIn)&&(options.preferCabinet!==false||!Number.isFinite(wall.distanceIn))){
    return{...cabinet,wallId:wall.wallId,guide:wall.guide,distanceIn:Math.min(cabinet.distanceIn,wall.distanceIn)};
  }
  return wall;
}

export function cabinetBackDistanceToWall(object:EditorObject,wall:EditorObject){
  const segment=wallSegment(wall),back=cabinetBackCenter(object),projection=projectToSegment(back,segment);
  return projection.distance;
}
