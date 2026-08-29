import { EditorObject, EditorProject, objectDefaults } from './editor';
import { openingData } from './openings';

export type Point2D={x:number;y:number};
export type WallTurn=-90|0|90;
export type WallCreateOptions={
  start?:Point2D;
  lengthIn?:number;
  heightIn?:number;
  thicknessIn?:number;
  rotation?:number;
};

const normalized=(degrees:number)=>((degrees%360)+360)%360;
const radians=(degrees:number)=>normalized(degrees)*Math.PI/180;
const distance=(a:Point2D,b:Point2D)=>Math.hypot(a.x-b.x,a.y-b.y);
const uniqueId=(prefix:string)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export function wallStart(wall:EditorObject):Point2D{return{x:wall.x,y:wall.y};}
export function wallEnd(wall:EditorObject):Point2D{
  const angle=radians(wall.rotation);
  return{x:wall.x+Math.cos(angle)*wall.widthIn,y:wall.y+Math.sin(angle)*wall.widthIn};
}
export function wallEndpoints(walls:EditorObject[]):Array<{wallId:string;position:'start'|'end';point:Point2D}>{
  return walls.filter(wall=>wall.kind==='wall').flatMap(wall=>[
    {wallId:wall.id,position:'start' as const,point:wallStart(wall)},
    {wallId:wall.id,position:'end' as const,point:wallEnd(wall)},
  ]);
}
export function nearestWallEndpoint(point:Point2D,walls:EditorObject[],excludeWallId?:string,toleranceIn=6){
  return wallEndpoints(walls)
    .filter(endpoint=>endpoint.wallId!==excludeWallId)
    .map(endpoint=>({...endpoint,distance:distance(point,endpoint.point)}))
    .filter(endpoint=>endpoint.distance<=toleranceIn)
    .sort((a,b)=>a.distance-b.distance)[0];
}

export function addWall(project:EditorProject,options:WallCreateOptions={}):EditorProject{
  const walls=project.objects.filter(object=>object.kind==='wall');
  const start=options.start??(walls.length?{x:wallEnd(walls[walls.length-1]).x+24,y:wallEnd(walls[walls.length-1]).y}:{x:120,y:120});
  const wall=objectDefaults('wall',{
    id:uniqueId('wall'),
    name:`Wall ${walls.length+1}`,
    x:start.x,
    y:start.y,
    widthIn:Math.max(12,options.lengthIn??120),
    heightIn:Math.max(48,options.heightIn??96),
    depthIn:Math.max(2,options.thicknessIn??4.5),
    rotation:normalized(options.rotation??0),
  });
  return{...project,objects:[...project.objects,wall],selectedId:wall.id,updatedAt:new Date().toISOString()};
}

export function continueWall(project:EditorProject,wallId=project.selectedId,turn:WallTurn=0,lengthIn?:number):EditorProject{
  const source=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!source)return addWall(project,{lengthIn});
  const start=wallEnd(source),rotation=normalized(source.rotation+turn);
  const wall=objectDefaults('wall',{
    id:uniqueId('wall'),
    name:`Wall ${project.objects.filter(object=>object.kind==='wall').length+1}`,
    x:start.x,
    y:start.y,
    widthIn:Math.max(12,lengthIn??source.widthIn),
    heightIn:source.heightIn,
    depthIn:source.depthIn,
    rotation,
    color:source.color,
    wallPaintId:source.wallPaintId,
    material:source.material,
  });
  const proposedEnd=wallEnd(wall);
  const snap=nearestWallEndpoint(proposedEnd,project.objects,source.id,6);
  const finalWall=snap?{...wall,widthIn:Math.max(12,distance(start,snap.point)),rotation:normalized(Math.atan2(snap.point.y-start.y,snap.point.x-start.x)*180/Math.PI)}:wall;
  return{...project,objects:[...project.objects,finalWall],selectedId:finalWall.id,updatedAt:new Date().toISOString()};
}

export function closeWallLoop(project:EditorProject,wallId=project.selectedId):EditorProject{
  const source=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!source)return project;
  const start=wallEnd(source);
  const candidates=wallEndpoints(project.objects)
    .filter(endpoint=>endpoint.wallId!==source.id)
    .map(endpoint=>({...endpoint,distance:distance(start,endpoint.point)}))
    .filter(endpoint=>endpoint.distance>=12)
    .sort((a,b)=>a.distance-b.distance);
  const target=candidates[0];
  if(!target)return project;
  const rotation=normalized(Math.atan2(target.point.y-start.y,target.point.x-start.x)*180/Math.PI);
  const wall=objectDefaults('wall',{
    id:uniqueId('wall'),
    name:`Wall ${project.objects.filter(object=>object.kind==='wall').length+1}`,
    x:start.x,
    y:start.y,
    widthIn:target.distance,
    heightIn:source.heightIn,
    depthIn:source.depthIn,
    rotation,
    color:source.color,
    wallPaintId:source.wallPaintId,
    material:source.material,
  });
  return{...project,objects:[...project.objects,wall],selectedId:wall.id,updatedAt:new Date().toISOString()};
}

export function deleteWall(project:EditorProject,wallId:string,openings:'delete'|'detach'='delete'):EditorProject{
  const wall=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!wall)return project;
  const objects=project.objects.flatMap(object=>{
    if(object.id===wallId)return[];
    if((object.kind==='door'||object.kind==='window')&&openingData(object).parentWallId===wallId){
      if(openings==='delete')return[];
      return[{...object,openingSpec:{...openingData(object),parentWallId:undefined}} as EditorObject];
    }
    return[object];
  });
  return{...project,objects,selectedId:project.selectedId===wallId?undefined:project.selectedId,updatedAt:new Date().toISOString()};
}

export function connectedWallIds(project:EditorProject,toleranceIn=1):Set<string>{
  const walls=project.objects.filter(object=>object.kind==='wall');
  const connected=new Set<string>();
  for(const wall of walls){
    const start=wallStart(wall),end=wallEnd(wall);
    if(walls.some(other=>other.id!==wall.id&&[wallStart(other),wallEnd(other)].some(point=>distance(start,point)<=toleranceIn)))connected.add(wall.id);
    if(walls.some(other=>other.id!==wall.id&&[wallStart(other),wallEnd(other)].some(point=>distance(end,point)<=toleranceIn)))connected.add(wall.id);
  }
  return connected;
}
