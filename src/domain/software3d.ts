import { Camera3DState } from './editor';
import {
  Professional3DView,
  ProfessionalScene,
  ProfessionalSceneBox,
  professionalWallOpacity,
} from './professional3d';
import {
  Mat4,
  Vec3,
  lookAtMatrix,
  multiplyMat4,
  perspectiveMatrix,
  rotationYMatrix,
  scaleMatrix,
  transformPoint,
  translationMatrix,
} from './webglMath';

export type SoftwareViewport = { width: number; height: number };
export type SoftwarePoint = { x: number; y: number; depth: number };
export type SoftwareFace = {
  id: string;
  boxId: string;
  sourceId?: string;
  surface: ProfessionalSceneBox['surface'];
  points: SoftwarePoint[];
  depth: number;
  color: string;
  opacity: number;
  selected: boolean;
  selectable: boolean;
  edgeStrength: number;
};
export type SoftwareLine = {
  id: string;
  a: SoftwarePoint;
  b: SoftwarePoint;
  color: string;
  width: number;
  opacity: number;
  depth: number;
};
export type Software3DFrame = {
  faces: SoftwareFace[];
  lines: SoftwareLine[];
  eye: Vec3;
  target: Vec3;
};

const CUBE_CORNERS: Vec3[] = [
  [-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,-.5],[-.5,.5,.5],
  [.5,-.5,-.5],[.5,-.5,.5],[.5,.5,-.5],[.5,.5,.5],
];
const FACE_DEFINITIONS = [
  { id:'left', indices:[0,1,3,2], normal:[-1,0,0] as Vec3, shade:.74 },
  { id:'right', indices:[4,6,7,5], normal:[1,0,0] as Vec3, shade:.83 },
  { id:'bottom', indices:[0,4,5,1], normal:[0,-1,0] as Vec3, shade:.61 },
  { id:'top', indices:[2,3,7,6], normal:[0,1,0] as Vec3, shade:1.08 },
  { id:'back', indices:[0,2,6,4], normal:[0,0,-1] as Vec3, shade:.78 },
  { id:'front', indices:[1,5,7,3], normal:[0,0,1] as Vec3, shade:.92 },
] as const;

const clamp = (value:number,minimum=0,maximum=1)=>Math.min(maximum,Math.max(minimum,value));
const finiteViewport = (viewport:SoftwareViewport)=>({width:Math.max(2,viewport.width),height:Math.max(2,viewport.height)});

function parseColor(value:string):[number,number,number]{
  const short=value.replace('#','').trim();
  const full=short.length===3?short.split('').map(character=>character+character).join(''):short.padEnd(6,'0').slice(0,6);
  const number=Number.parseInt(full,16);
  if(!Number.isFinite(number))return[204,204,204];
  return[(number>>16)&255,(number>>8)&255,number&255];
}

function rgbColor(value:string,factor:number,selected=false){
  const [red,green,blue]=parseColor(value);
  const mix=selected?.22:0;
  const target:[number,number,number]=[16,166,112];
  const channel=(base:number,index:number)=>Math.round(clamp((base*factor*(1-mix)+target[index]*mix)/255)*255);
  return `rgb(${channel(red,0)}, ${channel(green,1)}, ${channel(blue,2)})`;
}

function normalWithRotation(normal:Vec3,rotationY:number):Vec3{
  const cosine=Math.cos(rotationY),sine=Math.sin(rotationY);
  return[
    cosine*normal[0]+sine*normal[2],
    normal[1],
    -sine*normal[0]+cosine*normal[2],
  ];
}

