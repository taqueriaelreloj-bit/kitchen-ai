import { buildApplianceCatalogSceneBoxes } from './applianceCatalogScene';
import { isKitchenAppliance } from './appliances';
import { buildStyledCabinetSceneBoxes } from './cabinetStyleScene';
import { buildContinuousSceneBoxes } from './continuousScene';
import { EditorObject } from './editor';
import { Box3D } from './geometry';
import { buildOpeningStyleSceneBoxes } from './openingStyleScene';
import { isOpening } from './openingStyles';
import { buildToeKickProfileSceneBoxes } from './toeKickProfileScene';

const detailKinds:Box3D['kind'][]=['appliance','hardware','fixture'];
const openingKinds:Box3D['kind'][]=['opening','trim','hardware'];

export function buildProfessionalSceneBoxes(objects:EditorObject[]):Box3D[]{
  const applianceIds=new Set(objects.filter(isKitchenAppliance).map(object=>object.id));
  const openingIds=new Set(objects.filter(isOpening).map(object=>object.id));
  const base=buildContinuousSceneBoxes(objects).filter(box=>{
    if(box.kind==='cabinet-door'||box.kind==='toe-kick')return false;
    if(box.sourceId&&applianceIds.has(box.sourceId)&&box.id!==box.sourceId&&detailKinds.includes(box.kind))return false;
    if(box.sourceId&&openingIds.has(box.sourceId)&&openingKinds.includes(box.kind))return false;
    return true;
  });
  const cabinetFronts=buildStyledCabinetSceneBoxes(objects).filter(box=>box.kind==='cabinet-door');
  const toeKicks=buildToeKickProfileSceneBoxes(objects).filter(box=>box.kind==='toe-kick');
  const appliances=buildApplianceCatalogSceneBoxes(objects).filter(box=>box.sourceId&&applianceIds.has(box.sourceId)&&box.id.startsWith(`${box.sourceId}-catalog-`));
  const openings=buildOpeningStyleSceneBoxes(objects).filter(box=>box.sourceId&&openingIds.has(box.sourceId)&&openingKinds.includes(box.kind));
  return[...base,...cabinetFronts,...toeKicks,...appliances,...openings];
}

export function sceneBoxCounts(boxes:Box3D[]){
  return boxes.reduce<Record<string,number>>((counts,box)=>{counts[box.kind]=(counts[box.kind]??0)+1;return counts;},{});
}

export function duplicateSceneBoxIds(boxes:Box3D[]){
  const counts=new Map<string,number>();
  for(const box of boxes)counts.set(box.id,(counts.get(box.id)??0)+1);
  return[...counts.entries()].filter(([,count])=>count>1).map(([id])=>id);
}
