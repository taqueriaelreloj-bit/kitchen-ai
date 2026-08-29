import { AIDesignSuggestion, applyAIDesignSuggestion } from './aiDesign';
import { EditorObject, EditorProject, isCabinetKind } from './editor';
import { isLighting } from './lighting';

export type PreviewBounds={left:number;top:number;right:number;bottom:number;width:number;height:number};
export type AIDesignPreview={
  project:EditorProject;
  bounds:PreviewBounds;
  cabinetCount:number;
  applianceCount:number;
  wallCount:number;
  openingCount:number;
  lightingCount:number;
  hasIsland:boolean;
  sinkCount:number;
};

const normalizedRotation=(value:number)=>((value%360)+360)%360;
const objectBounds=(object:EditorObject)=>{
  const rotation=normalizedRotation(object.rotation),vertical=Math.abs(rotation-90)<.01||Math.abs(rotation-270)<.01;
  const width=vertical?object.depthIn:object.widthIn;
  const depth=vertical?object.widthIn:object.depthIn;
  const centerX=object.x+object.widthIn/2,centerY=object.y+object.depthIn/2;
  return{left:centerX-width/2,top:centerY-depth/2,right:centerX+width/2,bottom:centerY+depth/2};
};

export function previewBounds(objects:EditorObject[],paddingIn=24):PreviewBounds{
  if(!objects.length)return{left:0,top:0,right:240,bottom:180,width:240,height:180};
  const bounds=objects.map(objectBounds);
  const left=Math.min(...bounds.map(value=>value.left))-paddingIn;
  const top=Math.min(...bounds.map(value=>value.top))-paddingIn;
  const right=Math.max(...bounds.map(value=>value.right))+paddingIn;
  const bottom=Math.max(...bounds.map(value=>value.bottom))+paddingIn;
  return{left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}

export function buildAIDesignPreview(project:EditorProject,suggestion:AIDesignSuggestion):AIDesignPreview{
  const next=applyAIDesignSuggestion(project,suggestion);
  return{
    project:next,
    bounds:previewBounds(next.objects),
    cabinetCount:next.objects.filter(object=>isCabinetKind(object.kind)).length,
    applianceCount:next.objects.filter(object=>object.kind==='appliance'&&!isLighting(object)).length,
    wallCount:next.objects.filter(object=>object.kind==='wall').length,
    openingCount:next.objects.filter(object=>object.kind==='door'||object.kind==='window').length,
    lightingCount:next.objects.filter(isLighting).length,
    hasIsland:next.objects.some(object=>object.kind==='island'),
    sinkCount:next.objects.filter(object=>object.kind==='sink-base'||(object.kind==='island'&&Boolean((object as any).islandSpec?.sink))).length,
  };
}

export function previewObjectStyle(object:EditorObject,bounds:PreviewBounds,viewport:{width:number;height:number}){
  const scale=Math.min(viewport.width/bounds.width,viewport.height/bounds.height);
  const rotation=normalizedRotation(object.rotation),vertical=Math.abs(rotation-90)<.01||Math.abs(rotation-270)<.01;
  const width=(vertical?object.depthIn:object.widthIn)*scale;
  const height=(vertical?object.widthIn:object.depthIn)*scale;
  const centerX=(object.x+object.widthIn/2-bounds.left)*scale;
  const centerY=(object.y+object.depthIn/2-bounds.top)*scale;
  return{
    left:centerX-width/2,
    top:centerY-height/2,
    width:Math.max(2,width),
    height:Math.max(2,height),
    rotation,
  };
}
