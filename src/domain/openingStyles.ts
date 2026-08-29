import { EditorObject, EditorProject, updateObject } from './editor';
import { openingData } from './openings';

export type DoorStyle='Single Panel'|'Shaker Door'|'Full Glass Door'|'Half Glass Door'|'Double Door'|'Pocket Door'|'Barn Door';
export type WindowStyle='Fixed'|'Single Hung'|'Double Hung'|'Casement'|'Slider'|'Picture';
export type OpeningTrimStyle='None'|'Standard'|'Craftsman'|'Modern';
export type OpeningStyleSpec={
  doorStyle:DoorStyle;
  windowStyle:WindowStyle;
  trimStyle:OpeningTrimStyle;
  trimWidthIn:number;
  frameColor:string;
  panelColor:string;
  glassColor:string;
  frameDepthIn:number;
  muntins:number;
  openPercent:number;
};
export type OpeningFrontMaterial='frame'|'panel'|'glass'|'hardware'|'track';
export type OpeningFrontPart={id:string;offsetXIn:number;offsetYIn:number;offsetZIn:number;widthIn:number;heightIn:number;depthIn:number;material:OpeningFrontMaterial;roughness:number;metalness:number};
export type DoorPlanSymbol={hinge:'left'|'right';swing:'in'|'out';radiusIn:number;startDegrees:number;endDegrees:number;double:boolean;pocket:boolean;barn:boolean};
export type WindowPlanSymbol={style:WindowStyle;panels:number;mullions:'none'|'horizontal'|'vertical'|'both';openingDirection?:'left'|'right'|'up'|'down'};

type StyledOpeningObject=EditorObject&{openingStyleSpec?:OpeningStyleSpec};

export const DOOR_STYLES:DoorStyle[]=['Single Panel','Shaker Door','Full Glass Door','Half Glass Door','Double Door','Pocket Door','Barn Door'];
export const WINDOW_STYLES:WindowStyle[]=['Fixed','Single Hung','Double Hung','Casement','Slider','Picture'];
export const OPENING_TRIM_STYLES:OpeningTrimStyle[]=['None','Standard','Craftsman','Modern'];
export const DEFAULT_OPENING_STYLE:OpeningStyleSpec={doorStyle:'Single Panel',windowStyle:'Fixed',trimStyle:'Standard',trimWidthIn:2.25,frameColor:'#F0EEE8',panelColor:'#8A664B',glassColor:'#91C7DC',frameDepthIn:1.25,muntins:0,openPercent:0};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const part=(id:string,offsetXIn:number,offsetYIn:number,offsetZIn:number,widthIn:number,heightIn:number,depthIn:number,material:OpeningFrontMaterial,roughness=.5,metalness=.02):OpeningFrontPart=>({id,offsetXIn,offsetYIn,offsetZIn,widthIn:Math.max(.05,widthIn),heightIn:Math.max(.05,heightIn),depthIn:Math.max(.02,depthIn),material,roughness,metalness});

export function isOpening(object:EditorObject){return object.kind==='door'||object.kind==='window';}

export function openingStyleData(object:EditorObject):OpeningStyleSpec{
  const current=(object as StyledOpeningObject).openingStyleSpec;
  return{
    ...DEFAULT_OPENING_STYLE,
    ...(current??{}),
    trimWidthIn:clamp(current?.trimWidthIn??DEFAULT_OPENING_STYLE.trimWidthIn,0,8),
    frameDepthIn:clamp(current?.frameDepthIn??DEFAULT_OPENING_STYLE.frameDepthIn,.25,6),
    muntins:Math.round(clamp(current?.muntins??DEFAULT_OPENING_STYLE.muntins,0,12)),
    openPercent:clamp(current?.openPercent??DEFAULT_OPENING_STYLE.openPercent,0,100),
  };
}

