import { countertopData, countertopMaterial } from './countertops';
import {
  EditorObject, EditorProject, isBaseCabinetKind, isBaseLikeKind, isCabinetKind,
} from './editor';
import { isLighting, lightingData } from './lighting';
import { openingData } from './openings';

export type MaterialUnit = 'ea'|'lin ft'|'sq ft';
export type MaterialLine = {
  category: 'Cabinets'|'Hardware'|'Toe Kick'|'Countertops'|'Wall Paint'|'Appliances'|'Lighting'|'Openings';
  item: string;
  quantity: number;
  unit: MaterialUnit;
  notes: string;
};

export type BillOfMaterialsSummary = {
  cabinetCount: number;
  hardwareCount: number;
  toeKickLinearFeet: number;
  countertopSquareFeet: number;
  wallPaintSquareFeet: number;
  applianceCount: number;
  lightingCount: number;
};

const round=(value:number,places=2)=>{
  const factor=10**places;
  return Math.round(value*factor)/factor;
};
const label=(value:string)=>value.replace(/-/g,' ').replace(/\b\w/g,character=>character.toUpperCase());
const hardwareCount=(object:EditorObject)=>{
  if(!object.hardware||object.hardware.style==='No Hardware')return 0;
  if(object.kind==='drawer-base')return 3;
  if(object.kind==='island')return Math.max(2,Math.round(object.widthIn/24));
  return object.widthIn>=30?2:1;
};

function group(lines:MaterialLine[]):MaterialLine[]{
  const grouped=new Map<string,MaterialLine>();
  for(const line of lines){
    const key=[line.category,line.item,line.unit,line.notes].join('|');
    const existing=grouped.get(key);
    if(existing)existing.quantity=round(existing.quantity+line.quantity);
    else grouped.set(key,{...line,quantity:round(line.quantity)});
  }
  return [...grouped.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.item.localeCompare(b.item));
}

function wallPaintArea(project:EditorProject,wall:EditorObject){
  const gross=wall.widthIn*wall.heightIn;
  const openings=project.objects.filter(object=>{
    if(object.kind!=='door'&&object.kind!=='window')return false;
    return openingData(object).parentWallId===wall.id;
  }).reduce((total,opening)=>total+opening.widthIn*opening.heightIn,0);
  return Math.max(0,gross-openings)/144;
}

export function buildBillOfMaterials(project:EditorProject):MaterialLine[]{
  const lines:MaterialLine[]=[];
  for(const object of project.objects){
    if(isCabinetKind(object.kind)){
      lines.push({category:'Cabinets',item:label(object.kind),quantity:1,unit:'ea',notes:[object.finishId,object.material].filter(Boolean).join(' · ')});
      const pulls=hardwareCount(object);
      if(pulls>0)lines.push({category:'Hardware',item:object.hardware?.style??'Cabinet Hardware',quantity:pulls,unit:'ea',notes:[object.hardware?.size,object.hardware?.finishId,object.hardware?.position].filter(Boolean).join(' · ')});
      if(isBaseLikeKind(object.kind)&&object.toeKick?.enabled)lines.push({category:'Toe Kick',item:'Cabinet Toe Kick',quantity:object.widthIn/12,unit:'lin ft',notes:`${object.toeKick.heightIn} in high · ${object.toeKick.recessIn} in recess · ${object.toeKick.finish}`});
    }

    if(isBaseCabinetKind(object.kind)||object.kind==='island'||object.kind==='countertop'){
      const spec=countertopData(object),material=countertopMaterial(object);
      const width=object.widthIn+spec.overhangSideIn*2;
      const depth=object.depthIn+spec.overhangFrontIn;
      lines.push({category:'Countertops',item:material.name,quantity:(width*depth)/144,unit:'sq ft',notes:`${spec.thicknessIn} in · ${spec.edgeProfile}${spec.sinkCutout?' · sink cutout':''}${spec.cooktopCutout?' · cooktop cutout':''}`});
      if(spec.backsplashHeightIn>0)lines.push({category:'Countertops',item:`${material.name} Backsplash`,quantity:(width*spec.backsplashHeightIn)/144,unit:'sq ft',notes:`${spec.backsplashHeightIn} in high`});
    }

    if(object.kind==='wall')lines.push({category:'Wall Paint',item:object.wallPaintId?label(object.wallPaintId):'Wall Paint',quantity:wallPaintArea(project,object),unit:'sq ft',notes:object.color??''});

    if(object.kind==='appliance'&&!isLighting(object))lines.push({category:'Appliances',item:object.name,quantity:1,unit:'ea',notes:[object.material,`${object.widthIn} × ${object.depthIn} × ${object.heightIn} in`].filter(Boolean).join(' · ')});

    if(isLighting(object)){
      const light=lightingData(object);
      lines.push({category:'Lighting',item:`${light.type} Light`,quantity:1,unit:'ea',notes:`${light.colorTemperatureK}K · ${light.intensityPercent}%${light.enabled?'':' · Off'}`});
    }

    if(object.kind==='door'||object.kind==='window')lines.push({category:'Openings',item:label(object.kind),quantity:1,unit:'ea',notes:`${object.widthIn} × ${object.heightIn} in${openingData(object).parentWallId?` · wall ${openingData(object).parentWallId}`:' · unattached'}`});
  }
  return group(lines);
}

export function summarizeBillOfMaterials(project:EditorProject):BillOfMaterialsSummary{
  const lines=buildBillOfMaterials(project);
  const sum=(category:MaterialLine['category'],unit:MaterialUnit)=>round(lines.filter(line=>line.category===category&&line.unit===unit).reduce((total,line)=>total+line.quantity,0));
  return {
    cabinetCount:sum('Cabinets','ea'),
    hardwareCount:sum('Hardware','ea'),
    toeKickLinearFeet:sum('Toe Kick','lin ft'),
    countertopSquareFeet:sum('Countertops','sq ft'),
    wallPaintSquareFeet:sum('Wall Paint','sq ft'),
    applianceCount:sum('Appliances','ea'),
    lightingCount:sum('Lighting','ea'),
  };
}

const csvCell=(value:string|number)=>`"${String(value).replace(/"/g,'""')}"`;
export function billOfMaterialsCsv(project:EditorProject):string{
  const header=['Category','Item','Quantity','Unit','Notes'];
  const rows=buildBillOfMaterials(project).map(line=>[line.category,line.item,line.quantity,line.unit,line.notes]);
  return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\n');
}
