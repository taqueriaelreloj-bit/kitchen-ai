import {
  CabinetScope, EditorObject, EditorProject, isBaseCabinetKind, isCabinetKind,
  isWallCabinetKind, updateObject,
} from './editor';

export type CabinetDoorStyleId='slab'|'shaker'|'slim-shaker'|'raised-panel'|'recessed-panel'|'beadboard'|'glass-frame'|'louvered';
export type CabinetDoorStyle={
  id:CabinetDoorStyleId;
  name:string;
  description:string;
  railWidthIn:number;
  panelInsetIn:number;
  centerPanelDepthIn:number;
  glass:boolean;
  texture:'smooth'|'wood-grain'|'beadboard'|'louvered';
  marketCommon:boolean;
};
export type DoorFace={
  id:string;
  offsetXIn:number;
  offsetYIn:number;
  widthIn:number;
  heightIn:number;
  role:'door'|'drawer';
};
export type DoorStylePart={
  id:string;
  faceId:string;
  kind:'slab'|'rail'|'stile'|'center-panel'|'glass'|'bead'|'louver';
  offsetXIn:number;
  offsetYIn:number;
  offsetZIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  roughness:number;
  metalness:number;
  opacity:number;
};
export type CabinetDoorGeometry={
  style:CabinetDoorStyle;
  faces:DoorFace[];
  parts:DoorStylePart[];
};

type StyledCabinet=EditorObject&{cabinetDoorStyleId?:CabinetDoorStyleId};

export const CABINET_DOOR_STYLES:CabinetDoorStyle[]=[
  {id:'slab',name:'Slab',description:'Flat contemporary door with no frame or raised center.',railWidthIn:0,panelInsetIn:0,centerPanelDepthIn:0,glass:false,texture:'smooth',marketCommon:true},
  {id:'shaker',name:'Shaker',description:'Classic five-piece door with balanced rails and stiles.',railWidthIn:2.25,panelInsetIn:.22,centerPanelDepthIn:-.18,glass:false,texture:'wood-grain',marketCommon:true},
  {id:'slim-shaker',name:'Slim Shaker',description:'Narrow-frame Shaker profile for a modern transitional look.',railWidthIn:1,panelInsetIn:.16,centerPanelDepthIn:-.12,glass:false,texture:'smooth',marketCommon:true},
  {id:'raised-panel',name:'Raised Panel',description:'Traditional framed door with a raised center panel.',railWidthIn:2.5,panelInsetIn:.22,centerPanelDepthIn:.18,glass:false,texture:'wood-grain',marketCommon:true},
  {id:'recessed-panel',name:'Recessed Panel',description:'Framed door with a deeper flat recessed center.',railWidthIn:2.25,panelInsetIn:.28,centerPanelDepthIn:-.26,glass:false,texture:'smooth',marketCommon:true},
  {id:'beadboard',name:'Beadboard',description:'Framed cottage door with vertical beadboard center detail.',railWidthIn:2.25,panelInsetIn:.24,centerPanelDepthIn:-.18,glass:false,texture:'beadboard',marketCommon:true},
  {id:'glass-frame',name:'Glass Frame',description:'Framed upper-cabinet door with a transparent glass center.',railWidthIn:2,panelInsetIn:.18,centerPanelDepthIn:-.12,glass:true,texture:'smooth',marketCommon:true},
  {id:'louvered',name:'Louvered',description:'Ventilated decorative door with horizontal slat detail.',railWidthIn:2.25,panelInsetIn:.24,centerPanelDepthIn:-.16,glass:false,texture:'louvered',marketCommon:false},
];

export const cabinetDoorStyle=(id?:string)=>CABINET_DOOR_STYLES.find(style=>style.id===id)??CABINET_DOOR_STYLES.find(style=>style.id==='shaker')!;
export const cabinetDoorStyleId=(object:EditorObject)=>(object as StyledCabinet).cabinetDoorStyleId??'shaker';

function doubleFaces(object:EditorObject,role:DoorFace['role'],bottom:number,height:number):DoorFace[]{
  const gap=.22;
  if(object.widthIn<27)return[{id:`${role}-0`,offsetXIn:0,offsetYIn:bottom+height/2,widthIn:Math.max(2,object.widthIn-.5),heightIn:Math.max(2,height),role}];
  const width=Math.max(2,(object.widthIn-gap-.5)/2);
  return[-1,1].map((side,index)=>({id:`${role}-${index}`,offsetXIn:side*(width/2+gap/2),offsetYIn:bottom+height/2,widthIn:width,heightIn:Math.max(2,height),role}));
}