export function updateOpeningStyle(project:EditorProject,id:string,patch:Partial<OpeningStyleSpec>):EditorProject{
  const object=project.objects.find(item=>item.id===id);
  if(!object||!isOpening(object))return project;
  const spec={...openingStyleData(object),...patch};
  return updateObject(project,id,{openingStyleSpec:spec,color:object.kind==='door'?spec.panelColor:spec.glassColor} as Partial<EditorObject>);
}

export function applyOpeningStyle(project:EditorProject,kind:'door'|'window',patch:Partial<OpeningStyleSpec>):EditorProject{
  let changed=false;
  const objects=project.objects.map(object=>{
    if(object.kind!==kind)return object;
    changed=true;
    const spec={...openingStyleData(object),...patch};
    return{...object,openingStyleSpec:spec,color:kind==='door'?spec.panelColor:spec.glassColor} as EditorObject;
  });
  return changed?{...project,objects,updatedAt:new Date().toISOString()}:project;
}

function frame(object:EditorObject,spec:OpeningStyleSpec):OpeningFrontPart[]{
  if(spec.trimStyle==='None')return[];
  const trim=spec.trimStyle==='Craftsman'?Math.max(3.5,spec.trimWidthIn):spec.trimStyle==='Modern'?Math.max(1,spec.trimWidthIn*.65):spec.trimWidthIn;
  return[
    part('trim-left',-object.widthIn/2-trim/2,0,0,trim,object.heightIn+trim,spec.frameDepthIn,'frame',.62),
    part('trim-right',object.widthIn/2+trim/2,0,0,trim,object.heightIn+trim,spec.frameDepthIn,'frame',.62),
    part('trim-top',0,-object.heightIn/2-trim/2,0,object.widthIn+trim*2,trim,spec.frameDepthIn,'frame',.62),
  ];
}

function doorParts(object:EditorObject,spec:OpeningStyleSpec):OpeningFrontPart[]{
  const width=Math.max(4,object.widthIn-1),height=Math.max(8,object.heightIn),parts:OpeningFrontPart[]=[];
  if(spec.doorStyle==='Double Door'){
    const half=(width-.3)/2;
    parts.push(part('door-left',-width/4,0,0,half,height,spec.frameDepthIn,'panel',.48),part('door-right',width/4,0,0,half,height,spec.frameDepthIn,'panel',.48));
  }else if(spec.doorStyle==='Full Glass Door'){
    parts.push(part('door-frame',0,0,0,width,height,spec.frameDepthIn,'panel',.46),part('door-glass',0,0,-.18,width-5,height-7,.18,'glass',.06,.03));
  }else if(spec.doorStyle==='Half Glass Door'){
    parts.push(part('door-panel',0,height*.24,0,width,height*.52,spec.frameDepthIn,'panel',.48),part('door-glass',0,-height*.25,-.18,width-5,height*.42,.18,'glass',.06,.03));
  }else if(spec.doorStyle==='Shaker Door'){
    const rail=4,stile=4,innerWidth=Math.max(2,width-stile*2),innerHeight=Math.max(2,height-rail*2);
    parts.push(part('stile-left',-width/2+stile/2,0,0,stile,height,spec.frameDepthIn,'panel',.45),part('stile-right',width/2-stile/2,0,0,stile,height,spec.frameDepthIn,'panel',.45),part('rail-top',0,-height/2+rail/2,0,innerWidth,rail,spec.frameDepthIn,'panel',.45),part('rail-bottom',0,height/2-rail/2,0,innerWidth,rail,spec.frameDepthIn,'panel',.45),part('center-panel',0,0,-.2,innerWidth,innerHeight,.4,'panel',.55));
  }else if(spec.doorStyle==='Pocket Door')parts.push(part('pocket-panel',-width*.3,0,0,width*.65,height,spec.frameDepthIn,'panel',.5));
  else if(spec.doorStyle==='Barn Door')parts.push(part('barn-panel',0,0,-1,width+4,height+3,spec.frameDepthIn,'panel',.5),part('barn-track',0,-height/2-3,-1.6,width+12,1.5,1.4,'track',.28,.86));
  else parts.push(part('door-panel',0,0,0,width,height,spec.frameDepthIn,'panel',.5));
  if(spec.doorStyle!=='Pocket Door')parts.push(part('handle',openingData(object).swingDirection?.startsWith('Left')?width*.35:-width*.35,0,-spec.frameDepthIn/2-.55,.8,5,.9,'hardware',.22,.9));
  return[...parts,...frame(object,spec)];
}

