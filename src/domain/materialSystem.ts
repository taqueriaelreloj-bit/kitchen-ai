import {
  CABINET_FINISHES, CabinetFinish, FINISH_TYPES, HARDWARE_FINISHES, HardwareFinish,
  WALL_PAINTS,
} from './catalogs';
import { countertopMaterial } from './countertops';
import {
  CabinetScope, EditorObject, EditorProject, isBaseCabinetKind, isCabinetKind,
  isWallCabinetKind,
} from './editor';

export type CabinetFinishType=typeof FINISH_TYPES[number];
export type GrainDirection='horizontal'|'vertical';
export type PBRMaterialDescriptor={
  id:string;
  displayName:string;
  baseColor:string;
  metalness:number;
  roughness:number;
  opacity:number;
  transparent:boolean;
  textureKey?:string;
  normalMapKey?:string;
  textureScale:{x:number;y:number};
  grainDirection?:GrainDirection;
  category:'paint'|'wood'|'metal'|'glass'|'stone'|'wall'|'generic';
};

type MaterialObject=EditorObject&{
  cabinetFinishType?:CabinetFinishType;
  textureScale?:number;
  grainDirection?:GrainDirection;
};

const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

const finishRoughness=(base:number,type:CabinetFinishType)=>{
  const adjustment:Record<CabinetFinishType,number>={
    Matte:.22,Satin:.05,'Semi-Gloss':-.12,Gloss:-.25,Natural:.12,Stained:.1,
    Painted:.04,Distressed:.2,Glazed:-.05,Textured:.24,
  };
  return clamp(base+adjustment[type],.08,.95);
};

const cabinetFinishFor=(object:EditorObject):CabinetFinish=>
  CABINET_FINISHES.find(finish=>finish.id===object.finishId)
  ??CABINET_FINISHES.find(finish=>finish.baseColor.toLowerCase()===(object.color??'').toLowerCase())
  ??CABINET_FINISHES[0];

export function cabinetFinishType(object:EditorObject):CabinetFinishType{
  const material=object as MaterialObject;
  const finish=cabinetFinishFor(object);
  const candidate=material.cabinetFinishType??finish.finishType;
  return(FINISH_TYPES as readonly string[]).includes(candidate)
    ?candidate as CabinetFinishType
    :(finish.category==='wood'?'Natural':'Satin');
}

export function resolveCabinetMaterial(object:EditorObject):PBRMaterialDescriptor{
  const finish=cabinetFinishFor(object),type=cabinetFinishType(object),material=object as MaterialObject;
  const wood=finish.category==='wood';
  const grainDirection=material.grainDirection??finish.grainDirection??(wood?'vertical':undefined);
  const scale=Math.max(.1,material.textureScale??1);
  return{
    id:`cabinet-${finish.id}-${slug(type)}`,
    displayName:`${finish.displayName} · ${type}`,
    baseColor:object.color??finish.baseColor,
    metalness:clamp(finish.metalness),
    roughness:finishRoughness(finish.roughness,type),
    opacity:1,
    transparent:false,
    textureKey:wood?`wood-${finish.id}`:type==='Textured'?`paint-texture-${finish.id}`:undefined,
    normalMapKey:wood?`wood-normal-${finish.id}`:type==='Textured'?`paint-normal-${finish.id}`:undefined,
    textureScale:{x:grainDirection==='horizontal'?scale*1.35:scale,y:grainDirection==='vertical'?scale*1.35:scale},
    grainDirection,
    category:wood?'wood':'paint',
  };
}

export function resolveHardwareMaterial(finishId?:string):PBRMaterialDescriptor{
  const finish:HardwareFinish=HARDWARE_FINISHES.find(item=>item.id===finishId)??HARDWARE_FINISHES[0];
  return{
    id:`hardware-${finish.id}`,
    displayName:finish.displayName,
    baseColor:finish.baseColor,
    metalness:clamp(finish.metalness),
    roughness:clamp(finish.roughness,.03,.95),
    opacity:finish.category==='glass'?.45:1,
    transparent:finish.category==='glass',
    textureKey:finish.name.toLowerCase().includes('brushed')?`brushed-${finish.id}`:finish.category==='wood'?`wood-${finish.id}`:undefined,
    normalMapKey:finish.name.toLowerCase().includes('brushed')?'brushed-normal':undefined,
    textureScale:{x:1,y:1},
    category:finish.category==='paint'?'paint':finish.category,
  };
}

