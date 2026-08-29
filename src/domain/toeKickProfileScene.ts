import { continuousToeKickRuns } from './geometry';
import { EditorObject } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';
import { supportsToeKickProfile, toeKickProfileData } from './toeKickProfiles';

const inchesToScene=(value:number)=>value/24;
const radians=(degrees:number)=>degrees*Math.PI/180;

type ScenePart={id:string;offsetX:number;offsetZ:number;width:number;depth:number;height:number;color:string;roughness:number;metalness:number};

function transformPart(object:EditorObject,part:ScenePart):Box3D{
  const rotation=-radians(object.rotation),cos=Math.cos(rotation),sin=Math.sin(rotation),centerX=inchesToScene(object.x+object.widthIn/2),centerZ=inchesToScene(object.y+object.depthIn/2),localX=inchesToScene(part.offsetX),localZ=inchesToScene(part.offsetZ);
  return{id:`${object.id}-${part.id}`,sourceId:object.id,kind:'toe-kick',center:[centerX+cos*localX+sin*localZ,inchesToScene(part.height/2),centerZ-sin*localX+cos*localZ],size:[inchesToScene(part.width),inchesToScene(part.height),inchesToScene(part.depth)],rotationY:rotation,color:part.color,roughness:part.roughness,metalness:part.metalness};
}

function individualParts(object:EditorObject):ScenePart[]{
  const profile=toeKickProfileData(object),color=profile.color,roughness=profile.finish.toLowerCase().includes('gloss')?.25:.58;
  if(!profile.enabled)return[];
  if(profile.mode==='Furniture Legs'){
    const x=Math.max(0,object.widthIn/2-profile.legWidthIn/2-1),z=Math.max(0,object.depthIn/2-profile.legDepthIn/2-1);
    return[
      {id:'leg-front-left',offsetX:-x,offsetZ:-z,width:profile.legWidthIn,depth:profile.legDepthIn,height:profile.heightIn,color,roughness,metalness:.05},
      {id:'leg-front-right',offsetX:x,offsetZ:-z,width:profile.legWidthIn,depth:profile.legDepthIn,height:profile.heightIn,color,roughness,metalness:.05},
      {id:'leg-back-left',offsetX:-x,offsetZ:z,width:profile.legWidthIn,depth:profile.legDepthIn,height:profile.heightIn,color,roughness,metalness:.05},
      {id:'leg-back-right',offsetX:x,offsetZ:z,width:profile.legWidthIn,depth:profile.legDepthIn,height:profile.heightIn,color,roughness,metalness:.05},
    ];
  }
  const recess=profile.mode==='Flush'?0:profile.recessIn,depth=Math.max(1,object.depthIn-recess),offsetZ=recess/2;
  const parts:ScenePart[]=[{id:profile.mode==='Decorative Base'?'decorative-base':'toe-kick',offsetX:0,offsetZ,width:object.widthIn,depth,height:profile.mode==='Decorative Base'?profile.decorativeHeightIn:profile.heightIn,color,roughness,metalness:.02}];
  if(profile.mode==='Decorative Base')parts.push({id:'decorative-trim',offsetX:0,offsetZ:-object.depthIn/2-profile.decorativeProjectionIn/2,width:object.widthIn+profile.decorativeProjectionIn*2,depth:profile.decorativeProjectionIn,height:.75,color,roughness:.42,metalness:.02});
  return parts;
}

function continuousBoxes(objects:EditorObject[]):Box3D[]{
  const continuousObjects=objects.map(object=>{
    if(!supportsToeKickProfile(object))return object;
    const profile=toeKickProfileData(object);
    return profile.mode==='Continuous'&&profile.enabled?{...object,toeKick:{enabled:true,heightIn:profile.heightIn,recessIn:profile.recessIn,color:profile.color,finish:profile.finish}}:{...object,toeKick:{...(object.toeKick??{heightIn:4,recessIn:3,color:profile.color,finish:profile.finish}),enabled:false}};
  });
  return continuousToeKickRuns(continuousObjects).map((run,index)=>({id:`toe-profile-run-${index}`,sourceId:run.ids[0],kind:'toe-kick',center:[inchesToScene(run.x),inchesToScene(run.heightIn/2),inchesToScene(run.y+run.recessIn)],size:[inchesToScene(run.widthIn),inchesToScene(run.heightIn),inchesToScene(Math.max(1,run.depthIn))],rotationY:-radians(run.rotation),color:run.color,roughness:.55,metalness:0}));
}

export function buildToeKickProfileSceneBoxes(objects:EditorObject[]):Box3D[]{
  const boxes=buildSceneBoxes(objects).filter(box=>box.kind!=='toe-kick');
  boxes.push(...continuousBoxes(objects));
  for(const object of objects){
    if(!supportsToeKickProfile(object))continue;
    const profile=toeKickProfileData(object);
    if(profile.mode==='Continuous')continue;
    for(const part of individualParts(object))boxes.push(transformPart(object,part));
  }
  return boxes;
}
