import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorProject } from '../domain/editor';
import { Box3D, buildSceneBoxes } from '../domain/geometry';

type Props={project:EditorProject;preview:(project:EditorProject)=>void};
type Mat4=number[];
type Hit={x:number;y:number;box:Box3D};
type DragState={active:boolean;moved:boolean;mode:'orbit'|'pan'|'select';x:number;y:number;yaw:number;pitch:number;targetX:number;targetY:number;sourceId?:string};

const CUBE=new Float32Array([
-0.5,-0.5,0.5,0,0,1,0.5,-0.5,0.5,0,0,1,0.5,0.5,0.5,0,0,1,-0.5,-0.5,0.5,0,0,1,0.5,0.5,0.5,0,0,1,-0.5,0.5,0.5,0,0,1,
0.5,-0.5,-0.5,0,0,-1,-0.5,-0.5,-0.5,0,0,-1,-0.5,0.5,-0.5,0,0,-1,0.5,-0.5,-0.5,0,0,-1,-0.5,0.5,-0.5,0,0,-1,0.5,0.5,-0.5,0,0,-1,
-0.5,-0.5,-0.5,-1,0,0,-0.5,-0.5,0.5,-1,0,0,-0.5,0.5,0.5,-1,0,0,-0.5,-0.5,-0.5,-1,0,0,-0.5,0.5,0.5,-1,0,0,-0.5,0.5,-0.5,-1,0,0,
0.5,-0.5,0.5,1,0,0,0.5,-0.5,-0.5,1,0,0,0.5,0.5,-0.5,1,0,0,0.5,-0.5,0.5,1,0,0,0.5,0.5,-0.5,1,0,0,0.5,0.5,0.5,1,0,0,
-0.5,0.5,0.5,0,1,0,0.5,0.5,0.5,0,1,0,0.5,0.5,-0.5,0,1,0,-0.5,0.5,0.5,0,1,0,0.5,0.5,-0.5,0,1,0,-0.5,0.5,-0.5,0,1,0,
-0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,0.5,0,-1,0,-0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,0.5,0,-1,0,-0.5,-0.5,0.5,0,-1,0]);
const VERTEX_SHADER=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProjection;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uViewProjection*world;}`;
const FRAGMENT_SHADER=`precision mediump float;varying vec3 vNormal;varying vec3 vWorld;uniform vec3 uColor;uniform float uMetalness;uniform float uRoughness;uniform vec3 uEye;void main(){vec3 N=normalize(vNormal);vec3 L=normalize(vec3(-0.35,0.9,0.45));vec3 V=normalize(uEye-vWorld);vec3 H=normalize(L+V);float diffuse=max(dot(N,L),0.0);float specular=pow(max(dot(N,H),0.0),mix(95.0,9.0,uRoughness));vec3 base=uColor*(0.28+0.72*diffuse);vec3 reflection=mix(vec3(0.65),uColor,uMetalness);gl_FragColor=vec4(base+reflection*specular*(0.15+0.72*uMetalness),1.0);}`;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const radians=(value:number)=>value*Math.PI/180;
const multiply=(a:Mat4,b:Mat4):Mat4=>{const out=new Array(16).fill(0);for(let row=0;row<4;row++)for(let column=0;column<4;column++)for(let index=0;index<4;index++)out[row*4+column]+=a[row*4+index]*b[index*4+column];return out;};
const perspective=(fov:number,aspect:number,near:number,far:number):Mat4=>{const f=1/Math.tan(fov/2),nf=1/(near-far);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];};
const normalize=(vector:number[])=>{const length=Math.hypot(vector[0],vector[1],vector[2])||1;return vector.map(value=>value/length);};
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lookAt=(eye:number[],target:number[],up=[0,1,0]):Mat4=>{const z=normalize([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]),x=normalize(cross(up,z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1];};
const translate=(x:number,y:number,z:number):Mat4=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
const scale=(x:number,y:number,z:number):Mat4=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
const rotateY=(angle:number):Mat4=>{const cosine=Math.cos(angle),sine=Math.sin(angle);return[cosine,0,-sine,0,0,1,0,0,sine,0,cosine,0,0,0,0,1];};
const transformPoint=(matrix:Mat4,point:number[])=>[matrix[0]*point[0]+matrix[4]*point[1]+matrix[8]*point[2]+matrix[12],matrix[1]*point[0]+matrix[5]*point[1]+matrix[9]*point[2]+matrix[13],matrix[2]*point[0]+matrix[6]*point[1]+matrix[10]*point[2]+matrix[14],matrix[3]*point[0]+matrix[7]*point[1]+matrix[11]*point[2]+matrix[15]];
const colorToRgb=(value:string)=>{const raw=value.replace('#',''),full=raw.length===3?raw.split('').map(character=>character+character).join(''):raw,number=parseInt(full,16)||0xcccccc;return[((number>>16)&255)/255,((number>>8)&255)/255,(number&255)/255];};

function compileShader(gl:WebGLRenderingContext,type:number,source:string){
  const shader=gl.createShader(type);
  if(!shader)throw new Error('Unable to create WebGL shader.');
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader)??'Shader compile error';gl.deleteShader(shader);throw new Error(message);}
  return shader;
}
function createProgram(gl:WebGLRenderingContext){
  const vertex=compileShader(gl,gl.VERTEX_SHADER,VERTEX_SHADER),fragment=compileShader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER),program=gl.createProgram();
  if(!program)throw new Error('Unable to create WebGL program.');
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program)??'Program link error';gl.deleteShader(vertex);gl.deleteShader(fragment);gl.deleteProgram(program);throw new Error(message);}
  return{program,vertex,fragment};
}

export function WebGLViewportPro({project,preview}:Props){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const hits=useRef(new Map<string,Hit>());
  const drag=useRef<DragState>({active:false,moved:false,mode:'orbit',x:0,y:0,yaw:0,pitch:0,targetX:0,targetY:0});
  const[size,setSize]=useState({width:1,height:1});
  const boxes=useMemo(()=>buildSceneBoxes(project.objects),[project.objects]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const measure=()=>{const width=Math.max(1,Math.round(canvas.clientWidth)),height=Math.max(1,Math.round(canvas.clientHeight));setSize(current=>current.width===width&&current.height===height?current:{width,height});};
    measure();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):undefined;
    observer?.observe(canvas);window.addEventListener('resize',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false});
    if(!gl)return;
    const{program,vertex,fragment}=createProgram(gl),buffer=gl.createBuffer();
    if(!buffer){gl.deleteShader(vertex);gl.deleteShader(fragment);gl.deleteProgram(program);return;}
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,CUBE,gl.STATIC_DRAW);gl.useProgram(program);
    const position=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal');
    gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    const modelLocation=gl.getUniformLocation(program,'uModel'),vpLocation=gl.getUniformLocation(program,'uViewProjection'),colorLocation=gl.getUniformLocation(program,'uColor'),roughLocation=gl.getUniformLocation(program,'uRoughness'),metalLocation=gl.getUniformLocation(program,'uMetalness'),eyeLocation=gl.getUniformLocation(program,'uEye');
    const dpr=Math.min(window.devicePixelRatio||1,2),width=Math.max(1,size.width),height=Math.max(1,size.height);
    canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.88,.9,.89,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const yaw=radians(project.camera3d.yaw),pitch=radians(project.camera3d.pitch),distance=project.camera3d.distance/42,target=[project.camera3d.target.x/24,2,project.camera3d.target.y/24],eye=[target[0]+Math.cos(pitch)*Math.sin(yaw)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(pitch)*Math.cos(yaw)*distance],viewProjection=multiply(perspective(Math.PI/4,canvas.width/canvas.height,.05,120),lookAt(eye,target));
    gl.uniformMatrix4fv(vpLocation,false,new Float32Array(viewProjection));gl.uniform3fv(eyeLocation,new Float32Array(eye));hits.current.clear();
    for(const box of boxes){
      const model=multiply(translate(...box.center),multiply(rotateY(box.rotationY),scale(...box.size)));
      gl.uniformMatrix4fv(modelLocation,false,new Float32Array(model));gl.uniform3fv(colorLocation,new Float32Array(colorToRgb(box.sourceId===project.selectedId?'#49A88B':box.color)));gl.uniform1f(roughLocation,box.roughness);gl.uniform1f(metalLocation,box.metalness);gl.drawArrays(gl.TRIANGLES,0,36);
      if(box.sourceId&&!hits.current.has(box.sourceId)){const point=transformPoint(viewProjection,box.center);if(point[3]>0)hits.current.set(box.sourceId,{x:(point[0]/point[3]*.5+.5)*width,y:(1-(point[1]/point[3]*.5+.5))*height,box});}
    }
    return()=>{gl.deleteBuffer(buffer);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.deleteProgram(program);};
  },[boxes,project.camera3d,project.selectedId,size]);

  const pick=(event:any)=>{
    const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    let selected:Hit|undefined,best=46;
    for(const hit of hits.current.values()){const distance=Math.hypot(hit.x-x,hit.y-y);if(distance<best){best=distance;selected=hit;}}
    return selected;
  };
  const onMouseDown=(event:any)=>{
    const hit=pick(event),mode:event.button===1||event.button===2?'pan':hit?'select':'orbit';
    drag.current={active:true,moved:false,mode,x:event.clientX,y:event.clientY,yaw:project.camera3d.yaw,pitch:project.camera3d.pitch,targetX:project.camera3d.target.x,targetY:project.camera3d.target.y,sourceId:hit?.box.sourceId};
  };
  const onMouseMove=(event:any)=>{
    const state=drag.current;if(!state.active)return;
    const dx=event.clientX-state.x,dy=event.clientY-state.y;if(Math.abs(dx)+Math.abs(dy)>4)state.moved=true;
    if(state.mode==='orbit')preview({...project,camera3d:{...project.camera3d,yaw:state.yaw+dx*.28,pitch:clamp(state.pitch+dy*.2,8,78)}});
    if(state.mode==='pan')preview({...project,camera3d:{...project.camera3d,target:{x:state.targetX-dx*.45,y:state.targetY+dy*.45}}});
  };
  const onMouseUp=(event:any)=>{
    const state=drag.current;state.active=false;
    if(!state.moved&&state.mode==='select')preview({...project,selectedId:state.sourceId});
    if(!state.moved&&state.mode==='orbit'&&!pick(event))preview({...project,selectedId:undefined});
  };
  const onDoubleClick=(event:any)=>{
    const hit=pick(event);if(!hit?.box.sourceId)return;
    preview({...project,selectedId:hit.box.sourceId,camera3d:{...project.camera3d,target:{x:hit.box.center[0]*24,y:hit.box.center[2]*24},distance:clamp(project.camera3d.distance*.72,220,1100)}});
  };

  return <canvas
    ref={canvasRef}
    aria-label="Professional 3D kitchen viewport"
    tabIndex={0}
    style={{width:'100%',height:'100%',display:'block',cursor:drag.current.mode==='pan'?'move':'grab',touchAction:'none'}}
    onContextMenu={event=>event.preventDefault()}
    onWheel={event=>{event.preventDefault();preview({...project,camera3d:{...project.camera3d,distance:clamp(project.camera3d.distance+(event.deltaY>0?32:-32),180,1100)}});}}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    onMouseUp={onMouseUp}
    onMouseLeave={()=>{drag.current.active=false;}}
    onDoubleClick={onDoubleClick}
  />;
}