function dot(a:Vec3,b:Vec3){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function subtract(a:Vec3,b:Vec3):Vec3{return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function normalize(value:Vec3):Vec3{
  const length=Math.hypot(value[0],value[1],value[2])||1;
  return[value[0]/length,value[1]/length,value[2]/length];
}

export function softwareCameraEye(camera:Camera3DState,sceneCenter:[number,number,number]){
  const yaw=camera.yaw*Math.PI/180;
  const pitch=camera.pitch*Math.PI/180;
  const distance=Math.max(5,camera.distance/24);
  const target:Vec3=[camera.target.x/24,sceneCenter[1],camera.target.y/24];
  const eye:Vec3=[
    target[0]+Math.cos(pitch)*Math.sin(yaw)*distance,
    target[1]+Math.sin(pitch)*distance,
    target[2]+Math.cos(pitch)*Math.cos(yaw)*distance,
  ];
  return{eye,target};
}

function boxModel(box:ProfessionalSceneBox):Mat4{
  return multiplyMat4(
    translationMatrix(...box.center),
    multiplyMat4(rotationYMatrix(box.rotationY),scaleMatrix(...box.size)),
  );
}

function projectWorldPoint(point:Vec3,viewProjection:Mat4,viewport:SoftwareViewport):SoftwarePoint|undefined{
  const clip=transformPoint(viewProjection,point);
  if(clip[3]<=.0001)return undefined;
  const x=clip[0]/clip[3],y=clip[1]/clip[3],depth=clip[2]/clip[3];
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(depth))return undefined;
  return{
    x:(x*.5+.5)*viewport.width,
    y:(1-(y*.5+.5))*viewport.height,
    depth,
  };
}

function faceCenter(points:Vec3[]):Vec3{
  return[
    points.reduce((sum,point)=>sum+point[0],0)/points.length,
    points.reduce((sum,point)=>sum+point[1],0)/points.length,
    points.reduce((sum,point)=>sum+point[2],0)/points.length,
  ];
}

function lightFactor(normal:Vec3,base:number,surface:ProfessionalSceneBox['surface']){
  const key=normalize([-.46,.88,.32]);
  const fill=normalize([.62,.42,-.5]);
  const keyLight=Math.max(0,dot(normal,key));
  const fillLight=Math.max(0,dot(normal,fill));
  let result=base*(.63+keyLight*.31+fillLight*.12);
  if(surface==='wall')result=Math.max(.79,result);
  if(surface==='glass')result=Math.max(.91,result);
  if(surface==='shadow')result=.22;
  if(surface==='site-grid')result=.96;
  return clamp(result,.2,1.22);
}

function faceOpacity(box:ProfessionalSceneBox,view:Professional3DView,camera:Camera3DState,scene:ProfessionalScene){
  const wallOpacity=professionalWallOpacity(box,camera.yaw,view,scene.sceneCenter);
  if(box.surface==='glass')return Math.min(.44,wallOpacity);
  return wallOpacity;
}

function projectBoxFaces(
  box:ProfessionalSceneBox,
  scene:ProfessionalScene,
  camera:Camera3DState,
  view:Professional3DView,
  viewProjection:Mat4,
  viewport:SoftwareViewport,
  eye:Vec3,
  selectedId?:string,
):SoftwareFace[]{
  const opacity=faceOpacity(box,view,camera,scene);
  if(opacity<=.015)return[];
  const model=boxModel(box);
  const worldCorners=CUBE_CORNERS.map(corner=>{
    const point=transformPoint(model,corner);
    return[point[0],point[1],point[2]] as Vec3;
  });
  const selected=Boolean(box.sourceId&&box.sourceId===selectedId&&box.surface!=='shadow');
  const topOnly=box.surface==='site-grid'||box.surface==='wood-floor'||box.surface==='shadow';
  const faces:SoftwareFace[]=[];

  for(const definition of FACE_DEFINITIONS){
    if(topOnly&&definition.id!=='top')continue;
    const worldPoints=definition.indices.map(index=>worldCorners[index]);
    const center=faceCenter(worldPoints);
    const normal=normalWithRotation(definition.normal,box.rotationY);
    const towardEye=dot(normal,normalize(subtract(eye,center)));
    if(!topOnly&&towardEye<=.002&&opacity>.68)continue;
    const points=worldPoints.map(point=>projectWorldPoint(point,viewProjection,viewport));
    if(points.some(point=>!point))continue;
    const projected=points as SoftwarePoint[];
    const area=Math.abs(projected.reduce((sum,point,index)=>{
      const next=projected[(index+1)%projected.length];
      return sum+point.x*next.y-next.x*point.y;
    },0)/2);
    if(area<.35)continue;
    const factor=lightFactor(normal,definition.shade,box.surface);
    faces.push({
      id:`${box.id}-${definition.id}`,
      boxId:box.id,
      sourceId:box.sourceId,
      surface:box.surface,
      points:projected,
      depth:projected.reduce((sum,point)=>sum+point.depth,0)/projected.length,
      color:rgbColor(box.color,factor,selected),
      opacity,
      selected,
      selectable:box.selectable,
      edgeStrength:selected?1:.22,
    });
  }
  return faces;
}

function projectedLine(
  id:string,
  a:Vec3,
  b:Vec3,
  viewProjection:Mat4,
  viewport:SoftwareViewport,
  color:string,
  width:number,
  opacity:number,
):SoftwareLine|undefined{
  const projectedA=projectWorldPoint(a,viewProjection,viewport);
  const projectedB=projectWorldPoint(b,viewProjection,viewport);
  if(!projectedA||!projectedB)return undefined;
  return{id,a:projectedA,b:projectedB,color,width,opacity,depth:(projectedA.depth+projectedB.depth)/2};
}

function surfaceLines(scene:ProfessionalScene,viewProjection:Mat4,viewport:SoftwareViewport):SoftwareLine[]{
  const lines:SoftwareLine[]=[];
  const site=scene.boxes.find(box=>box.surface==='site-grid');
  if(site){
    const left=site.center[0]-site.size[0]/2,right=site.center[0]+site.size[0]/2;
    const top=site.center[2]-site.size[2]/2,bottom=site.center[2]+site.size[2]/2;
    const y=site.center[1]+site.size[1]/2+.006;
    const interval=.5;
    const startX=Math.floor(left/interval)*interval;
    for(let x=startX,index=0;x<=right+.001;x+=interval,index++){
      const major=Math.round(x/interval)%4===0;
      const line=projectedLine(`grid-x-${index}`,[x,y,top],[x,y,bottom],viewProjection,viewport,major?'#6C8FA8':'#91AABC',major?1.15:.65,major?.62:.38);
      if(line)lines.push(line);
    }
    const startZ=Math.floor(top/interval)*interval;
    for(let z=startZ,index=0;z<=bottom+.001;z+=interval,index++){
      const major=Math.round(z/interval)%4===0;
      const line=projectedLine(`grid-z-${index}`,[left,y,z],[right,y,z],viewProjection,viewport,major?'#6C8FA8':'#91AABC',major?1.15:.65,major?.62:.38);
      if(line)lines.push(line);
    }
  }
  const floor=scene.boxes.find(box=>box.surface==='wood-floor');
  if(floor){
    const left=floor.center[0]-floor.size[0]/2,right=floor.center[0]+floor.size[0]/2;
    const top=floor.center[2]-floor.size[2]/2,bottom=floor.center[2]+floor.size[2]/2;
    const y=floor.center[1]+floor.size[1]/2+.008;
    const row=.29;
    const joint=1.7;
    for(let z=top,index=0;z<=bottom+.001;z+=row,index++){
      const line=projectedLine(`floor-row-${index}`,[left,y,z],[right,y,z],viewProjection,viewport,'#8E8172',.7,.44);
      if(line)lines.push(line);
      const offset=index%2?joint/2:0;
      for(let x=left+offset,jointIndex=0;x<=right+.001;x+=joint,jointIndex++){
        const jointLine=projectedLine(`floor-joint-${index}-${jointIndex}`,[x,y,z],[x,y,Math.min(bottom,z+row)],viewProjection,viewport,'#9D9081',.55,.32);
        if(jointLine)lines.push(jointLine);
      }
    }
  }
  return lines;
}

export function buildSoftware3DFrame(
  scene:ProfessionalScene,
  camera:Camera3DState,
  view:Professional3DView,
  viewportValue:SoftwareViewport,
  selectedId?:string,
):Software3DFrame{
  const viewport=finiteViewport(viewportValue);
  const {eye,target}=softwareCameraEye(camera,scene.sceneCenter);
  const distance=Math.hypot(eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]);
  const near=Math.max(.03,Math.min(.5,distance/220));
  const far=Math.max(100,distance+80);
  const viewProjection=multiplyMat4(
    perspectiveMatrix(Math.PI/4,viewport.width/viewport.height,near,far),
    lookAtMatrix(eye,target),
  );
  const faces=scene.boxes.flatMap(box=>projectBoxFaces(box,scene,camera,view,viewProjection,viewport,eye,selectedId));
  // Painter's algorithm: high normalized depth is farther from the camera.
  faces.sort((a,b)=>b.depth-a.depth);
  const lines=surfaceLines(scene,viewProjection,viewport).sort((a,b)=>b.depth-a.depth);
  return{faces,lines,eye,target};
}

export function pointInSoftwareFace(face:SoftwareFace,x:number,y:number){
  let inside=false;
  for(let index=0,previous=face.points.length-1;index<face.points.length;previous=index++){
    const currentPoint=face.points[index];
    const previousPoint=face.points[previous];
    const intersects=((currentPoint.y>y)!==(previousPoint.y>y))&&
      x<(previousPoint.x-currentPoint.x)*(y-currentPoint.y)/(previousPoint.y-currentPoint.y||.00001)+currentPoint.x;
    if(intersects)inside=!inside;
  }
  return inside;
}

export function pickSoftware3DSource(frame:Software3DFrame,x:number,y:number){
  const candidates=frame.faces
    .filter(face=>face.sourceId&&face.selectable&&face.opacity>.08&&pointInSoftwareFace(face,x,y))
    .sort((a,b)=>a.depth-b.depth);
  return candidates[0]?.sourceId;
}
