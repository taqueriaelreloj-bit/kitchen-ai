import { doorSwingGeometry } from './doorSwing';
import { EditorObject, EditorProject, isCabinetKind } from './editor';

export type PlanExportOptions={
  pixelsPerInch?:number;
  paddingIn?:number;
  grid?:boolean;
  measurements?:boolean;
  labels?:boolean;
  titleBlock?:boolean;
};
type Bounds={left:number;top:number;right:number;bottom:number};

const normalized=(value:number)=>((value%360)+360)%360;
const radians=(value:number)=>normalized(value)*Math.PI/180;
const escapeXml=(value:string)=>value.replace(/[<>&"']/g,character=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[character]!));
const round=(value:number,places=2)=>{const factor=10**places;return Math.round(value*factor)/factor;};
const feetInches=(value:number)=>{
  const total=Math.round(value),feet=Math.floor(total/12),inches=total%12;
  return feet?`${feet}'-${inches}"`:`${inches}"`;
};
const objectColor=(object:EditorObject)=>object.color??(object.kind==='wall'?'#E7E3DA':object.kind==='window'?'#91C7DC':object.kind==='door'?'#8A664B':object.kind==='appliance'?'#A7ADAE':object.kind==='countertop'?'#DDD7CF':isCabinetKind(object.kind)?'#D8D4CA':'#C8CFCC');
const categoryClass=(object:EditorObject)=>object.kind.replace(/[^a-z0-9]+/gi,'-');

export function planObjectBounds(object:EditorObject):Bounds{
  const angle=radians(object.rotation),centerX=object.x+object.widthIn/2,centerY=object.y+object.depthIn/2,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),width=object.widthIn*c+object.depthIn*s,depth=object.widthIn*s+object.depthIn*c;
  return{left:centerX-width/2,top:centerY-depth/2,right:centerX+width/2,bottom:centerY+depth/2};
}
export function planBounds(project:EditorProject,paddingIn=18):Bounds{
  const objects=project.objects.filter(object=>object.kind!=='hardware');
  if(!objects.length)return{left:0,top:0,right:project.room.widthM*39.3701,bottom:project.room.lengthM*39.3701};
  const bounds=objects.map(planObjectBounds);
  return{
    left:Math.min(...bounds.map(value=>value.left))-paddingIn,
    top:Math.min(...bounds.map(value=>value.top))-paddingIn,
    right:Math.max(...bounds.map(value=>value.right))+paddingIn,
    bottom:Math.max(...bounds.map(value=>value.bottom))+paddingIn,
  };
}

function line(x1:number,y1:number,x2:number,y2:number,className:string){return`<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" class="${className}"/>`;}
function text(x:number,y:number,value:string,className:string,anchor='middle'){return`<text x="${round(x)}" y="${round(y)}" class="${className}" text-anchor="${anchor}">${escapeXml(value)}</text>`;}

function dimensionSvg(object:EditorObject,scale:number){
  const width=object.widthIn*scale,depth=(object.kind==='wall'?object.heightIn:object.depthIn),label=`${feetInches(object.widthIn)}${object.kind==='wall'?` · H ${feetInches(object.heightIn)}`:` × ${feetInches(depth)}`}`;
  const y=-7;
  return[
    line(0,y,width,y,'dimension-line'),
    line(0,y-3,0,y+3,'dimension-tick'),
    line(width,y-3,width,y+3,'dimension-tick'),
    text(width/2,y-3,label,'dimension-text'),
  ].join('');
}

function doorSwingSvg(object:EditorObject,scale:number){
  const swing=doorSwingGeometry(object),width=object.widthIn*scale,hingeX=swing.hinge==='left'?0:width,hingeY=object.depthIn*scale/2,freeX=width/2+swing.handleAlongIn*scale,freeY=hingeY+swing.handleNormalIn*scale,closedX=swing.hinge==='left'?width:0,radius=width;
  const sweep=swing.direction==='in'?1:0;
  return[
    line(hingeX,hingeY,freeX,freeY,'door-leaf'),
    `<path d="M ${round(closedX)} ${round(hingeY)} A ${round(radius)} ${round(radius)} 0 0 ${sweep} ${round(freeX)} ${round(freeY)}" class="door-arc"/>`,
    `<circle cx="${round(hingeX)}" cy="${round(hingeY)}" r="2" class="door-hinge"/>`,
  ].join('');
}

function objectSvg(object:EditorObject,scale:number,options:Required<PlanExportOptions>){
  const width=object.widthIn*scale,depth=Math.max(object.kind==='wall'?object.depthIn:object.depthIn,1)*scale,x=object.x*scale,y=object.y*scale,rotation=normalized(object.rotation),centerX=width/2,centerY=depth/2,fill=objectColor(object),stroke=object.kind==='wall'?'#4C5552':'#596762',className=categoryClass(object);
  const parts=[`<g id="${escapeXml(object.id)}" class="object ${className}" transform="translate(${round(x)} ${round(y)}) rotate(${round(rotation)} ${round(centerX)} ${round(centerY)})">`];
  parts.push(`<rect x="0" y="0" width="${round(width)}" height="${round(depth)}" rx="${object.kind==='wall'?0:2}" fill="${fill}" stroke="${stroke}" stroke-width="${object.kind==='wall'?1.4:1}"/>`);
  if(object.kind==='window')parts.push(line(width/2,0,width/2,depth,'window-center'));
  if(object.kind==='door')parts.push(doorSwingSvg(object,scale));
  if(object.kind==='island')parts.push(`<rect x="${round(width*.08)}" y="${round(depth*.12)}" width="${round(width*.84)}" height="${round(depth*.76)}" rx="3" class="island-inset"/>`);
  if(object.kind==='appliance')parts.push(`<rect x="${round(width*.12)}" y="${round(depth*.14)}" width="${round(width*.76)}" height="${round(depth*.72)}" rx="2" class="appliance-detail"/>`);
  if(options.labels)parts.push(text(width/2,depth/2+3,object.name,'object-label'));
  if(options.measurements)parts.push(dimensionSvg(object,scale));
  parts.push('</g>');
  return parts.join('');
}

export function projectPlanSvg(project:EditorProject,partial:PlanExportOptions={}):string{
  const options:Required<PlanExportOptions>={pixelsPerInch:partial.pixelsPerInch??4,paddingIn:partial.paddingIn??24,grid:partial.grid??true,measurements:partial.measurements??true,labels:partial.labels??true,titleBlock:partial.titleBlock??true};
  const scale=Math.max(.5,Math.min(12,options.pixelsPerInch)),bounds=planBounds(project,options.paddingIn),width=(bounds.right-bounds.left)*scale,height=(bounds.bottom-bounds.top)*scale,titleHeight=options.titleBlock?64:0,viewWidth=Math.max(320,width),viewHeight=Math.max(240,height+titleHeight),originX=-bounds.left*scale,originY=-bounds.top*scale;
  const grid=[] as string[];
  if(options.grid){
    const spacing=12*scale,startX=Math.floor(bounds.left/12)*12*scale+originX,startY=Math.floor(bounds.top/12)*12*scale+originY;
    for(let x=startX;x<=viewWidth;x+=spacing)grid.push(line(x,0,x,height,'grid-line'));
    for(let y=startY;y<=height;y+=spacing)grid.push(line(0,y,viewWidth,y,'grid-line'));
  }
  const title=options.titleBlock?`<g class="title-block" transform="translate(0 ${round(height)})"><rect x="0" y="0" width="${round(viewWidth)}" height="${titleHeight}" class="title-background"/><text x="16" y="24" class="project-title">${escapeXml(project.name)}</text><text x="16" y="44" class="project-meta">Kitchen AI plan · Room ${round(project.room.widthM,2)} m × ${round(project.room.lengthM,2)} m · Digital vector export</text><text x="${round(viewWidth-16)}" y="24" class="project-date" text-anchor="end">${escapeXml(new Date(project.updatedAt).toLocaleDateString())}</text><text x="${round(viewWidth-16)}" y="44" class="project-meta" text-anchor="end">Dimensions govern; verify field conditions</text></g>`:'';
  const objects=project.objects.filter(object=>object.kind!=='hardware').map(object=>objectSvg(object,scale,options)).join('');
  return`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${round(viewWidth)}" height="${round(viewHeight)}" viewBox="0 0 ${round(viewWidth)} ${round(viewHeight)}" role="img" aria-label="${escapeXml(project.name)} 2D kitchen plan"><style>\n.grid-line{stroke:#9DAEA8;stroke-width:.5;opacity:.28}.object-label{font:700 9px Arial,sans-serif;fill:#263530;paint-order:stroke;stroke:#fff;stroke-width:2px}.dimension-line,.dimension-tick{stroke:#315F55;stroke-width:.8}.dimension-text{font:700 8px Arial,sans-serif;fill:#315F55;paint-order:stroke;stroke:#fff;stroke-width:2px}.window-center{stroke:#426D7E;stroke-width:1}.door-leaf{stroke:#5A3F2E;stroke-width:2}.door-arc{fill:none;stroke:#2F705E;stroke-width:1;stroke-dasharray:3 2}.door-hinge{fill:#263C35}.island-inset{fill:none;stroke:#55645F;stroke-width:1}.appliance-detail{fill:none;stroke:#4B5555;stroke-width:1}.title-background{fill:#17211F}.project-title{font:900 18px Arial,sans-serif;fill:#fff}.project-meta{font:700 10px Arial,sans-serif;fill:#CBD6D3}.project-date{font:900 12px Arial,sans-serif;fill:#fff}\n</style><rect width="100%" height="100%" fill="#F8FAF9"/><g transform="translate(${round(originX)} ${round(originY)})">${grid.join('')}${objects}</g>${title}</svg>`;
}

export function projectPlanFileName(project:EditorProject){
  const base=project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'kitchen-ai-project';
  return`${base}-2d-plan.svg`;
}
