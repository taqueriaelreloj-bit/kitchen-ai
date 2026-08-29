import {
  CabinetScope,
  DEFAULT_TOE_KICK,
  EditorObject,
  EditorProject,
  isBaseCabinetKind,
  isBaseLikeKind,
  isTallCabinetKind,
  updateObject,
} from './editor';

export type ToeKickMode='Continuous'|'Individual'|'Flush'|'Furniture Legs'|'Decorative Base';
export type ToeKickProfileSpec={
  mode:ToeKickMode;
  enabled:boolean;
  heightIn:number;
  recessIn:number;
  color:string;
  finish:string;
  legWidthIn:number;
  legDepthIn:number;
  decorativeHeightIn:number;
  decorativeProjectionIn:number;
};

type ProfiledObject=EditorObject&{toeKickProfileSpec?:ToeKickProfileSpec};

export const TOE_KICK_MODES:ToeKickMode[]=['Continuous','Individual','Flush','Furniture Legs','Decorative Base'];
export const DEFAULT_TOE_KICK_PROFILE:ToeKickProfileSpec={mode:'Continuous',enabled:true,heightIn:4,recessIn:3,color:DEFAULT_TOE_KICK.color,finish:DEFAULT_TOE_KICK.finish,legWidthIn:2,legDepthIn:2,decorativeHeightIn:5.5,decorativeProjectionIn:.75};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function supportsToeKickProfile(object:EditorObject){return isBaseLikeKind(object.kind);}

export function toeKickProfileData(object:EditorObject):ToeKickProfileSpec{
  const current=(object as ProfiledObject).toeKickProfileSpec,toe=object.toeKick;
  const mode=current?.mode??'Continuous';
  const height=current?.heightIn??toe?.heightIn??DEFAULT_TOE_KICK_PROFILE.heightIn;
  const recess=mode==='Flush'?0:current?.recessIn??toe?.recessIn??DEFAULT_TOE_KICK_PROFILE.recessIn;
  return{
    ...DEFAULT_TOE_KICK_PROFILE,
    ...(current??{}),
    mode,
    enabled:current?.enabled??toe?.enabled??true,
    heightIn:clamp(height,1,12),
    recessIn:clamp(recess,0,12),
    color:current?.color??toe?.color??object.color??DEFAULT_TOE_KICK_PROFILE.color,
    finish:current?.finish??toe?.finish??DEFAULT_TOE_KICK_PROFILE.finish,
    legWidthIn:clamp(current?.legWidthIn??DEFAULT_TOE_KICK_PROFILE.legWidthIn,1,6),
    legDepthIn:clamp(current?.legDepthIn??DEFAULT_TOE_KICK_PROFILE.legDepthIn,1,6),
    decorativeHeightIn:clamp(current?.decorativeHeightIn??DEFAULT_TOE_KICK_PROFILE.decorativeHeightIn,2,12),
    decorativeProjectionIn:clamp(current?.decorativeProjectionIn??DEFAULT_TOE_KICK_PROFILE.decorativeProjectionIn,0,3),
  };
}

function normalizedProfile(object:EditorObject,patch:Partial<ToeKickProfileSpec>){
  const current=toeKickProfileData(object),next={...current,...patch};
  if(next.mode==='Flush')next.recessIn=0;
  if(next.mode==='Decorative Base'&&patch.heightIn===undefined)next.heightIn=next.decorativeHeightIn;
  next.heightIn=clamp(next.heightIn,1,12);next.recessIn=clamp(next.recessIn,0,12);next.legWidthIn=clamp(next.legWidthIn,1,6);next.legDepthIn=clamp(next.legDepthIn,1,6);next.decorativeHeightIn=clamp(next.decorativeHeightIn,2,12);next.decorativeProjectionIn=clamp(next.decorativeProjectionIn,0,3);
  return next;
}

function scopeMatch(object:EditorObject,scope:CabinetScope,selectedId?:string){
  if(!supportsToeKickProfile(object))return false;
  if(scope==='selected')return object.id===selectedId;
  if(scope==='base')return isBaseCabinetKind(object.kind)||isTallCabinetKind(object.kind);
  if(scope==='island')return object.kind==='island';
  if(scope==='wall')return false;
  return true;
}

export function updateToeKickProfile(project:EditorProject,id:string,patch:Partial<ToeKickProfileSpec>):EditorProject{
  const object=project.objects.find(item=>item.id===id);
  if(!object||!supportsToeKickProfile(object))return project;
  const profile=normalizedProfile(object,patch);
  return updateObject(project,id,{
    toeKickProfileSpec:profile,
    toeKick:{enabled:profile.enabled,heightIn:profile.heightIn,recessIn:profile.recessIn,color:profile.color,finish:profile.finish},
  } as Partial<EditorObject>);
}

export function applyToeKickProfile(project:EditorProject,patch:Partial<ToeKickProfileSpec>,scope:CabinetScope):EditorProject{
  let changed=false;
  const objects=project.objects.map(object=>{
    if(!scopeMatch(object,scope,project.selectedId))return object;
    changed=true;
    const profile=normalizedProfile(object,patch);
    return{
      ...object,
      toeKickProfileSpec:profile,
      toeKick:{enabled:profile.enabled,heightIn:profile.heightIn,recessIn:profile.recessIn,color:profile.color,finish:profile.finish},
    } as EditorObject;
  });
  return changed?{...project,objects,updatedAt:new Date().toISOString()}:project;
}

export function syncToeKickProfileToCabinetColor(project:EditorProject,id:string):EditorProject{
  const object=project.objects.find(item=>item.id===id);
  return object&&supportsToeKickProfile(object)?updateToeKickProfile(project,id,{color:object.color??DEFAULT_TOE_KICK_PROFILE.color}):project;
}
