import { countertopData, islandData } from './countertops';
import {
  EditorObject,
  EditorProject,
  isBaseCabinetKind,
  isCabinetKind,
  isTallCabinetKind,
  normalizeCabinetHardware,
} from './editor';

export type BillOfMaterialsSummary={
  countertopSquareFeet:number;
  hardwareCount:number;
  wallPaintSquareFeet:number;
};

const squareFeet=(widthIn:number,depthIn:number)=>Math.max(0,widthIn)*Math.max(0,depthIn)/144;
const rounded=(value:number)=>Math.round(Math.max(0,value)*100)/100;

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

export function summarizeBillOfMaterials(project:EditorProject):BillOfMaterialsSummary{
  return{
    countertopSquareFeet:rounded(project.objects.reduce((total,object)=>total+modeledCountertopArea(object),0)),
    hardwareCount:project.objects.reduce((total,object)=>total+hardwareUnits(object),0),
    wallPaintSquareFeet:rounded(wallPaintArea(project)),
  };
}