export function resolveWallMaterial(object:EditorObject):PBRMaterialDescriptor{
  const paint=WALL_PAINTS.find(item=>item.id===object.wallPaintId);
  const color=object.color??paint?.approximateHex??'#F4F1E9';
  return{
    id:`wall-${paint?.id??slug(color)}`,
    displayName:paint?.displayName??'Custom Wall Paint',
    baseColor:color,
    metalness:0,
    roughness:.9,
    opacity:1,
    transparent:false,
    textureKey:'paint-roller-subtle',
    normalMapKey:'paint-wall-normal',
    textureScale:{x:1,y:1},
    category:'wall',
  };
}

function resolveApplianceMaterial(object:EditorObject):PBRMaterialDescriptor{
  const name=(object.material??object.name).toLowerCase();
  const black=name.includes('black');
  const white=name.includes('white');
  const brushed=name.includes('brushed');
  const stainless=name.includes('stainless');
  const metallic=stainless||name.includes('metal');
  const metalness=metallic?.9:black?.65:.35;
  const roughness=brushed?.46:name.includes('matte')?.8:name.includes('gloss')?.18:.32;
  return{
    id:`appliance-${slug(name||'generic')}-${slug(object.color??'default')}`,
    displayName:object.material??'Appliance Finish',
    baseColor:object.color??(black?'#303536':white?'#F1F1ED':stainless?'#A9B0B1':'#8B9394'),
    metalness,
    roughness,
    opacity:1,
    transparent:false,
    textureKey:brushed?'brushed-stainless':undefined,
    normalMapKey:brushed?'brushed-normal':undefined,
    textureScale:{x:1,y:1},
    category:metallic?'metal':white||black?'paint':'generic',
  };
}

export function resolveObjectMaterial(object:EditorObject):PBRMaterialDescriptor{
  if(isCabinetKind(object.kind)||object.kind==='island')return resolveCabinetMaterial(object);
  if(object.kind==='wall')return resolveWallMaterial(object);
  if(object.kind==='hardware')return resolveHardwareMaterial(object.hardware?.finishId);
  if(object.kind==='countertop'){
    const material=countertopMaterial(object);
    return{id:`countertop-${material.id}`,displayName:material.name,baseColor:material.color,metalness:material.metalness,roughness:material.roughness,opacity:1,transparent:false,textureKey:`stone-${material.id}`,normalMapKey:`stone-normal-${material.id}`,textureScale:{x:1,y:1},category:'stone'};
  }
  if(object.kind==='window')return{id:'window-glass',displayName:'Window Glass',baseColor:object.color??'#91C7DC',metalness:.06,roughness:.08,opacity:.38,transparent:true,textureScale:{x:1,y:1},category:'glass'};
  if(object.kind==='appliance')return resolveApplianceMaterial(object);
  return{id:`generic-${object.kind}`,displayName:object.material??object.name,baseColor:object.color??'#C6CCC9',metalness:0,roughness:.55,opacity:1,transparent:false,textureScale:{x:1,y:1},category:'generic'};
}

const inScope=(object:EditorObject,scope:CabinetScope,selectedId?:string)=>{
  if(scope==='selected')return object.id===selectedId;
  if(scope==='base')return isBaseCabinetKind(object.kind)||['tall-cabinet','pantry-cabinet','oven-cabinet','refrigerator-cabinet'].includes(object.kind);
  if(scope==='wall')return isWallCabinetKind(object.kind);
  if(scope==='island')return object.kind==='island';
  return isCabinetKind(object.kind)||object.kind==='island';
};

export function applyCabinetFinishType(project:EditorProject,type:CabinetFinishType,scope:CabinetScope='selected'):EditorProject{
  if(!(FINISH_TYPES as readonly string[]).includes(type))return project;
  return{
    ...project,
    objects:project.objects.map(object=>inScope(object,scope,project.selectedId)?{...object,cabinetFinishType:type}:object),
    updatedAt:new Date().toISOString(),
  };
}

export function materialCacheKey(material:PBRMaterialDescriptor){
  return[
    material.id,material.baseColor,material.metalness.toFixed(3),material.roughness.toFixed(3),
    material.opacity.toFixed(3),material.textureKey??'',material.normalMapKey??'',
    material.textureScale.x.toFixed(3),material.textureScale.y.toFixed(3),material.grainDirection??'',
  ].join('|');
}