function windowParts(object:EditorObject,spec:OpeningStyleSpec):OpeningFrontPart[]{
  const width=Math.max(4,object.widthIn-1),height=Math.max(4,object.heightIn),frameWidth=1.5,parts:OpeningFrontPart[]=[
    part('frame-left',-width/2+frameWidth/2,0,0,frameWidth,height,spec.frameDepthIn,'frame',.55),
    part('frame-right',width/2-frameWidth/2,0,0,frameWidth,height,spec.frameDepthIn,'frame',.55),
    part('frame-top',0,-height/2+frameWidth/2,0,width-frameWidth*2,frameWidth,spec.frameDepthIn,'frame',.55),
    part('frame-bottom',0,height/2-frameWidth/2,0,width-frameWidth*2,frameWidth,spec.frameDepthIn,'frame',.55),
    part('glass',0,0,-.12,width-frameWidth*2,height-frameWidth*2,.18,'glass',.05,.04),
  ];
  if(spec.windowStyle==='Single Hung'||spec.windowStyle==='Double Hung')parts.push(part('meeting-rail',0,0,-.25,width-frameWidth*2,1.25,.5,'frame',.5));
  if(spec.windowStyle==='Slider')parts.push(part('center-mullion',0,0,-.25,1.25,height-frameWidth*2,.5,'frame',.5));
  if(spec.windowStyle==='Casement')parts.push(part('casement-side',width*.25,0,-.25,.8,height-frameWidth*2,.5,'frame',.5));
  const muntins=Math.max(0,spec.muntins);
  for(let index=1;index<=muntins;index++){
    const horizontal=index%2===0;
    parts.push(horizontal?part(`muntin-${index}`,0,-height/2+height*index/(muntins+1),-.3,width-frameWidth*2,.45,.35,'frame',.55):part(`muntin-${index}`,-width/2+width*index/(muntins+1),0,-.3,.45,height-frameWidth*2,.35,'frame',.55));
  }
  return[...parts,...frame(object,spec)];
}

export function openingFrontParts(object:EditorObject):OpeningFrontPart[]{
  if(!isOpening(object))return[];
  const spec=openingStyleData(object);
  return object.kind==='door'?doorParts(object,spec):windowParts(object,spec);
}

export function doorPlanSymbol(object:EditorObject):DoorPlanSymbol|undefined{
  if(object.kind!=='door')return undefined;
  const data=openingData(object),swing=data.swingDirection??'Left In',hinge=swing.startsWith('Left')?'left':'right',direction=swing.endsWith('Out')?'out':'in',spec=openingStyleData(object);
  return{hinge,swing:direction,radiusIn:object.widthIn,startDegrees:hinge==='left'?0:180,endDegrees:hinge==='left'?(direction==='in'?90:-90):(direction==='in'?90:270),double:spec.doorStyle==='Double Door',pocket:spec.doorStyle==='Pocket Door',barn:spec.doorStyle==='Barn Door'};
}

export function windowPlanSymbol(object:EditorObject):WindowPlanSymbol|undefined{
  if(object.kind!=='window')return undefined;
  const style=openingStyleData(object).windowStyle;
  return style==='Single Hung'?{style,panels:2,mullions:'horizontal',openingDirection:'up'}:style==='Double Hung'?{style,panels:2,mullions:'horizontal',openingDirection:'up'}:style==='Slider'?{style,panels:2,mullions:'vertical',openingDirection:'right'}:style==='Casement'?{style,panels:1,mullions:'none',openingDirection:'left'}:{style,panels:1,mullions:'none'};
}
