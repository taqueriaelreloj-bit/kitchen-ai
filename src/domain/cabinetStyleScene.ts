import { cabinetFrontParts } from './cabinetStyles';
import { EditorObject, isCabinetKind } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';

const inchesToScene=(value:number)=>value/24;
const radians=(degrees:number)=>degrees*Math.PI/180;

function styledFrontBoxes(object:EditorObject):Box3D[]{
  if(!isCabinetKind(object.kind))return[];
  const rotation=-radians(object.rotation),cos=Math.cos(rotation),sin=Math.sin(rotation);
  const toeLift=object.toeKick?.enabled?object.toeKick.heightIn:0;
  const baseY=inchesToScene((object.elevationIn??0)+object.heightIn/2+toeLift);
  const centerX=inchesToScene(object.x+object.widthIn/2),centerZ=inchesToScene(object.y+object.depthIn/2);
  const faceZ=centerZ-inchesToScene(object.depthIn/2+.35);
  const color=object.color??'#D8D4CA';
  return cabinetFrontParts(object).map(front=>{
    const localX=inchesToScene(front.offsetXIn),localZ=-inchesToScene(front.depthIn/2+.03);
    const worldX=centerX+cos*localX+sin*localZ,worldZ=faceZ-sin*localX+cos*localZ;
    return{
      id:`${object.id}-styled-${front.id}`,
      sourceId:object.id,
      kind:'cabinet-door',
      center:[worldX,baseY-inchesToScene(front.offsetYIn),worldZ],
      size:[inchesToScene(front.widthIn),inchesToScene(front.heightIn),inchesToScene(front.depthIn)],
      rotationY:rotation,
      color:front.material==='glass'?'#AFCFDA':front.material==='shadow'?'#555C59':color,
      roughness:front.roughness,
      metalness:front.metalness,
    };
  });
}

export function buildStyledCabinetSceneBoxes(objects:EditorObject[]):Box3D[]{
  const styledIds=new Set(objects.filter(object=>isCabinetKind(object.kind)).map(object=>object.id));
  const boxes=buildSceneBoxes(objects).filter(box=>!(box.kind==='cabinet-door'&&box.sourceId&&styledIds.has(box.sourceId)));
  for(const object of objects)boxes.push(...styledFrontBoxes(object));
  return boxes;
}
