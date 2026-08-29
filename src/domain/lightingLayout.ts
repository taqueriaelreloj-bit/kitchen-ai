import { EditorObject, EditorProject } from './editor';
import { createLighting, DEFAULT_LIGHTING, isLighting, LightingSpec } from './lighting';

export type AutoLightingTag='auto-recessed'|'auto-pendant'|'auto-under-cabinet';
export type AutomaticLightingOptions={
  recessed?:boolean;
  pendants?:boolean;
  underCabinet?:boolean;
  recessedSpacingIn?:number;
  recessedMarginIn?:number;
  colorTemperatureK?:LightingSpec['colorTemperatureK'];
  recessedIntensityPercent?:number;
  pendantIntensityPercent?:number;
  underCabinetIntensityPercent?:number;
  pendantDropIn?:number;
  replacePreviousAutomatic?:boolean;
};
export type AutomaticLightingPlan={
  generated:EditorObject[];
  recessedCount:number;
  pendantCount:number;
  underCabinetCount:number;
  roomBounds:{left:number;top:number;right:number;bottom:number;width:number;height:number};
};

type TaggedLight=EditorObject&{lightingLayoutTag?:AutoLightingTag;lightingSpec?:LightingSpec};

const inches=(meters:number)=>meters*39.3701;
const radians=(degrees:number)=>degrees*Math.PI/180;
const round=(value:number)=>Math.round(value*100)/100;
const isAutoLight=(object:EditorObject)=>isLighting(object)&&Boolean((object as TaggedLight).lightingLayoutTag);

function wallEndpoints(wall:EditorObject){
  const angle=radians(wall.rotation);
  return[
    {x:wall.x,y:wall.y},
    {x:wall.x+Math.cos(angle)*wall.widthIn,y:wall.y+Math.sin(angle)*wall.widthIn},
  ];
}

export function lightingRoomBounds(project:EditorProject){
  const walls=project.objects.filter(object=>object.kind==='wall');
  if(!walls.length){
    const width=Math.max(96,inches(project.room.widthM)),height=Math.max(96,inches(project.room.lengthM));
    return{left:120,top:120,right:120+width,bottom:120+height,width,height};
  }
  const points=walls.flatMap(wallEndpoints);
  const left=Math.min(...points.map(point=>point.x)),top=Math.min(...points.map(point=>point.y));
  const right=Math.max(...points.map(point=>point.x)),bottom=Math.max(...points.map(point=>point.y));
  const width=Math.max(24,right-left),height=Math.max(24,bottom-top);
  return{left:round(left),top:round(top),right:round(right),bottom:round(bottom),width:round(width),height:round(height)};
}

function taggedLight(type:'Recessed'|'Pendant'|'Under Cabinet',tag:AutoLightingTag,partial:Partial<EditorObject>,specPatch:Partial<LightingSpec>):EditorObject{
  const base=createLighting(type,partial) as TaggedLight;
  return{
    ...base,
    lightingLayoutTag:tag,
    lightingSpec:{...DEFAULT_LIGHTING[type],...specPatch,type},
  } as EditorObject;
}

function gridPositions(start:number,length:number,margin:number,spacing:number){
  const usable=Math.max(0,length-margin*2);
  if(usable<=0)return[start+length/2];
  const count=Math.max(2,Math.ceil(usable/spacing)+1);
  return Array.from({length:count},(_,index)=>start+margin+(usable/(count-1))*index);
}

function recessedLights(project:EditorProject,bounds:ReturnType<typeof lightingRoomBounds>,options:AutomaticLightingOptions){
  const margin=Math.min(Math.max(18,options.recessedMarginIn??30),Math.min(bounds.width,bounds.height)/2);
  const spacing=Math.max(36,Math.min(72,options.recessedSpacingIn??54));
  const xs=gridPositions(bounds.left,bounds.width,margin,spacing),ys=gridPositions(bounds.top,bounds.height,margin,spacing);
  const ceilingHeight=inches(project.room.heightM);
  return ys.flatMap((y,row)=>xs.map((x,column)=>taggedLight('Recessed','auto-recessed',{
    id:`auto-recessed-${row}-${column}`,
    name:`Recessed Light ${row+1}.${column+1}`,
    x:x-3,y:y-3,elevationIn:Math.max(84,ceilingHeight-2),
  },{
    colorTemperatureK:options.colorTemperatureK??3000,
    intensityPercent:options.recessedIntensityPercent??78,
    enabled:true,
  })));
}

