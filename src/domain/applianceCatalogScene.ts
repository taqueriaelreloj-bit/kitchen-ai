import { applianceFinish, applianceFrontParts, isKitchenAppliance } from './appliances';
import { EditorObject } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';

const inchesToScene=(value:number)=>value/24;
const radians=(degrees:number)=>degrees*Math.PI/180;

function materialColor(object:EditorObject,material:ReturnType<typeof applianceFrontParts>[number]['material']){
  const finish=applianceFinish(object);
  if(material==='glass')return'#263238';
  if(material==='dark')return'#252929';
  if(material==='light')return'#F4F2EA';
  if(material==='metal')return'#9FA8AA';
  return finish.color;
}

function detailBoxes(object:EditorObject):Box3D[]{
  if(!isKitchenAppliance(object))return[];
  const finish=applianceFinish(object),rotation=-radians(object.rotation),cos=Math.cos(rotation),sin=Math.sin(rotation);
  const centerX=inchesToScene(object.x+object.widthIn/2),centerZ=inchesToScene(object.y+object.depthIn/2),baseY=inchesToScene((object.elevationIn??0)+object.heightIn/2),frontZ=centerZ-inchesToScene(object.depthIn/2+.35);
  return applianceFrontParts(object).map(part=>{
    const localX=inchesToScene(part.offsetXIn),localZ=inchesToScene(part.offsetZIn-part.depthIn/2-.03),worldX=centerX+cos*localX+sin*localZ,worldZ=frontZ-sin*localX+cos*localZ;
    return{
      id:`${object.id}-catalog-${part.id}`,
      sourceId:object.id,
      kind:part.material==='metal'?'hardware':'appliance',
      center:[worldX,baseY-inchesToScene(part.offsetYIn),worldZ],
      size:[inchesToScene(part.widthIn),inchesToScene(part.heightIn),inchesToScene(part.depthIn)],
      rotationY:rotation,
      color:materialColor(object,part.material),
      roughness:part.material==='body'?finish.roughness:part.roughness,
      metalness:part.material==='body'?finish.metalness:part.metalness,
    };
  });
}

export function buildApplianceCatalogSceneBoxes(objects:EditorObject[]):Box3D[]{
  const applianceIds=new Set(objects.filter(isKitchenAppliance).map(object=>object.id));
  const boxes=buildSceneBoxes(objects).filter(box=>{
    if(!box.sourceId||!applianceIds.has(box.sourceId)||box.id===box.sourceId)return true;
    return !(['appliance','hardware','fixture'] as Box3D['kind'][]).includes(box.kind);
  });
  for(const object of objects)boxes.push(...detailBoxes(object));
  return boxes;
}
