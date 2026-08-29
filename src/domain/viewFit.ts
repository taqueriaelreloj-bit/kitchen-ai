import { clampZoom, EditorObject, EditorProject } from './editor';
import { buildSceneBoxes } from './geometry';

export type ViewportSize={width:number;height:number};
export type Bounds2D={left:number;top:number;right:number;bottom:number;width:number;height:number;centerX:number;centerY:number};

const PLAN_SCALE=.45;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const finiteViewport=(viewport:ViewportSize)=>({width:Math.max(1,viewport.width),height:Math.max(1,viewport.height)});

export function objectVisualBounds(object:EditorObject):Bounds2D{
  const width=Math.max(4,object.widthIn*PLAN_SCALE);
  const height=object.kind==='wall'?Math.max(2,object.depthIn*PLAN_SCALE):Math.max(4,object.depthIn*PLAN_SCALE);
  const radians=object.rotation*Math.PI/180;
  const rotatedWidth=Math.abs(width*Math.cos(radians))+Math.abs(height*Math.sin(radians));
  const rotatedHeight=Math.abs(width*Math.sin(radians))+Math.abs(height*Math.cos(radians));
  const centerX=object.x*PLAN_SCALE+width/2,centerY=object.y*PLAN_SCALE+height/2;
  const left=centerX-rotatedWidth/2,top=centerY-rotatedHeight/2;
  return{left,top,right:left+rotatedWidth,bottom:top+rotatedHeight,width:rotatedWidth,height:rotatedHeight,centerX,centerY};
}

export function projectVisualBounds(objects:EditorObject[]):Bounds2D{
  if(!objects.length)return{left:0,top:0,right:1,bottom:1,width:1,height:1,centerX:.5,centerY:.5};
  const bounds=objects.map(objectVisualBounds);
  const left=Math.min(...bounds.map(item=>item.left)),top=Math.min(...bounds.map(item=>item.top));
  const right=Math.max(...bounds.map(item=>item.right)),bottom=Math.max(...bounds.map(item=>item.bottom));
  return{left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top),centerX:(left+right)/2,centerY:(top+bottom)/2};
}

export function fitProject2D(project:EditorProject,viewport:ViewportSize,padding=44):EditorProject{
  const size=finiteViewport(viewport),bounds=projectVisualBounds(project.objects);
  const availableWidth=Math.max(1,size.width-padding*2),availableHeight=Math.max(1,size.height-padding*2);
  const zoom=clampZoom(Math.min(availableWidth/bounds.width,availableHeight/bounds.height));
  return{
    ...project,
    view2d:{
      ...project.view2d,
      zoom,
      pan:{x:size.width/2-bounds.centerX*zoom,y:size.height/2-bounds.centerY*zoom},
    },
  };
}

export function centerProject2D(project:EditorProject,viewport:ViewportSize):EditorProject{
  const size=finiteViewport(viewport),bounds=projectVisualBounds(project.objects),zoom=project.view2d.zoom;
  return{...project,view2d:{...project.view2d,pan:{x:size.width/2-bounds.centerX*zoom,y:size.height/2-bounds.centerY*zoom}}};
}

export function fitProject3D(project:EditorProject):EditorProject{
  const boxes=buildSceneBoxes(project.objects).filter(box=>box.kind!=='floor');
  if(!boxes.length)return project;
  const minX=Math.min(...boxes.map(box=>box.center[0]-box.size[0]/2));
  const maxX=Math.max(...boxes.map(box=>box.center[0]+box.size[0]/2));
  const minY=Math.min(...boxes.map(box=>box.center[1]-box.size[1]/2));
  const maxY=Math.max(...boxes.map(box=>box.center[1]+box.size[1]/2));
  const minZ=Math.min(...boxes.map(box=>box.center[2]-box.size[2]/2));
  const maxZ=Math.max(...boxes.map(box=>box.center[2]+box.size[2]/2));
  const span=Math.max(maxX-minX,maxZ-minZ,(maxY-minY)*.8,4);
  const distance=clamp(Math.round(span*82),220,1100);
  return{
    ...project,
    camera3d:{
      ...project.camera3d,
      distance,
      target:{x:Math.round((minX+maxX)/2*24),y:Math.round((minZ+maxZ)/2*24)},
    },
  };
}

export function fitCurrentView(project:EditorProject,viewport:ViewportSize):EditorProject{
  return project.viewMode==='2d'?fitProject2D(project,viewport):fitProject3D(project);
}
