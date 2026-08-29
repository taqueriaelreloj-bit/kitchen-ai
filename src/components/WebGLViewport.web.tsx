import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject } from '../domain/editor';
import {
  Professional3DView,
  ProfessionalSceneBox,
  buildProfessional3DScene,
  professionalCameraForView,
  professionalViewLabel,
  professionalWallOpacity,
} from '../domain/professional3d';
import {
  Mat4,
  Vec3,
  lookAtMatrix,
  multiplyMat4,
  perspectiveMatrix,
  rotationYMatrix,
  scaleMatrix,
  sceneBounds3D,
  transformPoint,
  translationMatrix,
} from '../domain/webglMath';
import { Native3DWorkspace } from './Native3DWorkspace';

const AnyCanvas = 'canvas' as any;
type HitRegion = {
  sourceId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  depth: number;
  area: number;
};

type DragState = {
  x: number;
  y: number;
  start: Camera3DState;
  mode: 'orbit'|'pan';
  active: boolean;
  moved: boolean;
};

const SURFACE_TYPE: Record<ProfessionalSceneBox['surface'], number> = {
  object: 0,
  wall: 1,
  glass: 2,
  'wood-floor': 3,
  'site-grid': 4,
  platform: 5,
  shadow: 6,
};

function colorToRgb(value:string){
  const short=value.replace('#','');
  const full=short.length===3?short.split('').map(character=>character+character).join(''):short;
  const number=parseInt(full,16)||0xcccccc;
  return [((number>>16)&255)/255,((number>>8)&255)/255,(number&255)/255];
}

const VERTEX_SHADER=`
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
void main(){
  vec4 world=uModel*vec4(aPosition,1.0);
  vWorld=world.xyz;
  vLocal=aPosition;
  vNormal=normalize(mat3(uModel)*aNormal);
  gl_Position=uViewProjection*world;
}`;

const FRAGMENT_SHADER=`
precision highp float;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vLocal;
uniform vec3 uColor;
uniform float uMetalness;
uniform float uRoughness;
uniform float uOpacity;
uniform float uSurface;
uniform float uSelected;
uniform vec3 uEye;

float hash21(vec2 p){
  p=fract(p*vec2(123.34,456.21));
  p+=dot(p,p+45.32);
  return fract(p.x*p.y);
}

void main(){
  if(uSurface>5.5){
    gl_FragColor=vec4(vec3(0.055,0.075,0.070),uOpacity);
    return;
  }

  vec3 N=normalize(vNormal);
  vec3 base=uColor;

  if(uSurface>3.5&&uSurface<4.5){
    vec2 grid=vWorld.xz*2.0;
    vec2 cell=abs(fract(grid)-0.5);
    float fine=1.0-smoothstep(0.455,0.495,max(cell.x,cell.y));
    vec2 majorGrid=vWorld.xz*0.5;
    vec2 majorCell=abs(fract(majorGrid)-0.5);
    float major=1.0-smoothstep(0.47,0.498,max(majorCell.x,majorCell.y));
    base=mix(base,vec3(0.47,0.60,0.71),clamp(fine*.34+major*.42,0.0,0.65));
  }

  if(uSurface>2.5&&uSurface<3.5){
    float row=floor(vWorld.z*2.35);
    float rowEdge=min(fract(vWorld.z*2.35),1.0-fract(vWorld.z*2.35));
    float plankEdge=1.0-smoothstep(0.012,0.04,rowEdge);
    float stagger=mod(row,2.0)*0.5;
    float joint=min(fract(vWorld.x*.42+stagger),1.0-fract(vWorld.x*.42+stagger));
    float jointEdge=1.0-smoothstep(0.012,0.035,joint);
    float grain=sin(vWorld.x*31.0+sin(vWorld.z*8.0))*0.018+sin(vWorld.x*9.0)*0.012;
    float variation=(hash21(vec2(floor(vWorld.x*.42+stagger),row))-.5)*.08;
    base*=1.0+grain+variation;
    base=mix(base,base*.67,clamp(plankEdge+jointEdge*.5,0.0,1.0));
  }

  if(uSurface>1.5&&uSurface<2.5){
    base=mix(base,vec3(0.72,0.88,0.94),.28);
  }

  vec3 keyDirection=normalize(vec3(-0.46,0.88,0.32));
  vec3 fillDirection=normalize(vec3(0.62,0.42,-0.50));
  float key=max(dot(N,keyDirection),0.0);
  float fill=max(dot(N,fillDirection),0.0);
  float hemisphere=N.y*.5+.5;
  vec3 viewDirection=normalize(uEye-vWorld);
  vec3 halfVector=normalize(keyDirection+viewDirection);
  float specularPower=mix(14.0,112.0,1.0-uRoughness);
  float specular=pow(max(dot(N,halfVector),0.0),specularPower);
  float edge=pow(1.0-max(dot(N,viewDirection),0.0),2.0);

  vec3 lit=base*(0.29+0.49*key+0.13*fill+0.12*hemisphere);
  vec3 reflection=mix(vec3(.78,.80,.79),base,uMetalness*.55);
  lit+=reflection*specular*(0.12+0.78*uMetalness);
  lit+=vec3(.70,.82,.78)*edge*.035;

  if(uSurface>.5&&uSurface<1.5){
    lit=mix(lit,base,0.18);
  }
  if(uSurface>1.5&&uSurface<2.5){
    lit+=vec3(.32,.48,.54)*specular*.35;
  }
  if(uSelected>.5){
    lit=mix(lit,vec3(.10,.66,.46),uSelected>1.5?.92:.22);
    lit+=vec3(.04,.24,.16)*(uSelected>1.5?1.0:.35);
  }

  float fog=smoothstep(32.0,72.0,distance(uEye,vWorld));
  lit=mix(lit,vec3(.79,.86,.89),fog*.22);
  gl_FragColor=vec4(clamp(lit,0.0,1.0),uOpacity);
}`;

