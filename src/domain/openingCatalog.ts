import { EditorObject, EditorProject, updateObject } from './editor';
import {
  addOpening, attachOpening, openingData, setDoorSwing, setWindowSillHeight,
  SwingDirection,
} from './openings';

export type OpeningCategory='Doors'|'Windows';
export type DoorStyle='Interior Panel'|'Exterior Panel'|'Glass Patio'|'Double Door'|'Pocket Door';
export type WindowStyle='Single Casement'|'Double Casement'|'Slider'|'Picture Window';
export type TrimStyle='No Trim'|'Modern Square'|'Traditional Casing'|'Craftsman';
export type OpeningCatalogModel={
  id:string;
  category:OpeningCategory;
  name:string;
  displayName:string;
  widthIn:number;
  heightIn:number;
  sillHeightIn:number;
  style:DoorStyle|WindowStyle;
  defaultSwing?:SwingDirection;
  trimStyle:TrimStyle;
  description:string;
  marketCommon:boolean;
};
export type OpeningCatalogSpec={
  modelId:string;
  style:DoorStyle|WindowStyle;
  trimStyle:TrimStyle;
  frameColor:string;
  panelColor:string;
  glassTint:string;
};
export type OpeningGeometryPart={
  id:string;
  kind:'panel'|'glass'|'frame'|'mullion'|'trim'|'sill'|'handle';
  offsetXIn:number;
  offsetYIn:number;
  offsetZIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  color:string;
  opacity:number;
  metalness:number;
  roughness:number;
};
export type OpeningGeometry={model:OpeningCatalogModel;spec:OpeningCatalogSpec;parts:OpeningGeometryPart[]};

type CatalogOpening=EditorObject&{openingCatalogSpec?:OpeningCatalogSpec};

export const OPENING_CATALOG:OpeningCatalogModel[]=[
  {id:'door-30-interior',category:'Doors',name:'30 in Interior Door',displayName:'30 × 80 in Interior Panel Door',widthIn:30,heightIn:80,sillHeightIn:0,style:'Interior Panel',defaultSwing:'Left In',trimStyle:'Traditional Casing',description:'Standard interior passage door.',marketCommon:true},
  {id:'door-36-exterior',category:'Doors',name:'36 in Exterior Door',displayName:'36 × 80 in Exterior Door',widthIn:36,heightIn:80,sillHeightIn:0,style:'Exterior Panel',defaultSwing:'Left In',trimStyle:'Traditional Casing',description:'Standard exterior kitchen entry door.',marketCommon:true},
  {id:'door-60-patio',category:'Doors',name:'60 in Patio Door',displayName:'60 × 80 in Glass Patio Door',widthIn:60,heightIn:80,sillHeightIn:0,style:'Glass Patio',defaultSwing:'Right In',trimStyle:'Modern Square',description:'Two-panel glazed patio door.',marketCommon:true},
  {id:'door-60-double',category:'Doors',name:'60 in Double Door',displayName:'60 × 80 in Double Door',widthIn:60,heightIn:80,sillHeightIn:0,style:'Double Door',defaultSwing:'Left In',trimStyle:'Traditional Casing',description:'Paired hinged door opening.',marketCommon:true},
  {id:'door-36-pocket',category:'Doors',name:'36 in Pocket Door',displayName:'36 × 80 in Pocket Door',widthIn:36,heightIn:80,sillHeightIn:0,style:'Pocket Door',trimStyle:'Modern Square',description:'Space-saving sliding pocket door.',marketCommon:true},
  {id:'window-36-casement',category:'Windows',name:'36 in Casement Window',displayName:'36 × 36 in Single Casement',widthIn:36,heightIn:36,sillHeightIn:42,style:'Single Casement',trimStyle:'Modern Square',description:'Single operable casement window.',marketCommon:true},
  {id:'window-60-double-casement',category:'Windows',name:'60 in Double Casement',displayName:'60 × 42 in Double Casement',widthIn:60,heightIn:42,sillHeightIn:38,style:'Double Casement',trimStyle:'Traditional Casing',description:'Paired casement window centered over a sink run.',marketCommon:true},
  {id:'window-48-slider',category:'Windows',name:'48 in Slider Window',displayName:'48 × 36 in Slider Window',widthIn:48,heightIn:36,sillHeightIn:42,style:'Slider',trimStyle:'Modern Square',description:'Two-panel horizontal sliding window.',marketCommon:true},
  {id:'window-60-picture',category:'Windows',name:'60 in Picture Window',displayName:'60 × 48 in Picture Window',widthIn:60,heightIn:48,sillHeightIn:36,style:'Picture Window',trimStyle:'Craftsman',description:'Large fixed window with an unobstructed view.',marketCommon:true},
];

