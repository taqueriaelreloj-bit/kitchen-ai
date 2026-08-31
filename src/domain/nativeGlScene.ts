import { Box3D } from './geometry';
import { Camera3DState } from './editor';

export type Vec3=[number,number,number];
export type Mat4=Float32Array;
export type NativeGlDrawCommand={
  id:string;
  sourceId?:string;
  model:Mat4;
  color:[number,number,number,number];
  metalness:number;
  roughness:number;
  selected:boolean;
};
export type NativeGlFrame={
  camera:Vec3;
  target:Vec3;
  viewProjection:Mat4;
  commands:NativeGlDrawCommand[];
};

export const CUBE_VERTICES=new Float32Array([
  -0.5,-0.5, 0.5, 0,0,1,  0.5,-0.5, 0.5, 0,0,1,  0.5, 0.5, 0.5, 0,0,1, -0.5, 0.5, 0.5, 0,0,1,
   0.5,-0.5,-0.5, 0,0,-1,-0.5,-0.5,-0.5, 0,0,-1,-0.5, 0.5,-0.5, 0,0,-1, 0.5, 0.5,-0.5, 0,0,-1,
  -0.5, 0.5, 0.5, 0,1,0,  0.5, 0.5, 0.5, 0,1,0,  0.5, 0.5,-0.5, 0,1,0, -0.5, 0.5,-0.5, 0,1,0,
  -0.5,-0.5,-0.5, 0,-1,0, 0.5,-0.5,-0.5, 0,-1,0, 0.5,-0.5, 0.5, 0,-1,0,-0.5,-0.5, 0.5,0,-1,0,
   0.5,-0.5, 0.5, 1,0,0, 0.5,-0.5,-0.5, 1,0,0, 0.5, 0.5,-0.5,1,0,0, 0.5, 0.5, 0.5,1,0,0,
  -0.5,-0.5,-0.5,-1,0,0,-0.5,-0.5, 0.5,-1,0,0,-0.5, 0.5, 0.5,-1,0,0,-0.5, 0.5,-0.5,-1,0,0,
]);
export const CUBE_INDICES=new Uint16Array([
  0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11,
  12,13,14,12,14,15, 16,17,18,16,18,19, 20,21,22,20,22,23,
]);

export const identity=():Mat4=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a:Mat4,b:Mat4):Mat4{
  const out=new Float32Array(16);
  for(let row=0;row<4;row++)for(let column=0;column<4;column++)out[column*4+row]=a[row]*b[column*4]+a[4+row]*b[column*4+1]+a[8+row]*b[column*4+2]+a[12+row]*b[column*4+3];
  return out;
}
export function translation(x:number,y:number,z:number):Mat4{return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);}
export function scaling(x:number,y:number,z:number):Mat4{return new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]);}
export function rotationY(radians:number):Mat4{const c=Math.cos(radians),s=Math.sin(radians);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);}
export function perspective(fovRadians:number,aspect:number,near:number,far:number):Mat4{
  const f=1/Math.tan(fovRadians/2),range=1/(near-far);
  return new Float32Array([f/Math.max(.01,aspect),0,0,0,0,f,0,0,0,0,(far+near)*range,-1,0,0,2*far*near*range,0]);
}
const subtract=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalize=(value:Vec3):Vec3=>{const length=Math.hypot(...value)||1;return[value[0]/length,value[1]/length,value[2]/length];};
export function lookAt(eye:Vec3,target:Vec3,up:Vec3=[0,1,0]):Mat4{
  const z=normalize(subtract(eye,target)),x=normalize(cross(up,z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export function boxModelMatrix(box:Box3D):Mat4{
  return multiply(translation(...box.center),multiply(rotationY(box.rotationY),scaling(...box.size)));
}
export function hexColor(value:string):[number,number,number,number]{
  const normalized=value.replace('#','').trim(),hex=normalized.length===3?normalized.split('').map(character=>character+character).join(''):normalized.padEnd(6,'0').slice(0,6),number=Number.parseInt(hex,16);
  if(!Number.isFinite(number))return[.7,.7,.7,1];
  return[((number>>16)&255)/255,((number>>8)&255)/255,(number&255)/255,1];
}
export function cameraPosition(camera:Camera3DState):{camera:Vec3;target:Vec3}{
  const distance=Math.max(180,Math.min(1200,camera.distance))/24,yaw=camera.yaw*Math.PI/180,pitch=Math.max(8,Math.min(78,camera.pitch))*Math.PI/180,target:Vec3=[camera.target.x/24,Math.max(1.4,Math.min(5.5,distance*.16)),camera.target.y/24],horizontal=Math.cos(pitch)*distance;
  return{target,camera:[target[0]+Math.sin(yaw)*horizontal,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(yaw)*horizontal]};
}
export function selectedColor(color:[number,number,number,number],selected:boolean):[number,number,number,number]{
  if(!selected)return color;
  return[Math.min(1,color[0]*.58+.36),Math.min(1,color[1]*.72+.32),Math.min(1,color[2]*.58+.24),1];
}
export function nativeGlFrame(boxes:Box3D[],cameraState:Camera3DState,aspect:number,selectedId?:string):NativeGlFrame{
  const pose=cameraPosition(cameraState),view=lookAt(pose.camera,pose.target),projection=perspective(48*Math.PI/180,aspect,.08,160),viewProjection=multiply(projection,view);
  const commands=boxes.map(box=>{
    const selected=Boolean(selectedId&&(box.sourceId===selectedId||box.id===selectedId)),color=selectedColor(hexColor(box.color),selected);
    return{id:box.id,sourceId:box.sourceId,model:boxModelMatrix(box),color,metalness:Math.max(0,Math.min(1,box.metalness)),roughness:Math.max(.02,Math.min(1,box.roughness)),selected};
  });
  return{camera:pose.camera,target:pose.target,viewProjection,commands};
}
