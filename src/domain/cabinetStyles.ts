import {
  CabinetScope,
  EditorObject,
  EditorProject,
  isBaseCabinetKind,
  isCabinetKind,
  isTallCabinetKind,
  isWallCabinetKind,
  updateObject,
} from './editor';

export type CabinetDoorStyle='Shaker'|'Slab'|'Raised Panel'|'Recessed Panel'|'Beadboard'|'Glass Frame'|'Louvered';
export type CabinetOverlay='Full Overlay'|'Partial Overlay'|'Inset';
export type DrawerFrontStyle='Matching'|'Slab';
export type CabinetStyleSpec={
  doorStyle:CabinetDoorStyle;
  overlay:CabinetOverlay;
  drawerFrontStyle:DrawerFrontStyle;
  railIn:number;
  stileIn:number;
  revealIn:number;
  panelDepthIn:number;
  glassOpacity:number;
};
export type CabinetFrontMaterial='cabinet'|'glass'|'shadow';
export type CabinetFrontPart={
  id:string;
  frontIndex:number;
  offsetXIn:number;
  offsetYIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  material:CabinetFrontMaterial;
  roughness:number;
  metalness:number;
};

type StyledCabinetObject=EditorObject&{cabinetStyleSpec?:CabinetStyleSpec};
type FrontRect={index:number;x:number;y:number;width:number;height:number};

export const CABINET_DOOR_STYLES:CabinetDoorStyle[]=['Shaker','Slab','Raised Panel','Recessed Panel','Beadboard','Glass Frame','Louvered'];
export const CABINET_OVERLAYS:CabinetOverlay[]=['Full Overlay','Partial Overlay','Inset'];
export const DRAWER_FRONT_STYLES:DrawerFrontStyle[]=['Matching','Slab'];
export const DEFAULT_CABINET_STYLE:CabinetStyleSpec={doorStyle:'Shaker',overlay:'Full Overlay',drawerFrontStyle:'Matching',railIn:2.25,stileIn:2.25,revealIn:.125,panelDepthIn:.35,glassOpacity:.42};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round=(value:number)=>Math.round(value*100)/100;
const part=(id:string,frontIndex:number,offsetXIn:number,offsetYIn:number,widthIn:number,heightIn:number,depthIn:number,material:CabinetFrontMaterial,roughness=.44,metalness=.02):CabinetFrontPart=>({id,frontIndex,offsetXIn:round(offsetXIn),offsetYIn:round(offsetYIn),widthIn:round(Math.max(.05,widthIn)),heightIn:round(Math.max(.05,heightIn)),depthIn:round(Math.max(.02,depthIn)),material,roughness,metalness});

export function isStyledCabinet(object:EditorObject){return isCabinetKind(object.kind);}

export function cabinetStyleData(object:EditorObject):CabinetStyleSpec{
  const current=(object as StyledCabinetObject).cabinetStyleSpec;
  return{
    ...DEFAULT_CABINET_STYLE,
    ...(current??{}),
    railIn:clamp(current?.railIn??DEFAULT_CABINET_STYLE.railIn,.75,6),
    stileIn:clamp(current?.stileIn??DEFAULT_CABINET_STYLE.stileIn,.75,6),
    revealIn:clamp(current?.revealIn??DEFAULT_CABINET_STYLE.revealIn,0,1.5),
    panelDepthIn:clamp(current?.panelDepthIn??DEFAULT_CABINET_STYLE.panelDepthIn,.05,1.5),
    glassOpacity:clamp(current?.glassOpacity??DEFAULT_CABINET_STYLE.glassOpacity,.05,.95),
  };
}

function matchesScope(object:EditorObject,scope:CabinetScope,selectedId?:string){
  if(!isCabinetKind(object.kind))return false;
  if(scope==='selected')return object.id===selectedId;
  if(scope==='base')return isBaseCabinetKind(object.kind)||isTallCabinetKind(object.kind);
  if(scope==='wall')return isWallCabinetKind(object.kind);
  if(scope==='island')return object.kind==='island';
  return true;
}

export function updateCabinetStyle(project:EditorProject,id:string,patch:Partial<CabinetStyleSpec>):EditorProject{
  const object=project.objects.find(item=>item.id===id);
  if(!object||!isCabinetKind(object.kind))return project;
  const spec={...cabinetStyleData(object),...patch};
  return updateObject(project,id,{cabinetStyleSpec:spec} as Partial<EditorObject>);
}

export function applyCabinetStyle(project:EditorProject,patch:Partial<CabinetStyleSpec>,scope:CabinetScope):EditorProject{
  let changed=false;
  const objects=project.objects.map(object=>{
    if(!matchesScope(object,scope,project.selectedId))return object;
    changed=true;
    return{...object,cabinetStyleSpec:{...cabinetStyleData(object),...patch}} as EditorObject;
  });
  return changed?{...project,objects,updatedAt:new Date().toISOString()}:project;
}