const CUBE=new Float32Array([
  -0.5,-0.5,0.5,0,0,1, 0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1,
  -0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,0.5,0.5,0,0,1,
  0.5,-0.5,-0.5,0,0,-1, -0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1,
  0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1,
  -0.5,-0.5,-0.5,-1,0,0, -0.5,-0.5,0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0,
  -0.5,-0.5,-0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,0.5,-0.5,-1,0,0,
  0.5,-0.5,0.5,1,0,0, 0.5,-0.5,-0.5,1,0,0, 0.5,0.5,-0.5,1,0,0,
  0.5,-0.5,0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0,
  -0.5,0.5,0.5,0,1,0, 0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0,
  -0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0, -0.5,0.5,-0.5,0,1,0,
  -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0,
  -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,0.5,0,-1,0,
]);
const CUBE_CORNERS:Vec3[]=[
  [-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,-.5],[-.5,.5,.5],
  [.5,-.5,-.5],[.5,-.5,.5],[.5,.5,-.5],[.5,.5,.5],
];

function compileShader(gl:WebGLRenderingContext,type:number,source:string){
  const shader=gl.createShader(type);
  if(!shader)throw new Error('Unable to create WebGL shader.');
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const message=gl.getShaderInfoLog(shader)??'Shader compile error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl:WebGLRenderingContext){
  const vertex=compileShader(gl,gl.VERTEX_SHADER,VERTEX_SHADER);
  const fragment=compileShader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER);
  const program=gl.createProgram();
  if(!program)throw new Error('Unable to create WebGL program.');
  gl.attachShader(program,vertex);
  gl.attachShader(program,fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    const message=gl.getProgramInfoLog(program)??'WebGL link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function modelFor(box:ProfessionalSceneBox,scaleFactor=1):Mat4{
  return multiplyMat4(
    translationMatrix(...box.center),
    multiplyMat4(
      rotationYMatrix(box.rotationY),
      scaleMatrix(box.size[0]*scaleFactor,box.size[1]*scaleFactor,box.size[2]*scaleFactor),
    ),
  );
}