export function cabinetDoorFaces(object:EditorObject):DoorFace[]{
  const usableHeight=Math.max(4,object.heightIn-3);
  const bottom=-usableHeight/2;
  if(object.kind==='drawer-base'){
    const topDrawer=Math.min(7,usableHeight*.23);
    const remaining=usableHeight-topDrawer-.44;
    return[
      {id:'drawer-0',offsetXIn:0,offsetYIn:bottom+topDrawer/2,widthIn:Math.max(2,object.widthIn-.5),heightIn:topDrawer,role:'drawer'},
      {id:'drawer-1',offsetXIn:0,offsetYIn:bottom+topDrawer+.22+remaining/4,widthIn:Math.max(2,object.widthIn-.5),heightIn:remaining/2-.11,role:'drawer'},
      {id:'drawer-2',offsetXIn:0,offsetYIn:bottom+topDrawer+.44+remaining*.75,widthIn:Math.max(2,object.widthIn-.5),heightIn:remaining/2-.11,role:'drawer'},
    ];
  }
  if(object.kind==='tall-cabinet'||object.kind==='pantry-cabinet'||object.kind==='oven-cabinet'||object.kind==='refrigerator-cabinet'){
    const lower=Math.min(34,usableHeight*.42),upper=usableHeight-lower-.28;
    return[
      ...doubleFaces(object,'door',bottom,lower).map(face=>({...face,id:`lower-${face.id}`})),
      ...doubleFaces(object,'door',bottom+lower+.28,upper).map(face=>({...face,id:`upper-${face.id}`})),
    ];
  }
  return doubleFaces(object,'door',bottom,usableHeight);
}

const part=(face:DoorFace,id:string,kind:DoorStylePart['kind'],x:number,y:number,z:number,width:number,height:number,depth:number,roughness=.44,opacity=1):DoorStylePart=>({id:`${face.id}-${id}`,faceId:face.id,kind,offsetXIn:face.offsetXIn+x,offsetYIn:face.offsetYIn+y,offsetZIn:z,widthIn:Math.max(.06,width),heightIn:Math.max(.06,height),depthIn:Math.max(.02,depth),roughness,metalness:0,opacity});

function framedParts(face:DoorFace,style:CabinetDoorStyle):DoorStylePart[]{
  const rail=Math.min(style.railWidthIn,face.widthIn*.3,face.heightIn*.3);
  const centerWidth=Math.max(.3,face.widthIn-rail*2);
  const centerHeight=Math.max(.3,face.heightIn-rail*2);
  const frameDepth=.38;
  const parts=[
    part(face,'top','rail',0,face.heightIn/2-rail/2,0,face.widthIn,rail,frameDepth),
    part(face,'bottom','rail',0,-face.heightIn/2+rail/2,0,face.widthIn,rail,frameDepth),
    part(face,'left','stile',-face.widthIn/2+rail/2,0,0,rail,centerHeight,frameDepth),
    part(face,'right','stile',face.widthIn/2-rail/2,0,0,rail,centerHeight,frameDepth),
  ];
  if(style.glass)parts.push(part(face,'glass','glass',0,0,-style.panelInsetIn,centerWidth,centerHeight,.12,.08,.42));
  else parts.push(part(face,'center','center-panel',0,0,style.centerPanelDepthIn-style.panelInsetIn,centerWidth,centerHeight,.25,style.texture==='wood-grain'?.58:.46));
  if(style.texture==='beadboard'){
    const count=Math.max(2,Math.floor(centerWidth/2.25));
    for(let index=1;index<count;index++){
      const x=-centerWidth/2+(centerWidth/count)*index;
      parts.push(part(face,`bead-${index}`,'bead',x,0,.03,.13,centerHeight,.16,.5));
    }
  }
  if(style.texture==='louvered'){
    const count=Math.max(3,Math.floor(centerHeight/2));
    for(let index=0;index<count;index++){
      const y=-centerHeight/2+(centerHeight/(count-1))*index;
      parts.push(part(face,`louver-${index}`,'louver',0,y,.04,centerWidth,1,.25,.56));
    }
  }
  return parts;
}

export function cabinetDoorGeometry(object:EditorObject):CabinetDoorGeometry|undefined{
  if(!isCabinetKind(object.kind)&&object.kind!=='island')return undefined;
  const style=cabinetDoorStyle(cabinetDoorStyleId(object));
  const faces=cabinetDoorFaces(object);
  const parts=style.id==='slab'
    ?faces.map(face=>part(face,'slab','slab',0,0,0,face.widthIn,face.heightIn,.34,.42))
    :faces.flatMap(face=>framedParts(face,style));
  return{style,faces,parts};
}

const inScope=(object:EditorObject,scope:CabinetScope,selectedId?:string)=>{
  if(scope==='selected')return object.id===selectedId;
  if(scope==='base')return isBaseCabinetKind(object.kind)||['tall-cabinet','pantry-cabinet','oven-cabinet','refrigerator-cabinet'].includes(object.kind);
  if(scope==='wall')return isWallCabinetKind(object.kind);
  if(scope==='island')return object.kind==='island';
  return isCabinetKind(object.kind)||object.kind==='island';
};

export function applyCabinetDoorStyle(project:EditorProject,styleId:CabinetDoorStyleId,scope:CabinetScope='selected'):EditorProject{
  if(!CABINET_DOOR_STYLES.some(style=>style.id===styleId))return project;
  return{
    ...project,
    objects:project.objects.map(object=>inScope(object,scope,project.selectedId)?{...object,cabinetDoorStyleId:styleId}:object),
    updatedAt:new Date().toISOString(),
  };
}

export function updateSelectedCabinetDoorStyle(project:EditorProject,styleId:CabinetDoorStyleId){
  if(!project.selectedId)return project;
  return updateObject(project,project.selectedId,{cabinetDoorStyleId:styleId} as Partial<EditorObject>);
}
