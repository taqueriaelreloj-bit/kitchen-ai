import { Camera3DState } from './editor';
import { Box3D } from './geometry';

export type NativeViewport={width:number;height:number};
export type ProjectedSceneBox={
  id:string;
  sourceId?:string;
  kind:Box3D['kind'];
  x:number;
  y:number;
  width:number;
  height:number;
  rotationDeg:number;
  depth:number;
  color:string;
  roughness:number;
  metalness:number;
  opacity:number;
  source:Box3D;
};

const degrees=(radians:number)=>radians*180/Math.PI;
const radians=(value:number)=>value*Math.PI/180;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round=(value:number)=>Math.round(value*100)/100;

export const clampNativeCameraDistance=(value:number)=>clamp(value,180,1100);
export const clampNativeCameraPitch=(value:number)=>clamp(value,8,78);

export function focusNativeCamera(camera:Camera3DState,box:Box3D):Camera3DState{
  return{
    ...camera,
    target:{x:round(box.center[0]*24),y:round(box.center[2]*24)},
    distance:clampNativeCameraDistance(Math.max(220,camera.distance*.7)),
  };
}

export function projectSceneBoxes(boxes:Box3D[],camera:Camera3DState,viewport:NativeViewport):ProjectedSceneBox[]{
  const width=Math.max(1,viewport.width),height=Math.max(1,viewport.height);
  const yaw=-radians(camera.yaw),pitch=radians(clampNativeCameraPitch(camera.pitch));
  const cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw),cosPitch=Math.cos(pitch),sinPitch=Math.sin(pitch);
  const targetX=camera.target.x/24,targetY=2,targetZ=camera.target.y/24;
  const baseScale=Math.min(width/18,height/14);
  const scale=clamp(baseScale*(520/clampNativeCameraDistance(camera.distance)),5,64);
  const originX=width*.5,originY=height*.62;

  return boxes.map(box=>{
    const dx=box.center[0]-targetX,dy=box.center[1]-targetY,dz=box.center[2]-targetZ;
    const viewX=dx*cosYaw-dz*sinYaw;
    const yawDepth=dx*sinYaw+dz*cosYaw;
    const viewY=dy*cosPitch-yawDepth*sinPitch;
    const viewDepth=dy*sinPitch+yawDepth*cosPitch;
    const relativeRotation=box.rotationY+yaw;
    const cosRotation=Math.abs(Math.cos(relativeRotation)),sinRotation=Math.abs(Math.sin(relativeRotation));
    const footprintWidth=box.size[0]*cosRotation+box.size[2]*sinRotation;
    const footprintDepth=box.size[0]*sinRotation+box.size[2]*cosRotation;
    const projectedWidth=Math.max(2,footprintWidth*scale);
    const projectedHeight=Math.max(2,(box.size[1]+footprintDepth*sinPitch*.48)*scale);
    const centerX=originX+viewX*scale;
    const centerY=originY-viewY*scale;
    return{
      id:box.id,
      sourceId:box.sourceId,
      kind:box.kind,
      x:round(centerX-projectedWidth/2),
      y:round(centerY-projectedHeight/2),
      width:round(projectedWidth),
      height:round(projectedHeight),
      rotationDeg:round(-degrees(relativeRotation)),
      depth:round(viewDepth),
      color:box.color,
      roughness:box.roughness,
      metalness:box.metalness,
      opacity:round(clamp(.76+box.metalness*.16-box.roughness*.05,.58,1)),
      source:box,
    };
  }).filter(box=>Number.isFinite(box.x)&&Number.isFinite(box.y)&&Number.isFinite(box.width)&&Number.isFinite(box.height))
    .sort((a,b)=>a.depth-b.depth||a.source.center[1]-b.source.center[1]||a.id.localeCompare(b.id));
}