export const openingModel=(id:string)=>OPENING_CATALOG.find(model=>model.id===id);
export const openingsByCategory=(category:OpeningCategory)=>OPENING_CATALOG.filter(model=>model.category===category);
export const openingCatalogSpec=(object:EditorObject)=>(object as CatalogOpening).openingCatalogSpec;
export const isCatalogOpening=(object:EditorObject)=>Boolean(openingCatalogSpec(object));

const defaultSpec=(model:OpeningCatalogModel):OpeningCatalogSpec=>({
  modelId:model.id,
  style:model.style,
  trimStyle:model.trimStyle,
  frameColor:'#F0EEE8',
  panelColor:model.category==='Doors'?'#8A664B':'#91C7DC',
  glassTint:'#A9D2E2',
});

export function createCatalogOpening(project:EditorProject,modelId:string,wallId?:string,wallOffsetIn=24):EditorProject{
  const model=openingModel(modelId);
  if(!model)throw new Error(`Unknown opening model: ${modelId}`);
  const kind=model.category==='Doors'?'door':'window';
  let next=addOpening(project,kind);
  const created=next.objects.find(object=>object.id===next.selectedId&&object.kind===kind);
  if(!created)throw new Error('Kitchen AI could not create the opening.');
  next=updateObject(next,created.id,{
    name:model.name,widthIn:model.widthIn,heightIn:model.heightIn,elevationIn:model.sillHeightIn,
    color:model.category==='Doors'?'#8A664B':'#91C7DC',openingCatalogSpec:defaultSpec(model),
  } as Partial<EditorObject>);
  if(wallId)next=attachOpening(next,created.id,wallId,wallOffsetIn);
  if(kind==='window')next=setWindowSillHeight(next,created.id,model.sillHeightIn);
  if(kind==='door'&&model.defaultSwing)next=setDoorSwing(next,created.id,model.defaultSwing);
  return next;
}

export function updateOpeningAppearance(project:EditorProject,id:string,patch:Partial<Omit<OpeningCatalogSpec,'modelId'|'style'>>):EditorProject{
  const object=project.objects.find(item=>item.id===id),spec=object?openingCatalogSpec(object):undefined;
  if(!object||!spec)return project;
  return updateObject(project,id,{openingCatalogSpec:{...spec,...patch}} as Partial<EditorObject>);
}

const part=(id:OpeningGeometryPart['id'],kind:OpeningGeometryPart['kind'],x:number,y:number,z:number,width:number,height:number,depth:number,color:string,opacity=1,metalness=0,roughness=.55):OpeningGeometryPart=>({id,kind,offsetXIn:x,offsetYIn:y,offsetZIn:z,widthIn:Math.max(.05,width),heightIn:Math.max(.05,height),depthIn:Math.max(.02,depth),color,opacity,metalness,roughness});

function trimParts(object:EditorObject,spec:OpeningCatalogSpec):OpeningGeometryPart[]{
  if(spec.trimStyle==='No Trim')return[];
  const width=spec.trimStyle==='Craftsman'?3.5:spec.trimStyle==='Traditional Casing'?2.75:2;
  const topHeight=spec.trimStyle==='Craftsman'?4.5:width;
  return[
    part('trim-left','trim',-object.widthIn/2-width/2,0,0,width,object.heightIn+topHeight,1.1,spec.frameColor),
    part('trim-right','trim',object.widthIn/2+width/2,0,0,width,object.heightIn+topHeight,1.1,spec.frameColor),
    part('trim-top','trim',0,object.heightIn/2+topHeight/2,0,object.widthIn+width*2,topHeight,1.1,spec.frameColor),
  ];
}

