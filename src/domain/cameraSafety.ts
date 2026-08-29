import { Camera3DState, EditorObject, EditorProject } from './editor';
import { buildSceneBoxes, Box3D } from './geometry';

export type CameraSafetyReport={
  camera:Camera3DState;
  corrected:boolean;
  reasons:Array<'pitch'|'distance'|'target'|'collision'>;
};
type Bounds2D={left:number;top:number;right:number;bottom:number};
type Vec3={x:number;y:number;z:number};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const normalized=(value:number)=>((value%360)+360)%360;
const radians=(value:number)=>value*Math.PI/180;
const boundsOf=(objects:EditorObject[]):Bounds2D=>{
  if(!objects.length)return{left:0,top:0,right:480,bottom:360};
  const values=objects.map(object=>{
    const angle=radians(object.rotation),c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),centerX=object.x+object.widthIn/2,centerY=object.y+object.depthIn/2,width=object.widthIn*c+object.depthIn*s,depth=object.widthIn*s+object.depthIn*c;
    return{left:centerX-width/2,top:centerY-depth/2,right:centerX+width/2,bottom:centerY+depth/2};
  });
  return{left:Math.min(...values.map(value=>value.left)),top:Math.min(...values.map(value=>value.top)),right:Math.max(...values.map(value=>value.right)),bottom:Math.max(...values.map(value=>value.bottom))};
};
const sceneSize=(bounds:Bounds2D)=>({width:Math.max(48,bounds.right-bounds.left),depth:Math.max(48,bounds.bottom-bounds.top),diagonal:Math.hypot(bounds.right-bounds.left,bounds.bottom-bounds.top)});

export function cameraWorldPosition(camera:Camera3DState):Vec3{
  const distance=camera.distance/24,yaw=radians(camera.yaw),pitch=radians(camera.pitch),horizontal=Math.cos(pitch)*distance,targetHeight=Math.max(1.35,Math.min(5.5,distance*.16));
  return{x:camera.target.x/24+Math.sin(yaw)*horizontal,y:targetHeight+Math.sin(pitch)*distance,z:camera.target.y/24+Math.cos(yaw)*horizontal};
}

function pointInsideBox(point:Vec3,box:Box3D,margin=.08){
  const dx=point.x-box.center[0],dz=point.z-box.center[2],c=Math.cos(-box.rotationY),s=Math.sin(-box.rotationY),localX=c*dx+s*dz,localZ=-s*dx+c*dz,localY=point.y-box.center[1];
  return Math.abs(localX)<=box.size[0]/2+margin&&Math.abs(localY)<=box.size[1]/2+margin&&Math.abs(localZ)<=box.size[2]/2+margin;
}
function cameraCollision(camera:Camera3DState,boxes:Box3D[]){
  const point=cameraWorldPosition(camera);
  return boxes.some(box=>box.kind!=='floor'&&box.kind!=='hardware'&&pointInsideBox(point,box));
}

export function cameraDistanceLimits(project:EditorProject){
  const bounds=boundsOf(project.objects),size=sceneSize(bounds),minimum=clamp(Math.max(120,size.diagonal*.42),120,420),maximum=clamp(Math.max(720,size.diagonal*4.2),720,2200);
  return{minimum:Math.round(minimum),maximum:Math.round(maximum)};
}

export function sanitizeCamera(project:EditorProject,input:Camera3DState):CameraSafetyReport{
  const bounds=boundsOf(project.objects),size=sceneSize(bounds),limits=cameraDistanceLimits(project),reasons:CameraSafetyReport['reasons']=[];
  const pitch=clamp(Number.isFinite(input.pitch)?input.pitch:30,8,76);
  if(pitch!==input.pitch)reasons.push('pitch');
  let distance=clamp(Number.isFinite(input.distance)?input.distance:520,limits.minimum,limits.maximum);
  if(distance!==input.distance)reasons.push('distance');
  const targetPadding=Math.max(48,size.diagonal*.18),target={x:clamp(Number.isFinite(input.target.x)?input.target.x:(bounds.left+bounds.right)/2,bounds.left-targetPadding,bounds.right+targetPadding),y:clamp(Number.isFinite(input.target.y)?input.target.y:(bounds.top+bounds.bottom)/2,bounds.top-targetPadding,bounds.bottom+targetPadding)};
  if(target.x!==input.target.x||target.y!==input.target.y)reasons.push('target');
  let camera:Camera3DState={distance,yaw:normalized(Number.isFinite(input.yaw)?input.yaw:-28),pitch,target};
  const boxes=buildSceneBoxes(project.objects);
  let attempts=0;
  while(cameraCollision(camera,boxes)&&camera.distance<limits.maximum&&attempts<12){camera={...camera,distance:Math.min(limits.maximum,camera.distance+Math.max(24,size.diagonal*.12))};attempts++;}
  if(attempts>0){distance=camera.distance;reasons.push('collision');}
  return{camera,corrected:reasons.length>0,reasons:[...new Set(reasons)]};
}

export function focusCameraOnObject(project:EditorProject,objectId:string,current=project.camera3d):Camera3DState{
  const object=project.objects.find(item=>item.id===objectId);
  if(!object)return sanitizeCamera(project,current).camera;
  const target={x:object.x+object.widthIn/2,y:object.y+object.depthIn/2},size=Math.max(object.widthIn,object.heightIn,object.depthIn),distance=clamp(Math.max(180,size*4.2),cameraDistanceLimits(project).minimum,cameraDistanceLimits(project).maximum);
  return sanitizeCamera(project,{...current,target,distance,pitch:clamp(current.pitch,18,58)}).camera;
}

export function fitCameraToProject(project:EditorProject,current=project.camera3d):Camera3DState{
  const bounds=boundsOf(project.objects),size=sceneSize(bounds),limits=cameraDistanceLimits(project),target={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2},distance=clamp(size.diagonal*2.25,limits.minimum,limits.maximum);
  return sanitizeCamera(project,{...current,target,distance,pitch:32}).camera;
}

export function centerCameraOnProject(project:EditorProject,current=project.camera3d):Camera3DState{
  const bounds=boundsOf(project.objects),target={x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2};
  return sanitizeCamera(project,{...current,target}).camera;
}
