import { EditorObject } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';
import { openingData } from './openings';
import { isOpening, openingFrontParts, openingStyleData } from './openingStyles';

const inchesToScene=(value:number)=>value/24;
const radians=(degrees:number)=>degrees*Math.PI/180;

function wallPoint(wall:EditorObject,alongIn:number,depthIn=wall.depthIn/2){
  const angle=radians(wall.rotation);
  return{x:wall.x+Math.cos(angle)*alongIn-Math.sin(angle)*depthIn,z:wall.y+Math.sin(angle)*alongIn+Math.cos(angle)*depthIn};
}

function openingPose(opening:EditorObject,objects:EditorObject[]){
  const data=openingData(opening),wall=data.parentWallId?objects.find(object=>object.id===data.parentWallId&&object.kind==='wall'):undefined;
  if(!wall)return{x:opening.x+opening.widthIn/2,z:opening.y+opening.depthIn/2,rotation:opening.rotation,sill:opening.kind==='window'?data.sillHeightIn??opening.elevationIn??36:0};
  const offset=Math.max(0,Math.min(wall.widthIn-opening.widthIn,data.wallOffsetIn??0)),position=wallPoint(wall,offset+opening.widthIn/2,wall.depthIn/2);
  return{x:position.x,z:position.z,rotation:wall.rotation,sill:opening.kind==='window'?data.sillHeightIn??opening.elevationIn??36:0};
}

function materialColor(object:EditorObject,material:ReturnType<typeof openingFrontParts>[number]['material']){
  const spec=openingStyleData(object);
  if(material==='glass')return spec.glassColor;
  if(material==='frame')return spec.frameColor;
  if(material==='hardware'||material==='track')return'#3E4444';
  return spec.panelColor;
}

function styledOpeningBoxes(opening:EditorObject,objects:EditorObject[]):Box3D[]{
  if(!isOpening(opening))return[];
  const pose=openingPose(opening,objects),rotation=-radians(pose.rotation),cos=Math.cos(rotation),sin=Math.sin(rotation),centerX=inchesToScene(pose.x),centerZ=inchesToScene(pose.z),baseY=inchesToScene(pose.sill+opening.heightIn/2);
  return openingFrontParts(opening).map(part=>{
    const localX=inchesToScene(part.offsetXIn),localZ=inchesToScene(part.offsetZIn-part.depthIn/2),worldX=centerX+cos*localX+sin*localZ,worldZ=centerZ-sin*localX+cos*localZ;
    return{
      id:`${opening.id}-styled-${part.id}`,
      sourceId:opening.id,
      kind:part.material==='hardware'||part.material==='track'?'hardware':part.material==='frame'?'trim':'opening',
      center:[worldX,baseY-inchesToScene(part.offsetYIn),worldZ],
      size:[inchesToScene(part.widthIn),inchesToScene(part.heightIn),inchesToScene(part.depthIn)],
      rotationY:rotation,
      color:materialColor(opening,part.material),
      roughness:part.roughness,
      metalness:part.metalness,
    };
  });
}

export function buildOpeningStyleSceneBoxes(objects:EditorObject[]):Box3D[]{
  const openingIds=new Set(objects.filter(isOpening).map(object=>object.id));
  const boxes=buildSceneBoxes(objects).filter(box=>!(box.sourceId&&openingIds.has(box.sourceId)&&(['opening','trim','hardware'] as Box3D['kind'][]).includes(box.kind)));
  for(const opening of objects)boxes.push(...styledOpeningBoxes(opening,objects));
  return boxes;
}