function regionForBox(
  box:ProfessionalSceneBox,
  model:Mat4,
  viewProjection:Mat4,
  width:number,
  height:number,
):HitRegion|undefined{
  if(!box.sourceId||!box.selectable)return undefined;
  const points:{x:number;y:number;depth:number}[]=[];
  for(const corner of CUBE_CORNERS){
    const world=transformPoint(model,corner);
    const clip=transformPoint(viewProjection,[world[0],world[1],world[2]]);
    if(clip[3]<=.0001)continue;
    const normalizedX=clip[0]/clip[3];
    const normalizedY=clip[1]/clip[3];
    const depth=clip[2]/clip[3];
    if(!Number.isFinite(normalizedX)||!Number.isFinite(normalizedY)||!Number.isFinite(depth))continue;
    points.push({x:(normalizedX*.5+.5)*width,y:(1-(normalizedY*.5+.5))*height,depth});
  }
  if(points.length<3)return undefined;
  const left=Math.min(...points.map(point=>point.x));
  const right=Math.max(...points.map(point=>point.x));
  const top=Math.min(...points.map(point=>point.y));
  const bottom=Math.max(...points.map(point=>point.y));
  if(right<0||left>width||bottom<0||top>height)return undefined;
  return{
    sourceId:box.sourceId,
    left,right,top,bottom,
    centerX:(left+right)/2,
    centerY:(top+bottom)/2,
    depth:points.reduce((total,point)=>total+point.depth,0)/points.length,
    area:Math.max(1,(right-left)*(bottom-top)),
  };
}

function cameraEye(camera:Camera3DState,sceneCenter:[number,number,number]):{eye:Vec3;target:Vec3}{
  const yaw=camera.yaw*Math.PI/180;
  const pitch=camera.pitch*Math.PI/180;
  const distance=Math.max(5,camera.distance/24);
  const target:Vec3=[camera.target.x/24,sceneCenter[1],camera.target.y/24];
  return{
    target,
    eye:[
      target[0]+Math.cos(pitch)*Math.sin(yaw)*distance,
      target[1]+Math.sin(pitch)*distance,
      target[2]+Math.cos(pitch)*Math.cos(yaw)*distance,
    ],
  };
}

const differentCamera=(a:Camera3DState,b:Camera3DState)=>
  Math.abs(a.distance-b.distance)>.01||Math.abs(a.yaw-b.yaw)>.01||Math.abs(a.pitch-b.pitch)>.01||
  Math.abs(a.target.x-b.target.x)>.01||Math.abs(a.target.y-b.target.y)>.01;

function ViewButton({label,icon,active,onPress}:{label:string;icon:string;active?:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[styles.viewButton,active&&styles.viewButtonActive]}>
    <Text style={[styles.viewIcon,active&&styles.viewIconActive]}>{icon}</Text>
    <Text style={[styles.viewButtonText,active&&styles.viewButtonTextActive]}>{label}</Text>
  </Pressable>;
}