export function openingGeometry(object:EditorObject):OpeningGeometry|undefined{
  const spec=openingCatalogSpec(object),model=spec?openingModel(spec.modelId):undefined;
  if(!spec||!model)return undefined;
  const parts:OpeningGeometryPart[]=[...trimParts(object,spec)];
  if(model.category==='Doors'){
    const double=model.style==='Double Door'||model.style==='Glass Patio';
    const panelCount=double?2:1,panelWidth=(object.widthIn-(double?.35:0))/panelCount;
    for(let index=0;index<panelCount;index++){
      const x=panelCount===1?0:(index===0?-panelWidth/2-.0875:panelWidth/2+.0875);
      if(model.style==='Glass Patio'){
        parts.push(part(`glass-${index}`,'glass',x,0,-.2,panelWidth-2,object.heightIn-4,.18,spec.glassTint,.42,.05,.08));
        parts.push(part(`frame-${index}`,'frame',x,0,0,panelWidth,object.heightIn,.5,spec.frameColor));
      }else{
        parts.push(part(`panel-${index}`,'panel',x,0,0,panelWidth,object.heightIn,.72,spec.panelColor));
        if(model.style!=='Pocket Door')parts.push(part(`panel-inset-${index}`,'frame',x,0,-.42,Math.max(8,panelWidth-5),Math.max(20,object.heightIn-10),.18,'#6F4D36'));
      }
      if(model.style!=='Pocket Door')parts.push(part(`handle-${index}`,'handle',x+(index===0?panelWidth*.31:-panelWidth*.31),0,-.72,1.1,2.2,.8,'#8B8D8C',1,.92,.25));
    }
  }else{
    parts.push(part('glass','glass',0,0,-.18,object.widthIn-2,object.heightIn-2,.14,spec.glassTint,.38,.04,.06));
    const frame=1.5;
    parts.push(part('frame-left','frame',-object.widthIn/2+frame/2,0,0,frame,object.heightIn,.5,spec.frameColor),part('frame-right','frame',object.widthIn/2-frame/2,0,0,frame,object.heightIn,.5,spec.frameColor),part('frame-top','frame',0,object.heightIn/2-frame/2,0,object.widthIn-3,frame,.5,spec.frameColor),part('frame-bottom','frame',0,-object.heightIn/2+frame/2,0,object.widthIn-3,frame,.5,spec.frameColor));
    if(model.style==='Double Casement'||model.style==='Slider')parts.push(part('mullion-center','mullion',0,0,-.3,1.2,object.heightIn-3,.35,spec.frameColor));
    if(model.style==='Double Casement')parts.push(part('mullion-horizontal','mullion',0,0,-.3,object.widthIn-3,1,.35,spec.frameColor));
    parts.push(part('sill','sill',0,-object.heightIn/2-1,0,object.widthIn+3,1.25,Math.max(4,object.depthIn+1),spec.frameColor));
  }
  return{model,spec,parts};
}

export function doorSwingArc(object:EditorObject){
  if(object.kind!=='door'||openingCatalogSpec(object)?.style==='Pocket Door')return undefined;
  const swing=openingData(object).swingDirection??'Left In';
  const left=swing.startsWith('Left'),inward=swing.endsWith('In');
  const hingeX=left?-object.widthIn/2:object.widthIn/2;
  const startAngle=left?0:180;
  const endAngle=startAngle+(left?1:-1)*(inward?90:-90);
  return{center:{x:hingeX,y:0},radiusIn:object.widthIn,startAngleDeg:startAngle,endAngleDeg:endAngle,direction:swing};
}