function frontRects(object:EditorObject,spec:CabinetStyleSpec):FrontRect[]{
  const reveal=spec.overlay==='Inset'?Math.max(.125,spec.revealIn):spec.overlay==='Partial Overlay'?Math.max(.375,spec.revealIn):spec.revealIn;
  const usableWidth=Math.max(3,object.widthIn-reveal*2),usableHeight=Math.max(3,object.heightIn-reveal*2);
  if(object.kind==='drawer-base'){
    const gap=Math.max(.125,reveal),frontHeight=(usableHeight-gap*2)/3;
    return[0,1,2].map(index=>({index,x:0,y:-usableHeight/2+frontHeight/2+index*(frontHeight+gap),width:usableWidth,height:frontHeight}));
  }
  if(object.kind==='island'){
    const count=Math.max(2,Math.min(4,Math.round(object.widthIn/24))),gap=Math.max(.125,reveal),frontWidth=(usableWidth-gap*(count-1))/count;
    return Array.from({length:count},(_,index)=>({index,x:-usableWidth/2+frontWidth/2+index*(frontWidth+gap),y:0,width:frontWidth,height:usableHeight}));
  }
  const doubleDoor=object.widthIn>=30;
  if(!doubleDoor)return[{index:0,x:0,y:0,width:usableWidth,height:usableHeight}];
  const gap=Math.max(.125,reveal),doorWidth=(usableWidth-gap)/2;
  return[
    {index:0,x:-doorWidth/2-gap/4,y:0,width:doorWidth,height:usableHeight},
    {index:1,x:doorWidth/2+gap/4,y:0,width:doorWidth,height:usableHeight},
  ];
}

function frameParts(rect:FrontRect,spec:CabinetStyleSpec,style:CabinetDoorStyle):CabinetFrontPart[]{
  const rail=clamp(spec.railIn,.75,Math.max(.75,rect.height/3)),stile=clamp(spec.stileIn,.75,Math.max(.75,rect.width/3));
  const centerWidth=Math.max(.25,rect.width-stile*2),centerHeight=Math.max(.25,rect.height-rail*2),frameDepth=.72;
  const parts=[
    part(`${rect.index}-left`,rect.index,rect.x-rect.width/2+stile/2,rect.y,stile,rect.height,frameDepth,'cabinet',.4),
    part(`${rect.index}-right`,rect.index,rect.x+rect.width/2-stile/2,rect.y,stile,rect.height,frameDepth,'cabinet',.4),
    part(`${rect.index}-top`,rect.index,rect.x,rect.y-rect.height/2+rail/2,centerWidth,rail,frameDepth,'cabinet',.4),
    part(`${rect.index}-bottom`,rect.index,rect.x,rect.y+rect.height/2-rail/2,centerWidth,rail,frameDepth,'cabinet',.4),
  ];
  if(style==='Glass Frame')parts.push(part(`${rect.index}-glass`,rect.index,rect.x,rect.y,centerWidth,centerHeight,.18,'glass',.06,.02));
  else if(style==='Raised Panel')parts.push(part(`${rect.index}-raised`,rect.index,rect.x,rect.y,centerWidth,centerHeight,Math.max(.55,spec.panelDepthIn+.28),'cabinet',.33));
  else parts.push(part(`${rect.index}-panel`,rect.index,rect.x,rect.y,centerWidth,centerHeight,Math.max(.08,spec.panelDepthIn),'cabinet',style==='Recessed Panel'?.55:.48));
  if(style==='Beadboard'){
    const grooves=Math.max(2,Math.min(9,Math.floor(centerWidth/2.5)));
    for(let index=1;index<grooves;index++)parts.push(part(`${rect.index}-bead-${index}`,rect.index,rect.x-centerWidth/2+centerWidth*index/grooves,rect.y,.08,centerHeight,.06,'shadow',.9));
  }
  if(style==='Louvered'){
    const slats=Math.max(3,Math.min(12,Math.floor(centerHeight/2.4)));
    for(let index=0;index<slats;index++)parts.push(part(`${rect.index}-slat-${index}`,rect.index,rect.x,rect.y-centerHeight/2+(index+.5)*centerHeight/slats,centerWidth,Math.max(.3,centerHeight/slats*.55),.5,'cabinet',.42));
  }
  return parts;
}

export function cabinetFrontParts(object:EditorObject):CabinetFrontPart[]{
  if(!isCabinetKind(object.kind))return[];
  const spec=cabinetStyleData(object),rects=frontRects(object,spec);
  return rects.flatMap(rect=>{
    const useSlab=spec.doorStyle==='Slab'||(object.kind==='drawer-base'&&spec.drawerFrontStyle==='Slab');
    if(useSlab)return[part(`${rect.index}-slab`,rect.index,rect.x,rect.y,rect.width,rect.height,.68,'cabinet',.38)];
    return frameParts(rect,spec,spec.doorStyle);
  });
}

export function cabinetFrontCount(object:EditorObject){return new Set(cabinetFrontParts(object).map(item=>item.frontIndex)).size;}
