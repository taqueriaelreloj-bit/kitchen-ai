import { countertopData, countertopMaterial, islandData } from './countertops';
import {
  EditorObject,
  EditorProject,
  isBaseCabinetKind,
  isBaseLikeKind,
  isCabinetKind,
  isTallCabinetKind,
  normalizeCabinetHardware,
} from './editor';
import { isLighting, lightingData } from './lighting';
import { openingData } from './openings';

export type MaterialUnit='ea'|'lin ft'|'sq ft';
export type MaterialCategory='Cabinets'|'Hardware'|'Toe Kick'|'Countertops'|'Wall Paint'|'Appliances'|'Lighting'|'Openings';
export type MaterialLine={
  category:MaterialCategory;
  item:string;
  quantity:number;
  unit:MaterialUnit;
  notes:string;
};

export type BillOfMaterialsSummary={
  cabinetCount:number;
  countertopSquareFeet:number;
  hardwareCount:number;
  toeKickLinearFeet:number;
  wallPaintSquareFeet:number;
  applianceCount:number;
  lightingCount:number;
  openingCount:number;
};

const squareFeet=(widthIn:number,depthIn:number)=>Math.max(0,widthIn)*Math.max(0,depthIn)/144;
const rounded=(value:number)=>Math.round(Math.max(0,value)*100)/100;
const titleCase=(value:string)=>value.replace(/-/g,' ').replace(/\b\w/g,character=>character.toUpperCase());

function modeledCountertopArea(object:EditorObject){
  if(object.kind==='countertop'){
    const spec=countertopData(object);
    return squareFeet(object.widthIn,object.depthIn)+squareFeet(object.widthIn,spec.backsplashHeightIn);
  }
  if(object.kind==='island'){
    const spec=countertopData(object),island=islandData(object);
    let area=squareFeet(object.widthIn+spec.overhangSideIn*2,object.depthIn+spec.overhangFrontIn+island.seatingOverhangIn);
    if(island.waterfallLeft)area+=squareFeet(object.depthIn,object.heightIn);
    if(island.waterfallRight)area+=squareFeet(object.depthIn,object.heightIn);
    return area;
  }
  if(isBaseCabinetKind(object.kind))return squareFeet(object.widthIn,object.depthIn+1);
  return 0;
}

function hardwareUnits(object:EditorObject){
  if(!isCabinetKind(object.kind))return 0;
  const hardware=normalizeCabinetHardware(object.hardware);
  if(hardware.style==='No Hardware')return 0;
  if(object.kind==='drawer-base')return Math.max(2,Math.ceil(object.heightIn/10));
  if(object.kind==='island')return Math.max(2,Math.ceil(object.widthIn/24));
  if(isTallCabinetKind(object.kind))return Math.max(2,Math.ceil(object.widthIn/18));
  return Math.max(1,Math.ceil(object.widthIn/24));
}

function wallPaintArea(project:EditorProject){
  const squareMetersToSquareFeet=10.7639104167;
  const gross=2*(project.room.widthM+project.room.lengthM)*project.room.heightM*squareMetersToSquareFeet;
  const roomOpeningArea=project.room.openings.reduce((total,opening)=>{
    const assumedHeightM=opening.type==='door'?2.032:1.22;
    return total+opening.widthM*assumedHeightM*squareMetersToSquareFeet;
  },0);
  const modeledOpeningArea=project.objects
    .filter(object=>object.kind==='door'||object.kind==='window')
    .reduce((total,object)=>total+squareFeet(object.widthIn,object.heightIn),0);
  return gross-(project.room.openings.length?roomOpeningArea:modeledOpeningArea);
}

function groupLines(lines:MaterialLine[]):MaterialLine[]{
  const grouped=new Map<string,MaterialLine>();
  for(const line of lines){
    const key=[line.category,line.item,line.unit,line.notes].join('|');
    const existing=grouped.get(key);
    if(existing)existing.quantity=rounded(existing.quantity+line.quantity);
    else grouped.set(key,{...line,quantity:rounded(line.quantity)});
  }
  return [...grouped.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.item.localeCompare(b.item));
}