function pendantLights(project:EditorProject,options:AutomaticLightingOptions){
  const islands=project.objects.filter(object=>object.kind==='island');
  const ceilingHeight=inches(project.room.heightM),drop=options.pendantDropIn??30;
  return islands.flatMap((island,islandIndex)=>{
    const count=island.widthIn>=84?3:island.widthIn>=48?2:1;
    const angle=radians(island.rotation),unit={x:Math.cos(angle),y:Math.sin(angle)};
    const center={x:island.x+island.widthIn/2,y:island.y+island.depthIn/2};
    const span=Math.max(0,island.widthIn-Math.min(36,island.widthIn*.45));
    return Array.from({length:count},(_,index)=>{
      const along=count===1?0:-span/2+(span/(count-1))*index;
      const x=center.x+unit.x*along,y=center.y+unit.y*along;
      return taggedLight('Pendant','auto-pendant',{
        id:`auto-pendant-${islandIndex}-${index}`,
        name:`Island Pendant ${index+1}`,
        x:x-5,y:y-5,rotation:island.rotation,elevationIn:ceilingHeight,
      },{
        colorTemperatureK:options.colorTemperatureK??3000,
        intensityPercent:options.pendantIntensityPercent??80,
        dropIn:drop,
        diameterIn:10,
        enabled:true,
      });
    });
  });
}

function underCabinetLights(project:EditorProject,options:AutomaticLightingOptions){
  const cabinets=project.objects.filter(object=>object.kind==='wall-cabinet'||object.kind==='glass-upper');
  return cabinets.map((cabinet,index)=>{
    const length=Math.max(6,cabinet.widthIn-4);
    const angle=radians(cabinet.rotation),unit={x:Math.cos(angle),y:Math.sin(angle)};
    const center={x:cabinet.x+cabinet.widthIn/2,y:cabinet.y+cabinet.depthIn/2};
    const x=center.x-unit.x*length/2,y=center.y-unit.y*length/2;
    return taggedLight('Under Cabinet','auto-under-cabinet',{
      id:`auto-under-cabinet-${index}-${cabinet.id}`,
      name:`Under Cabinet Light · ${cabinet.name}`,
      x,y,rotation:cabinet.rotation,widthIn:length,elevationIn:Math.max(30,(cabinet.elevationIn??54)-1),
    },{
      colorTemperatureK:options.colorTemperatureK??3000,
      intensityPercent:options.underCabinetIntensityPercent??68,
      lengthIn:length,
      enabled:true,
    });
  });
}

export function generateAutomaticLighting(project:EditorProject,options:AutomaticLightingOptions={}):AutomaticLightingPlan{
  const bounds=lightingRoomBounds(project);
  const recessed=options.recessed===false?[]:recessedLights(project,bounds,options);
  const pendants=options.pendants===false?[]:pendantLights(project,options);
  const underCabinet=options.underCabinet===false?[]:underCabinetLights(project,options);
  return{
    generated:[...recessed,...pendants,...underCabinet],
    recessedCount:recessed.length,
    pendantCount:pendants.length,
    underCabinetCount:underCabinet.length,
    roomBounds:bounds,
  };
}

export function applyAutomaticLighting(project:EditorProject,plan:AutomaticLightingPlan,replacePreviousAutomatic=true):EditorProject{
  const preserved=replacePreviousAutomatic?project.objects.filter(object=>!isAutoLight(object)):project.objects;
  return{
    ...project,
    objects:[...preserved,...plan.generated],
    selectedId:plan.generated[0]?.id??project.selectedId,
    updatedAt:new Date().toISOString(),
  };
}

export function automaticLightingCounts(project:EditorProject){
  const tagged=project.objects.filter(isAutoLight) as TaggedLight[];
  return{
    recessed:tagged.filter(object=>object.lightingLayoutTag==='auto-recessed').length,
    pendants:tagged.filter(object=>object.lightingLayoutTag==='auto-pendant').length,
    underCabinet:tagged.filter(object=>object.lightingLayoutTag==='auto-under-cabinet').length,
  };
}
