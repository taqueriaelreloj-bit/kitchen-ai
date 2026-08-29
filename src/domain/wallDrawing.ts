import { EditorObject, EditorProject, objectDefaults } from './editor';
import { attachOpening, openingData, openingsForWall } from './openings';

export type PlanPoint={x:number;y:number};
export type WallSegmentOptions={
  id?:string;
  name?:string;
  heightIn?:number;
  thicknessIn?:number;
  color?:string;
  wallPaintId?:string;
  material?:string;
};
export type WallEndpoints={start:PlanPoint;end:PlanPoint};
export type WallConnection={wallId:string;end:'start'|'end';distanceIn:number};

const radians=(degrees:number)=>degrees*Math.PI/180;
const degrees=(radiansValue:number)=>radiansValue*180/Math.PI;
const round=(value:number)=>Math.round(value*100)/100;
const distance=(a:PlanPoint,b:PlanPoint)=>Math.hypot(a.x-b.x,a.y-b.y);

export function wallEndpoints(wall:EditorObject):WallEndpoints{
  if(wall.kind!=='wall')throw new Error('Wall endpoints require a wall object.');
  const angle=radians(wall.rotation);
  return{
    start:{x:wall.x,y:wall.y},
    end:{x:round(wall.x+Math.cos(angle)*wall.widthIn),y:round(wall.y+Math.sin(angle)*wall.widthIn)},
  };
}

export function createWallSegment(start:PlanPoint,end:PlanPoint,options:WallSegmentOptions={}):EditorObject{
  const length=distance(start,end);
  if(length<.25)throw new Error('A wall segment must be at least 0.25 inches long.');
  const rotation=round(degrees(Math.atan2(end.y-start.y,end.x-start.x)));
  return objectDefaults('wall',{
    ...(options.id?{id:options.id}:{}),
    name:options.name??'Wall',
    x:round(start.x),
    y:round(start.y),
    widthIn:round(length),
    heightIn:options.heightIn??96,
    depthIn:options.thicknessIn??4.5,
    rotation,
    color:options.color,
    wallPaintId:options.wallPaintId,
    material:options.material??'Painted drywall',
  });
}

export function snapWallEndpoint(start:PlanPoint,rawEnd:PlanPoint,angleIncrementDegrees=45):PlanPoint{
  const length=distance(start,rawEnd);
  if(length===0)return{...start};
  const rawAngle=degrees(Math.atan2(rawEnd.y-start.y,rawEnd.x-start.x));
  const increment=Math.max(1,Math.min(90,angleIncrementDegrees));
  const angle=radians(Math.round(rawAngle/increment)*increment);
  return{x:round(start.x+Math.cos(angle)*length),y:round(start.y+Math.sin(angle)*length)};
}

function wallOptions(source:EditorObject):WallSegmentOptions{
  return{
    heightIn:source.heightIn,
    thicknessIn:source.depthIn,
    color:source.color,
    wallPaintId:source.wallPaintId,
    material:source.material,
  };
}

export function continueWall(project:EditorProject,sourceWallId:string,lengthIn:number,turnDegrees=0):EditorProject{
  const source=project.objects.find(object=>object.id===sourceWallId&&object.kind==='wall');
  if(!source||!Number.isFinite(lengthIn)||lengthIn<.25)return project;
  const start=wallEndpoints(source).end;
  const angle=radians(source.rotation+turnDegrees);
  const end={x:start.x+Math.cos(angle)*lengthIn,y:start.y+Math.sin(angle)*lengthIn};
  const wall=createWallSegment(start,end,{...wallOptions(source),name:'Continued Wall'});
  return{...project,objects:[...project.objects,wall],selectedId:wall.id,updatedAt:new Date().toISOString()};
}

