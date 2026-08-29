import { Box3D } from './geometry';
import { Camera3DState } from './editor';
import { Mat4, multiply, nativeGlFrame } from './nativeGlScene';

export type ScreenPoint={x:number;y:number;depth:number;visible:boolean};
export type NativeGlPickResult={
  id:string;
  sourceId?:string;
  boxId:string;
  screenBounds:{left:number;top:number;right:number;bottom:number};
  depth:number;
};

const transformPoint=(matrix:Mat4,x:number,y:number,z:number)=>{
  const clipX=matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12];
  const clipY=matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13];
  const clipZ=matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14];
  const clipW=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
  return{clipX,clipY,clipZ,clipW};
};

export function projectPoint(matrix:Mat4,point:[number,number,number],width:number,height:number):ScreenPoint{
  const{clipX,clipY,clipZ,clipW}=transformPoint(matrix,...point);
  if(!Number.isFinite(clipW)||clipW<=.0001)return{x:0,y:0,depth:Infinity,visible:false};
  const ndcX=clipX/clipW,ndcY=clipY/clipW,ndcZ=clipZ/clipW;
  return{x:(ndcX+1)*.5*width,y:(1-(ndcY+1)*.5)*height,depth:(ndcZ+1)*.5,visible:ndcX>=-1.2&&ndcX<=1.2&&ndcY>=-1.2&&ndcY<=1.2&&ndcZ>=-1&&ndcZ<=1};
}

const corners:[number,number,number][]=[
  [-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],
  [-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],
];

export function projectedBoxBounds(viewProjection:Mat4,model:Mat4,width:number,height:number){
  const matrix=multiply(viewProjection,model),points=corners.map(point=>projectPoint(matrix,point,width,height)).filter(point=>Number.isFinite(point.depth));
  if(!points.length||points.every(point=>!point.visible))return undefined;
  return{
    left:Math.min(...points.map(point=>point.x)),
    top:Math.min(...points.map(point=>point.y)),
    right:Math.max(...points.map(point=>point.x)),
    bottom:Math.max(...points.map(point=>point.y)),
    depth:Math.min(...points.map(point=>point.depth)),
  };
}

export function pickNativeGlObject(boxes:Box3D[],camera:Camera3DState,width:number,height:number,x:number,y:number,selectedId?:string,padding=8):NativeGlPickResult|undefined{
  if(width<=0||height<=0)return undefined;
  const frame=nativeGlFrame(boxes,camera,width/height,selectedId),candidates=frame.commands.flatMap((command,index)=>{
    const box=boxes[index];
    if(!box||box.kind==='floor')return[];
    const bounds=projectedBoxBounds(frame.viewProjection,command.model,width,height);
    if(!bounds||x<bounds.left-padding||x>bounds.right+padding||y<bounds.top-padding||y>bounds.bottom+padding)return[];
    const area=Math.max(1,(bounds.right-bounds.left)*(bounds.bottom-bounds.top));
    const priority=box.kind==='hardware'?0:box.kind==='cabinet-door'||box.kind==='opening'?1:box.kind==='appliance'||box.kind==='cabinet'?2:box.kind==='countertop'||box.kind==='fixture'?3:4;
    return[{box,command,bounds,area,priority}];
  }).sort((a,b)=>a.priority-b.priority||a.bounds.depth-b.bounds.depth||a.area-b.area);
  const picked=candidates[0];
  if(!picked)return undefined;
  return{id:picked.box.sourceId??picked.box.id,sourceId:picked.box.sourceId,boxId:picked.box.id,screenBounds:{left:picked.bounds.left,top:picked.bounds.top,right:picked.bounds.right,bottom:picked.bounds.bottom},depth:picked.bounds.depth};
}
