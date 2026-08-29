import { EditorObject, EditorProject, ObjectKind, objectDefaults } from './editor';
import { openingData } from './openings';

export type CabinetRunLevel='base'|'wall';
export type WallInterval={startIn:number;endIn:number;lengthIn:number};
export type CabinetRunOptions={
  level:CabinetRunLevel;
  startOffsetIn?:number;
  endOffsetIn?:number;
  standardWidthsIn?:number[];
  sideClearanceIn?:number;
  interiorSide?:1|-1;
  includeWindowBases?:boolean;
  windowBaseSillMinimumIn?:number;
  elevationIn?:number;
  cabinetDepthIn?:number;
  cabinetHeightIn?:number;
  idPrefix?:string;
};
export type CabinetRunResult={
  wallId:string;
  level:CabinetRunLevel;
  generated:EditorObject[];
  availableIntervals:WallInterval[];
  unusedIntervals:WallInterval[];
  totalAvailableIn:number;
  totalCabinetIn:number;
  utilizationPercent:number;
};

type Block={start:number;end:number};

export const STANDARD_BASE_WIDTHS_IN=[36,33,30,27,24,21,18,15,12,9];
export const STANDARD_WALL_WIDTHS_IN=[36,33,30,27,24,21,18,15,12,9];

const round=(value:number,places=2)=>{const factor=10**places;return Math.round(value*factor)/factor;};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const radians=(degrees:number)=>degrees*Math.PI/180;
const interval=(start:number,end:number):WallInterval=>({startIn:round(start),endIn:round(end),lengthIn:round(Math.max(0,end-start))});

function mergedBlocks(blocks:Block[],start:number,end:number):Block[]{
  const normalized=blocks
    .map(block=>({start:clamp(block.start,start,end),end:clamp(block.end,start,end)}))
    .filter(block=>block.end-block.start>.01)
    .sort((a,b)=>a.start-b.start);
  const merged:Block[]=[];
  for(const block of normalized){
    const previous=merged[merged.length-1];
    if(previous&&block.start<=previous.end+.01)previous.end=Math.max(previous.end,block.end);
    else merged.push({...block});
  }
  return merged;
}

function freeIntervals(start:number,end:number,blocks:Block[]):WallInterval[]{
  const merged=mergedBlocks(blocks,start,end),result:WallInterval[]=[];
  let cursor=start;
  for(const block of merged){
    if(block.start>cursor+.01)result.push(interval(cursor,block.start));
    cursor=Math.max(cursor,block.end);
  }
  if(cursor<end-.01)result.push(interval(cursor,end));
  return result;
}

function openingBlocks(project:EditorProject,wall:EditorObject,options:CabinetRunOptions):Block[]{
  const clearance=Math.max(0,options.sideClearanceIn??3);
  const windowMinimum=options.windowBaseSillMinimumIn??38;
  const blocks:Block[]=[];
  for(const object of project.objects){
    if(object.kind!=='door'&&object.kind!=='window')continue;
    const data=openingData(object);
    if(data.parentWallId!==wall.id)continue;
    const offset=clamp(data.wallOffsetIn??0,0,Math.max(0,wall.widthIn-object.widthIn));
    const blocksLevel=object.kind==='door'
      ||options.level==='wall'
      ||options.includeWindowBases===false
      ||(data.sillHeightIn??object.elevationIn??36)<windowMinimum;
    if(blocksLevel)blocks.push({start:offset-clearance,end:offset+object.widthIn+clearance});
  }
  return blocks;
}

function bestWidthCombination(lengthIn:number,widths:number[]):number[]{
  const target=Math.max(0,Math.floor(lengthIn+.0001));
  const usable=[...new Set(widths.map(value=>Math.round(value)).filter(value=>value>0&&value<=target))].sort((a,b)=>b-a);
  if(!usable.length)return[];
  const best:Array<number[]|undefined>=Array(target+1).fill(undefined);
  best[0]=[];
  for(let total=1;total<=target;total++){
    for(const width of usable){
      if(total<width||!best[total-width])continue;
      const candidate=[...best[total-width]!,width];
      const current=best[total];
      if(!current||candidate.length<current.length||(
        candidate.length===current.length&&candidate.join(',')>current.join(',')
      ))best[total]=candidate;
    }
  }
  for(let total=target;total>=0;total--)if(best[total])return best[total]!.sort((a,b)=>b-a);
  return[];
}

