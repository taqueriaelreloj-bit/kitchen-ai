import { EditorObject, EditorProject } from './editor';
import { isLighting } from './lighting';

export type PlanSvgOptions={
  pixelsPerInch?:number;
  marginIn?:number;
  showLabels?:boolean;
  showDimensions?:boolean;
  includeRoomBoundary?:boolean;
};

type Bounds={left:number;top:number;right:number;bottom:number};
const INCHES_PER_METER=39.3701;
const escapeXml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const round=(value:number)=>Math.round(value*100)/100;
const safeColor=(value:string|undefined,fallback:string)=>/^#[0-9a-fA-F]{3,8}$/.test(value??'')?value!:fallback;
const normalizedRotation=(value:number)=>((value%360)+360)%360;

function objectBounds(object:EditorObject):Bounds{
  const width=Math.max(.1,object.widthIn),depth=Math.max(.1,object.kind==='wall'?object.depthIn:object.depthIn);
  const radians=normalizedRotation(object.rotation)*Math.PI/180;
  const rotatedWidth=Math.abs(width*Math.cos(radians))+Math.abs(depth*Math.sin(radians));
  const rotatedDepth=Math.abs(width*Math.sin(radians))+Math.abs(depth*Math.cos(radians));
  const centerX=object.x+width/2,centerY=object.y+depth/2;
  return{left:centerX-rotatedWidth/2,top:centerY-rotatedDepth/2,right:centerX+rotatedWidth/2,bottom:centerY+rotatedDepth/2};
}

function planBounds(project:EditorProject,includeRoomBoundary:boolean):Bounds{
  const bounds=project.objects.map(objectBounds);
  if(includeRoomBoundary){
    bounds.push({left:0,top:0,right:project.room.widthM*INCHES_PER_METER,bottom:project.room.lengthM*INCHES_PER_METER});
  }
  if(!bounds.length)return{left:0,top:0,right:120,bottom:120};
  return{
    left:Math.min(...bounds.map(item=>item.left)),
    top:Math.min(...bounds.map(item=>item.top)),
    right:Math.max(...bounds.map(item=>item.right)),
    bottom:Math.max(...bounds.map(item=>item.bottom)),
  };
}

function objectFill(object:EditorObject){
  if(object.kind==='wall')return safeColor(object.color,'#F2EFE7');
  if(object.kind==='door')return'#8A664B';
  if(object.kind==='window')return'#8FC7DC';
  if(object.kind==='appliance')return isLighting(object)?'#FFDDA1':safeColor(object.color,'#9FA7A8');
  if(object.kind==='countertop')return safeColor(object.color,'#EAE6DC');
  if(object.kind==='hardware')return safeColor(object.color,'#555A5B');
  return safeColor(object.color,'#D8D4CA');
}

function objectStroke(object:EditorObject){
  if(object.kind==='wall')return'#65736E';
  if(object.kind==='window')return'#326A80';
  if(object.kind==='door')return'#583C29';
  return'#56645F';
}

function objectSvg(object:EditorObject,scale:number,originX:number,originY:number,showLabels:boolean,showDimensions:boolean){
  const width=object.widthIn*scale,depth=Math.max(object.kind==='wall'?object.depthIn:object.depthIn,.75)*scale;
  const centerX=(object.x+object.widthIn/2-originX)*scale,centerY=(object.y+object.depthIn/2-originY)*scale;
  const name=escapeXml(object.name),kind=escapeXml(object.kind),fill=objectFill(object),stroke=objectStroke(object);
  const rotation=round(object.rotation),fontSize=Math.max(8,Math.min(14,width*.14));
  const labelY=depth/2+fontSize+3;
  const dimension=`${round(object.widthIn)} in × ${round(object.kind==='wall'?object.heightIn:object.depthIn)} in`;
  const shape=isLighting(object)
    ?`<ellipse cx="0" cy="0" rx="${round(Math.max(3,width/2))}" ry="${round(Math.max(3,depth/2))}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
    :`<rect x="${round(-width/2)}" y="${round(-depth/2)}" width="${round(width)}" height="${round(depth)}" rx="${object.kind==='wall'?0:2}" fill="${fill}" stroke="${stroke}" stroke-width="${object.kind==='wall'?2:1.5}"/>`;
  return `<g id="${escapeXml(object.id)}" class="object ${kind}" transform="translate(${round(centerX)} ${round(centerY)}) rotate(${rotation})"><title>${name} — ${escapeXml(dimension)}</title>${shape}${showLabels?`<text x="0" y="${round(labelY)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${round(fontSize)}" font-weight="700" fill="#24332E" transform="rotate(${-rotation})">${name}</text>`:''}${showDimensions?`<text x="0" y="${round(labelY+fontSize+2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${round(Math.max(7,fontSize*.78))}" fill="#4F625B" transform="rotate(${-rotation})">${escapeXml(dimension)}</text>`:''}</g>`;
}

export function planSvg(project:EditorProject,options:PlanSvgOptions={}):string{
  const scale=Math.max(.5,Math.min(12,options.pixelsPerInch??4));
  const margin=Math.max(0,options.marginIn??18);
  const showLabels=options.showLabels!==false,showDimensions=options.showDimensions!==false,includeRoomBoundary=options.includeRoomBoundary!==false;
  const raw=planBounds(project,includeRoomBoundary),left=raw.left-margin,top=raw.top-margin,right=raw.right+margin,bottom=raw.bottom+margin;
  const width=Math.max(1,(right-left)*scale),height=Math.max(1,(bottom-top)*scale);
  const roomWidth=project.room.widthM*INCHES_PER_METER*scale,roomLength=project.room.lengthM*INCHES_PER_METER*scale;
  const roomX=(0-left)*scale,roomY=(0-top)*scale;
  const title=escapeXml(project.name||'Kitchen AI Plan');
  const objects=project.objects.map(object=>objectSvg(object,scale,left,top,showLabels,showDimensions)).join('');
  const boundary=includeRoomBoundary?`<rect x="${round(roomX)}" y="${round(roomY)}" width="${round(roomWidth)}" height="${round(roomLength)}" fill="none" stroke="#1F5E4C" stroke-width="2" stroke-dasharray="8 5"/>`:'';
  const scaleBar=12*scale;
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}" role="img" aria-labelledby="plan-title plan-desc"><title id="plan-title">${title}</title><desc id="plan-desc">Kitchen AI vector floor plan. Dimensions are shown in inches and are independent from editor zoom.</desc><rect width="100%" height="100%" fill="#FAFBFA"/><g id="room-boundary">${boundary}</g><g id="objects">${objects}</g><g id="scale" transform="translate(18 ${round(height-18)})"><line x1="0" y1="0" x2="${round(scaleBar)}" y2="0" stroke="#20322C" stroke-width="3"/><line x1="0" y1="-5" x2="0" y2="5" stroke="#20322C" stroke-width="2"/><line x1="${round(scaleBar)}" y1="-5" x2="${round(scaleBar)}" y2="5" stroke="#20322C" stroke-width="2"/><text x="${round(scaleBar/2)}" y="-8" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#20322C">12 in</text></g><text x="18" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#1F352E">${title}</text><text x="18" y="39" font-family="Arial, sans-serif" font-size="9" fill="#5D6C67">Digital planning representation — verify field dimensions before construction</text></svg>`;
}

export function planSvgFileName(project:EditorProject):string{
  const base=(project.name||'Kitchen Project').trim().replace(/[^a-z0-9-_]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Kitchen-Project';
  return`${base}-plan.svg`;
}