export function buildBillOfMaterials(project:EditorProject):MaterialLine[]{
  const lines:MaterialLine[]=[];
  for(const object of project.objects){
    if(isCabinetKind(object.kind)){
      lines.push({
        category:'Cabinets',
        item:titleCase(object.kind),
        quantity:1,
        unit:'ea',
        notes:[object.finishId,object.material].filter(Boolean).join(' · '),
      });
      const hardware=normalizeCabinetHardware(object.hardware);
      const units=hardwareUnits(object);
      if(units>0)lines.push({
        category:'Hardware',
        item:hardware.style,
        quantity:units,
        unit:'ea',
        notes:[hardware.size,hardware.finishId,hardware.position].filter(Boolean).join(' · '),
      });
      if(isBaseLikeKind(object.kind)&&object.toeKick?.enabled)lines.push({
        category:'Toe Kick',
        item:'Cabinet Toe Kick',
        quantity:object.widthIn/12,
        unit:'lin ft',
        notes:`${object.toeKick.heightIn} in high · ${object.toeKick.recessIn} in recess · ${object.toeKick.finish}`,
      });
    }

    const countertopArea=modeledCountertopArea(object);
    if(countertopArea>0){
      const spec=countertopData(object),material=countertopMaterial(object);
      lines.push({
        category:'Countertops',
        item:material.name,
        quantity:countertopArea,
        unit:'sq ft',
        notes:`${spec.thicknessIn} in · ${spec.edgeProfile}${spec.sinkCutout?' · sink cutout':''}${spec.cooktopCutout?' · cooktop cutout':''}`,
      });
    }

    if(object.kind==='appliance'&&!isLighting(object))lines.push({
      category:'Appliances',
      item:object.name,
      quantity:1,
      unit:'ea',
      notes:[object.material,`${object.widthIn} × ${object.depthIn} × ${object.heightIn} in`].filter(Boolean).join(' · '),
    });

    if(isLighting(object)){
      const light=lightingData(object);
      lines.push({
        category:'Lighting',
        item:`${light.type} Light`,
        quantity:1,
        unit:'ea',
        notes:`${light.colorTemperatureK}K · ${light.intensityPercent}%${light.enabled?'':' · Off'}`,
      });
    }

    if(object.kind==='door'||object.kind==='window'){
      const opening=openingData(object);
      lines.push({
        category:'Openings',
        item:titleCase(object.kind),
        quantity:1,
        unit:'ea',
        notes:`${object.widthIn} × ${object.heightIn} in${opening.parentWallId?` · ${opening.parentWallId}`:' · unattached'}`,
      });
    }
  }

  const paintArea=rounded(wallPaintArea(project));
  if(paintArea>0)lines.push({
    category:'Wall Paint',
    item:'Net Wall Paint Area',
    quantity:paintArea,
    unit:'sq ft',
    notes:'Gross room wall area less modeled or scanned openings',
  });
  return groupLines(lines);
}

export function summarizeBillOfMaterials(project:EditorProject):BillOfMaterialsSummary{
  return{
    cabinetCount:project.objects.filter(object=>isCabinetKind(object.kind)).length,
    countertopSquareFeet:rounded(project.objects.reduce((total,object)=>total+modeledCountertopArea(object),0)),
    hardwareCount:project.objects.reduce((total,object)=>total+hardwareUnits(object),0),
    toeKickLinearFeet:rounded(project.objects.filter(object=>isBaseLikeKind(object.kind)&&object.toeKick?.enabled).reduce((total,object)=>total+object.widthIn/12,0)),
    wallPaintSquareFeet:rounded(wallPaintArea(project)),
    applianceCount:project.objects.filter(object=>object.kind==='appliance'&&!isLighting(object)).length,
    lightingCount:project.objects.filter(isLighting).length,
    openingCount:project.objects.filter(object=>object.kind==='door'||object.kind==='window').length,
  };
}

const csvCell=(value:string|number)=>`"${String(value).replace(/"/g,'""')}"`;
export function billOfMaterialsCsv(project:EditorProject):string{
  const rows:[string|number,string|number,string|number,string|number,string|number][]=buildBillOfMaterials(project).map(line=>[line.category,line.item,line.quantity,line.unit,line.notes]);
  return [['Category','Item','Quantity','Unit','Notes'],...rows].map(row=>row.map(csvCell).join(',')).join('\n');
}