function cabinetKind(level:CabinetRunLevel,index:number,count:number):ObjectKind{
  if(level==='wall')return'wall-cabinet';
  if(count>=3&&index===Math.floor(count/2))return'sink-base';
  if(index%4===1)return'drawer-base';
  return'base-cabinet';
}

function cabinetPosition(
  wall:EditorObject,
  alongCenterIn:number,
  widthIn:number,
  depthIn:number,
  interiorSide:1|-1,
){
  const angle=radians(wall.rotation),unit={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-unit.y,y:unit.x};
  const center={
    x:wall.x+unit.x*alongCenterIn+normal.x*(wall.depthIn/2+depthIn/2)*interiorSide,
    y:wall.y+unit.y*alongCenterIn+normal.y*(wall.depthIn/2+depthIn/2)*interiorSide,
  };
  return{x:round(center.x-widthIn/2),y:round(center.y-depthIn/2)};
}

export function generateCabinetRun(project:EditorProject,wallId:string,options:CabinetRunOptions):CabinetRunResult{
  const wall=project.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!wall)throw new Error(`Wall not found: ${wallId}`);
  const start=clamp(options.startOffsetIn??0,0,wall.widthIn);
  const end=clamp(options.endOffsetIn??wall.widthIn,start,wall.widthIn);
  const widths=options.standardWidthsIn??(options.level==='base'?STANDARD_BASE_WIDTHS_IN:STANDARD_WALL_WIDTHS_IN);
  const available=freeIntervals(start,end,openingBlocks(project,wall,options)).filter(value=>value.lengthIn>=Math.min(...widths));
  const generated:EditorObject[]=[],unused:WallInterval[]=[];
  const interiorSide=options.interiorSide??1;
  const depth=options.cabinetDepthIn??(options.level==='base'?24:12);
  const height=options.cabinetHeightIn??(options.level==='base'?34.5:30);
  const elevation=options.elevationIn??(options.level==='base'?0:54);
  const prefix=options.idPrefix??`run-${wall.id}-${options.level}`;

  available.forEach((space,spaceIndex)=>{
    const combination=bestWidthCombination(space.lengthIn,widths);
    const total=combination.reduce((sum,value)=>sum+value,0);
    if(total<=0){unused.push(space);return;}
    const leadingGap=(space.lengthIn-total)/2;
    let cursor=space.startIn+leadingGap;
    combination.forEach((width,index)=>{
      const kind=cabinetKind(options.level,index,combination.length);
      const alongCenter=cursor+width/2;
      const position=cabinetPosition(wall,alongCenter,width,depth,interiorSide);
      generated.push(objectDefaults(kind,{
        id:`${prefix}-${spaceIndex}-${index}`,
        name:options.level==='base'?(kind==='sink-base'?'Sink Base':kind==='drawer-base'?'Drawer Base':'Base Cabinet'):'Wall Cabinet',
        ...position,widthIn:width,depthIn:depth,heightIn:height,elevationIn:elevation,rotation:wall.rotation,
      }));
      cursor+=width;
    });
    if(leadingGap>.01)unused.push(interval(space.startIn,space.startIn+leadingGap));
    const trailing=space.endIn-(space.startIn+leadingGap+total);
    if(trailing>.01)unused.push(interval(space.endIn-trailing,space.endIn));
  });

  const totalAvailable=available.reduce((sum,value)=>sum+value.lengthIn,0);
  const totalCabinet=generated.reduce((sum,value)=>sum+value.widthIn,0);
  return{
    wallId:wall.id,level:options.level,generated,availableIntervals:available,unusedIntervals:unused,
    totalAvailableIn:round(totalAvailable),totalCabinetIn:round(totalCabinet),
    utilizationPercent:totalAvailable?round(totalCabinet/totalAvailable*100,1):0,
  };
}

export function applyCabinetRun(project:EditorProject,run:CabinetRunResult,replaceExisting=false):EditorProject{
  const ids=new Set(run.generated.map(object=>object.id));
  const prefix=run.generated[0]?.id.split('-').slice(0,-2).join('-');
  const preserved=replaceExisting&&prefix
    ?project.objects.filter(object=>!object.id.startsWith(`${prefix}-`)&&!ids.has(object.id))
    :project.objects;
  return{
    ...project,
    objects:[...preserved,...run.generated],
    selectedId:run.generated[0]?.id??project.selectedId,
    updatedAt:new Date().toISOString(),
  };
}