export function continueWallToPoint(project:EditorProject,sourceWallId:string,end:PlanPoint,snapIncrementDegrees?:number):EditorProject{
  const source=project.objects.find(object=>object.id===sourceWallId&&object.kind==='wall');
  if(!source)return project;
  const start=wallEndpoints(source).end;
  const target=snapIncrementDegrees?snapWallEndpoint(start,end,snapIncrementDegrees):end;
  if(distance(start,target)<.25)return project;
  const wall=createWallSegment(start,target,{...wallOptions(source),name:'Continued Wall'});
  return{...project,objects:[...project.objects,wall],selectedId:wall.id,updatedAt:new Date().toISOString()};
}

export function moveWallEnd(project:EditorProject,wallId:string,newEnd:PlanPoint):EditorProject{
  const wall=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!wall)return project;
  const start=wallEndpoints(wall).start;
  if(distance(start,newEnd)<.25)return project;
  const replacement=createWallSegment(start,newEnd,{...wallOptions(wall),id:wall.id,name:wall.name});
  let next:EditorProject={...project,objects:project.objects.map(object=>object.id===wallId?replacement:object),updatedAt:new Date().toISOString()};
  for(const opening of openingsForWall(next.objects,wallId)){
    const maximum=Math.max(0,replacement.widthIn-opening.widthIn);
    const offset=Math.max(0,Math.min(maximum,openingData(opening).wallOffsetIn??0));
    next=attachOpening(next,opening.id,wallId,offset);
  }
  return next;
}

export function moveWallStart(project:EditorProject,wallId:string,newStart:PlanPoint):EditorProject{
  const wall=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!wall)return project;
  const old=wallEndpoints(wall),newLength=distance(newStart,old.end);
  if(newLength<.25)return project;
  const oldAngle=radians(wall.rotation);
  const shiftAlong=(newStart.x-old.start.x)*Math.cos(oldAngle)+(newStart.y-old.start.y)*Math.sin(oldAngle);
  const replacement=createWallSegment(newStart,old.end,{...wallOptions(wall),id:wall.id,name:wall.name});
  let next:EditorProject={...project,objects:project.objects.map(object=>object.id===wallId?replacement:object),updatedAt:new Date().toISOString()};
  for(const opening of openingsForWall(next.objects,wallId)){
    const maximum=Math.max(0,replacement.widthIn-opening.widthIn);
    const offset=Math.max(0,Math.min(maximum,(openingData(opening).wallOffsetIn??0)-shiftAlong));
    next=attachOpening(next,opening.id,wallId,offset);
  }
  return next;
}

export function wallConnections(wall:EditorObject,walls:EditorObject[],toleranceIn=2):WallConnection[]{
  const endpoints=wallEndpoints(wall),connections:WallConnection[]=[];
  for(const candidate of walls){
    if(candidate.id===wall.id||candidate.kind!=='wall')continue;
    const other=wallEndpoints(candidate);
    const choices:[PlanPoint,'start'|'end'][]=[[other.start,'start'],[other.end,'end']];
    for(const[point,end]of choices){
      const startDistance=distance(endpoints.start,point),endDistance=distance(endpoints.end,point);
      if(startDistance<=toleranceIn)connections.push({wallId:candidate.id,end,distanceIn:round(startDistance)});
      if(endDistance<=toleranceIn)connections.push({wallId:candidate.id,end,distanceIn:round(endDistance)});
    }
  }
  return connections.sort((a,b)=>a.distanceIn-b.distanceIn||a.wallId.localeCompare(b.wallId));
}

export function connectedWallIds(startWallId:string,walls:EditorObject[],toleranceIn=2):string[]{
  const byId=new Map(walls.filter(wall=>wall.kind==='wall').map(wall=>[wall.id,wall]));
  if(!byId.has(startWallId))return[];
  const visited=new Set<string>(),queue=[startWallId];
  while(queue.length){
    const id=queue.shift()!;
    if(visited.has(id))continue;
    visited.add(id);
    const wall=byId.get(id)!;
    for(const connection of wallConnections(wall,[...byId.values()],toleranceIn))if(!visited.has(connection.wallId))queue.push(connection.wallId);
  }
  return[...visited];
}