export function WebGLViewport({project,preview}:{project:EditorProject;preview:(project:EditorProject)=>void}){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const hits=useRef<HitRegion[]>([]);
  const drag=useRef<DragState>({x:0,y:0,start:project.camera3d,mode:'orbit',active:false,moved:false});
  const cameraRef=useRef(project.camera3d);
  const wheelTimer=useRef<number|undefined>(undefined);
  const autoFramed=useRef(false);
  const [camera,setCamera]=useState(project.camera3d);
  const [viewport,setViewport]=useState({width:1,height:1});
  const [renderError,setRenderError]=useState<string>();
  const [view,setView]=useState<Professional3DView>('dollhouse');
  const [hoveredId,setHoveredId]=useState<string>();
  const [pointer,setPointer]=useState({x:0,y:0});
  const scene=useMemo(()=>buildProfessional3DScene(project),[project.objects,project.room]);
  const selected=useMemo(()=>project.objects.find(object=>object.id===project.selectedId),[project.objects,project.selectedId]);
  const hovered=useMemo(()=>project.objects.find(object=>object.id===hoveredId),[project.objects,hoveredId]);

  const setLocalCamera=(next:Camera3DState)=>{
    cameraRef.current=next;
    setCamera(next);
  };
  const commitCamera=(next=cameraRef.current)=>preview({...project,camera3d:next});

  useEffect(()=>{
    if(differentCamera(project.camera3d,cameraRef.current))setLocalCamera(project.camera3d);
  },[project.camera3d]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const measure=()=>{
      const next={width:Math.max(1,Math.round(canvas.clientWidth)),height:Math.max(1,Math.round(canvas.clientHeight))};
      setViewport(current=>current.width===next.width&&current.height===next.height?current:next);
    };
    const frame=window.requestAnimationFrame(measure);
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(measure);
      observer.observe(canvas);
      return()=>{window.cancelAnimationFrame(frame);observer.disconnect();};
    }
    window.addEventListener('resize',measure);
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener('resize',measure);};
  },[]);

  useEffect(()=>{
    if(autoFramed.current||viewport.width<200||viewport.height<180)return;
    autoFramed.current=true;
    if(project.camera3d.pitch<40){
      const next=professionalCameraForView(project,'dollhouse',viewport);
      setLocalCamera(next);
      preview({...project,camera3d:next});
    }
  },[viewport.width,viewport.height]);

  useEffect(()=>()=>{if(wheelTimer.current)window.clearTimeout(wheelTimer.current);},[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas||viewport.width<2||viewport.height<2)return;
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false,premultipliedAlpha:false});
    if(!gl){setRenderError('WebGL is unavailable in this browser or graphics configuration.');return;}
    let program:WebGLProgram|undefined;
    let buffer:WebGLBuffer|undefined;
    try{
      program=createProgram(gl);
      buffer=gl.createBuffer()??undefined;
      if(!buffer)throw new Error('Unable to allocate the 3D geometry buffer.');
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,CUBE,gl.STATIC_DRAW);
      gl.useProgram(program);

      const position=gl.getAttribLocation(program,'aPosition');
      const normal=gl.getAttribLocation(program,'aNormal');
      if(position<0||normal<0)throw new Error('The 3D shader attributes could not be initialized.');
      gl.enableVertexAttribArray(position);
      gl.enableVertexAttribArray(normal);
      gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);
      gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

      const modelLocation=gl.getUniformLocation(program,'uModel');
      const viewProjectionLocation=gl.getUniformLocation(program,'uViewProjection');
      const colorLocation=gl.getUniformLocation(program,'uColor');
      const roughnessLocation=gl.getUniformLocation(program,'uRoughness');
      const metalnessLocation=gl.getUniformLocation(program,'uMetalness');
      const opacityLocation=gl.getUniformLocation(program,'uOpacity');
      const surfaceLocation=gl.getUniformLocation(program,'uSurface');
      const selectedLocation=gl.getUniformLocation(program,'uSelected');
      const eyeLocation=gl.getUniformLocation(program,'uEye');
      if(modelLocation===null||viewProjectionLocation===null||colorLocation===null||roughnessLocation===null||metalnessLocation===null||opacityLocation===null||surfaceLocation===null||selectedLocation===null||eyeLocation===null){
        throw new Error('The 3D shader uniforms could not be initialized.');
      }

      const dpr=Math.min(window.devicePixelRatio||1,2);
      const width=viewport.width;
      const height=viewport.height;
      canvas.width=Math.max(1,Math.floor(width*dpr));
      canvas.height=Math.max(1,Math.floor(height*dpr));
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(.76,.83,.86,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

      const content=scene.boxes.filter(box=>box.surface!=='site-grid'&&box.surface!=='platform'&&box.surface!=='wood-floor'&&box.surface!=='shadow');
      const bounds=sceneBounds3D(content.length?content:scene.boxes);
      const {eye,target}=cameraEye(camera,scene.sceneCenter);
      const distance=Math.hypot(eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]);
      const near=Math.max(.03,Math.min(.5,distance/220));
      const far=Math.max(100,distance+bounds.radius*4+30);
      const viewProjection=multiplyMat4(
        perspectiveMatrix(Math.PI/4,canvas.width/canvas.height,near,far),
        lookAtMatrix(eye,target),
      );
      gl.uniformMatrix4fv(viewProjectionLocation,false,new Float32Array(viewProjection));
      gl.uniform3fv(eyeLocation,new Float32Array(eye));
      hits.current=[];

      const rendered=scene.boxes.map(box=>({
        box,
        opacity:professionalWallOpacity(box,camera.yaw,view,scene.sceneCenter),
      }));
      const opaque=rendered.filter(item=>item.opacity>=.985&&item.box.surface!=='shadow'&&item.box.surface!=='glass');
      const shadows=rendered.filter(item=>item.box.surface==='shadow');
      const transparent=rendered.filter(item=>!opaque.includes(item)&&item.box.surface!=='shadow')
        .sort((a,b)=>{
          const da=Math.hypot(a.box.center[0]-eye[0],a.box.center[1]-eye[1],a.box.center[2]-eye[2]);
          const db=Math.hypot(b.box.center[0]-eye[0],b.box.center[1]-eye[1],b.box.center[2]-eye[2]);
          return db-da;
        });

      const draw=(item:{box:ProfessionalSceneBox;opacity:number},transparentPass=false)=>{
        const {box}=item;
        const model=modelFor(box);
        const selectedBox=Boolean(box.sourceId&&box.sourceId===project.selectedId&&box.surface!=='shadow');
        if(selectedBox&&item.opacity>.5){
          gl.cullFace(gl.FRONT);
          gl.uniformMatrix4fv(modelLocation,false,new Float32Array(modelFor(box,1.035)));
          gl.uniform3fv(colorLocation,new Float32Array([.04,.68,.43]));
          gl.uniform1f(roughnessLocation,1);
          gl.uniform1f(metalnessLocation,0);
          gl.uniform1f(opacityLocation,1);
          gl.uniform1f(surfaceLocation,0);
          gl.uniform1f(selectedLocation,2);
          gl.drawArrays(gl.TRIANGLES,0,36);
          gl.cullFace(gl.BACK);
        }
        gl.uniformMatrix4fv(modelLocation,false,new Float32Array(model));
        gl.uniform3fv(colorLocation,new Float32Array(colorToRgb(box.color)));
        gl.uniform1f(roughnessLocation,box.roughness);
        gl.uniform1f(metalnessLocation,box.metalness);
        gl.uniform1f(opacityLocation,item.opacity);
        gl.uniform1f(surfaceLocation,SURFACE_TYPE[box.surface]);
        gl.uniform1f(selectedLocation,selectedBox?1:0);
        gl.drawArrays(gl.TRIANGLES,0,36);

        if(box.selectable&&box.sourceId&&!(box.surface==='wall'&&item.opacity<.48)){
          const region=regionForBox(box,model,viewProjection,width,height);
          if(region)hits.current.push(region);
        }
        if(transparentPass)gl.depthMask(false);
      };

      gl.depthMask(true);
      opaque.forEach(item=>draw(item));
      gl.depthMask(false);
      shadows.forEach(item=>draw(item,true));
      transparent.forEach(item=>draw(item,true));
      gl.depthMask(true);
      setRenderError(current=>current?undefined:current);
    }catch(error){
      setRenderError(error instanceof Error?error.message:'Kitchen AI could not render this 3D scene.');
    }
    return()=>{
      if(buffer)gl.deleteBuffer(buffer);
      if(program)gl.deleteProgram(program);
    };
  },[scene,camera,project.selectedId,view,viewport]);

  const pick=(event:any)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const x=event.clientX-rect.left;
    const y=event.clientY-rect.top;
    const inside=hits.current
      .filter(region=>x>=region.left&&x<=region.right&&y>=region.top&&y<=region.bottom)
      .sort((a,b)=>a.depth-b.depth||a.area-b.area);
    if(inside.length)return inside[0].sourceId;
    const nearest=hits.current
      .map(region=>({region,distance:Math.hypot(region.centerX-x,region.centerY-y)}))
      .filter(item=>item.distance<34)
      .sort((a,b)=>a.distance-b.distance||a.region.depth-b.region.depth)[0];
    return nearest?.region.sourceId;
  };

  const applyView=(nextView:Professional3DView)=>{
    const next=professionalCameraForView({...project,camera3d:cameraRef.current},nextView,viewport);
    setView(nextView);
    setLocalCamera(next);
    preview({...project,camera3d:next});
  };
  const changeHeight=(delta:number)=>{
    const next={...cameraRef.current,pitch:Math.max(7,Math.min(78,cameraRef.current.pitch+delta))};
    setLocalCamera(next);
    preview({...project,camera3d:next});
  };

  const handleWheel=(event:any)=>{
    event.preventDefault();
    const next={...cameraRef.current,distance:Math.max(120,Math.min(1100,cameraRef.current.distance+(event.deltaY>0?30:-30)))};
    setLocalCamera(next);
    if(wheelTimer.current)window.clearTimeout(wheelTimer.current);
    wheelTimer.current=window.setTimeout(()=>commitCamera(next),90);
  };

  const handleMouseDown=(event:any)=>{
    drag.current={
      x:event.clientX,
      y:event.clientY,
      start:cameraRef.current,
      mode:event.button===1||event.button===2||event.shiftKey?'pan':'orbit',
      active:true,
      moved:false,
    };
  };

  const handleMouseMove=(event:any)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    setPointer({x:event.clientX-rect.left,y:event.clientY-rect.top});
    if(!drag.current.active){setHoveredId(pick(event));return;}
    const dx=event.clientX-drag.current.x;
    const dy=event.clientY-drag.current.y;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.current.moved=true;
    if(drag.current.mode==='orbit'){
      setLocalCamera({
        ...drag.current.start,
        yaw:drag.current.start.yaw+dx*.28,
        pitch:Math.max(7,Math.min(78,drag.current.start.pitch+dy*.2)),
      });
      return;
    }
    const panScale=Math.max(.12,drag.current.start.distance/Math.max(360,Math.min(viewport.width,viewport.height))*.75);
    setLocalCamera({
      ...drag.current.start,
      target:{x:drag.current.start.target.x-dx*panScale,y:drag.current.start.target.y+dy*panScale},
    });
  };

  const handleMouseUp=(event:any)=>{
    const moved=drag.current.moved;
    drag.current.active=false;
    if(moved){commitCamera();return;}
    const selectedId=pick(event);
    preview({...project,selectedId,camera3d:cameraRef.current});
  };

  const handleDoubleClick=(event:any)=>{
    const id=pick(event);
    const object=project.objects.find(item=>item.id===id);
    if(!object)return;
    const objectSize=Math.max(object.widthIn,object.depthIn,object.heightIn);
    const next={
      ...cameraRef.current,
      target:{x:object.x+object.widthIn/2,y:object.y+object.depthIn/2},
      distance:Math.max(150,Math.min(760,objectSize*4.4)),
      pitch:view==='top'?72:Math.max(12,Math.min(48,cameraRef.current.pitch)),
    };
    setLocalCamera(next);
    preview({...project,selectedId:object.id,camera3d:next});
  };

  if(renderError)return <View style={styles.root}>
    <Native3DWorkspace project={{...project,camera3d:camera}} apply={next=>preview(next)}/>
    <View pointerEvents="none" style={styles.softwareBadge}>
      <Text style={styles.softwareTitle}>Compatible 3D mode</Text>
      <Text style={styles.softwareText}>Kitchen AI is using the software renderer because WebGL is unavailable.</Text>
    </View>
  </View>;

  return <View style={styles.root}>
    <AnyCanvas
      ref={canvasRef}
      aria-label="Professional 3D kitchen designer"
      style={{width:'100%',height:'100%',display:'block',cursor:drag.current.active?'grabbing':hoveredId?'pointer':'grab'}}
      onContextMenu={(event:any)=>event.preventDefault()}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={()=>{drag.current.active=false;setHoveredId(undefined);}}
      onDoubleClick={handleDoubleClick}
    />

    <View pointerEvents="none" style={styles.areaBadge}>
      <Text style={styles.areaText}>{scene.areaSqFt} ft² · {professionalViewLabel(view)}</Text>
    </View>

    <View pointerEvents="none" style={styles.compass}>
      <Text style={styles.compassNorth}>N</Text>
      <View style={[styles.compassNeedle,{transform:[{rotate:`${-camera.yaw}deg`}]}]}><View style={styles.compassTip}/></View>
      <Text style={styles.compassSouth}>S</Text>
    </View>

    <View style={styles.viewController}>
      <Text style={styles.controllerHeading}>3D</Text>
      <ViewButton label="Dollhouse" icon="⌂" active={view==='dollhouse'} onPress={()=>applyView('dollhouse')}/>
      <ViewButton label="Visit" icon="◉" active={view==='visit'} onPress={()=>applyView('visit')}/>
      <ViewButton label="Wall" icon="▱" active={view==='wall'} onPress={()=>applyView('wall')}/>
      <ViewButton label="Top" icon="▦" active={view==='top'} onPress={()=>applyView('top')}/>
      <View style={styles.heightRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Raise 3D camera" onPress={()=>changeHeight(8)} style={styles.heightButton}><Text style={styles.heightIcon}>⌃</Text><Text style={styles.heightText}>Up</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Lower 3D camera" onPress={()=>changeHeight(-8)} style={styles.heightButton}><Text style={styles.heightIcon}>⌄</Text><Text style={styles.heightText}>Down</Text></Pressable>
      </View>
    </View>

    <View pointerEvents="none" style={styles.navigationBadge}>
      <Text style={styles.navigationText}>Drag to orbit · Shift/right drag to pan · Wheel to zoom · Double-click to focus</Text>
    </View>

    {selected&&<View pointerEvents="none" style={styles.selectionBadge}>
      <Text numberOfLines={1} style={styles.selectionName}>{selected.name}</Text>
      <Text style={styles.selectionSize}>{selected.widthIn}″ W × {selected.depthIn}″ D × {selected.heightIn}″ H</Text>
    </View>}

    {hovered&&!drag.current.active&&<View pointerEvents="none" style={[styles.hoverCard,{left:Math.min(viewport.width-230,pointer.x+14),top:Math.min(viewport.height-74,pointer.y+14)}]}>
      <Text numberOfLines={1} style={styles.hoverName}>{hovered.name}</Text>
      <Text style={styles.hoverSize}>{hovered.widthIn}″ × {hovered.depthIn}″ × {hovered.heightIn}″</Text>
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,minHeight:0,position:'relative',overflow:'hidden',backgroundColor:'#C6D3D8'},
  areaBadge:{position:'absolute',top:12,left:'42%',borderRadius:999,backgroundColor:'rgba(18,31,37,.82)',paddingHorizontal:13,paddingVertical:7},
  areaText:{fontSize:11,fontWeight:'900',color:'#F4FAF8'},
  compass:{position:'absolute',right:16,top:14,width:72,height:72,borderRadius:36,borderWidth:2,borderColor:'#DDE7E4',backgroundColor:'rgba(248,251,250,.92)',alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.18,shadowRadius:9,shadowOffset:{width:0,height:4}},
  compassNorth:{position:'absolute',top:4,fontSize:9,fontWeight:'900',color:'#243B34'},
  compassSouth:{position:'absolute',bottom:4,fontSize:9,fontWeight:'900',color:'#65736E'},
  compassNeedle:{width:5,height:42,alignItems:'center',justifyContent:'flex-start'},
  compassTip:{width:0,height:0,borderLeftWidth:5,borderRightWidth:5,borderBottomWidth:24,borderLeftColor:'transparent',borderRightColor:'transparent',borderBottomColor:'#D94F45'},
  viewController:{position:'absolute',right:12,top:96,width:102,borderRadius:12,borderWidth:1,borderColor:'#C6D4D0',backgroundColor:'rgba(248,251,250,.95)',padding:6,shadowColor:'#000',shadowOpacity:.2,shadowRadius:12,shadowOffset:{width:0,height:6}},
  controllerHeading:{fontSize:22,fontWeight:'900',color:'#172823',textAlign:'center',paddingVertical:4},
  viewButton:{minHeight:53,borderRadius:8,alignItems:'center',justifyContent:'center',paddingHorizontal:4,marginBottom:4},
  viewButtonActive:{backgroundColor:'#DCEDE7',borderWidth:1,borderColor:'#62A28F'},
  viewIcon:{fontSize:22,color:'#334B43'},
  viewIconActive:{color:'#0B785A'},
  viewButtonText:{fontSize:9,fontWeight:'800',color:'#4C5E58',marginTop:1,textAlign:'center'},
  viewButtonTextActive:{color:'#0B5E47'},
  heightRow:{flexDirection:'row',gap:4,borderTopWidth:1,borderTopColor:'#D6DFDC',paddingTop:5},
  heightButton:{flex:1,minHeight:43,borderRadius:7,alignItems:'center',justifyContent:'center',backgroundColor:'#EDF2F0'},
  heightIcon:{fontSize:19,fontWeight:'900',color:'#334B43',lineHeight:18},
  heightText:{fontSize:8,fontWeight:'800',color:'#5B6B66'},
  navigationBadge:{position:'absolute',left:12,bottom:12,maxWidth:'68%',borderRadius:8,backgroundColor:'rgba(20,34,31,.82)',paddingHorizontal:10,paddingVertical:7},
  navigationText:{fontSize:9,fontWeight:'700',color:'#E8F0ED'},
  selectionBadge:{position:'absolute',left:12,top:12,maxWidth:300,borderRadius:10,borderWidth:1,borderColor:'#6AA590',backgroundColor:'rgba(247,251,249,.94)',paddingHorizontal:10,paddingVertical:7,shadowColor:'#000',shadowOpacity:.14,shadowRadius:8,shadowOffset:{width:0,height:4}},
  selectionName:{fontSize:12,fontWeight:'900',color:'#173D31'},
  selectionSize:{fontSize:9,fontWeight:'700',color:'#65746F',marginTop:2},
  hoverCard:{position:'absolute',width:216,borderRadius:8,borderWidth:1,borderColor:'#9CB0A9',backgroundColor:'rgba(252,254,253,.96)',paddingHorizontal:9,paddingVertical:7,shadowColor:'#000',shadowOpacity:.16,shadowRadius:8,shadowOffset:{width:0,height:4}},
  hoverName:{fontSize:11,fontWeight:'900',color:'#1E312B'},
  hoverSize:{fontSize:9,fontWeight:'700',color:'#687671',marginTop:2},
  softwareBadge:{position:'absolute',left:16,right:16,top:16,borderRadius:11,borderWidth:1,borderColor:'#C59E75',backgroundColor:'rgba(255,250,244,.95)',padding:12},
  softwareTitle:{fontSize:14,fontWeight:'900',color:'#6D3D20'},
  softwareText:{fontSize:11,lineHeight:17,fontWeight:'700',color:'#704F3C',marginTop:3},
});
