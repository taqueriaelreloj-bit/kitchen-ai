import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { Native3DWorkspace } from './Native3DWorkspace';
import {
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

function colorToRgb(value:string){
  const short=value.replace('#','');
  const full=short.length===3?short.split('').map(character=>character+character).join(''):short;
  const number=parseInt(full,16)||0xcccccc;
  return [((number>>16)&255)/255,((number>>8)&255)/255,(number&255)/255];
}

const VERTEX_SHADER=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uViewProjection;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uViewProjection*world;}`;
const FRAGMENT_SHADER=`precision mediump float;varying vec3 vNormal;varying vec3 vWorld;uniform vec3 uColor;uniform float uMetalness;uniform float uRoughness;uniform vec3 uEye;void main(){vec3 N=normalize(vNormal);vec3 L=normalize(vec3(-0.35,0.9,0.45));vec3 V=normalize(uEye-vWorld);vec3 H=normalize(L+V);float diffuse=max(dot(N,L),0.0);float specular=pow(max(dot(N,H),0.0),mix(90.0,10.0,uRoughness));vec3 base=uColor*(0.28+0.72*diffuse);vec3 reflection=mix(vec3(0.65),uColor,uMetalness);gl_FragColor=vec4(base+reflection*specular*(0.15+0.7*uMetalness),1.0);}`;
const CUBE=new Float32Array([-0.5,-0.5,0.5,0,0,1,0.5,-0.5,0.5,0,0,1,0.5,0.5,0.5,0,0,1,-0.5,-0.5,0.5,0,0,1,0.5,0.5,0.5,0,0,1,-0.5,0.5,0.5,0,0,1,0.5,-0.5,-0.5,0,0,-1,-0.5,-0.5,-0.5,0,0,-1,-0.5,0.5,-0.5,0,0,-1,0.5,-0.5,-0.5,0,0,-1,-0.5,0.5,-0.5,0,0,-1,0.5,0.5,-0.5,0,0,-1,-0.5,-0.5,-0.5,-1,0,0,-0.5,-0.5,0.5,-1,0,0,-0.5,0.5,0.5,-1,0,0,-0.5,-0.5,-0.5,-1,0,0,-0.5,0.5,0.5,-1,0,0,-0.5,0.5,-0.5,-1,0,0,0.5,-0.5,0.5,1,0,0,0.5,-0.5,-0.5,1,0,0,0.5,0.5,-0.5,1,0,0,0.5,-0.5,0.5,1,0,0,0.5,0.5,-0.5,1,0,0,0.5,0.5,0.5,1,0,0,-0.5,0.5,0.5,0,1,0,0.5,0.5,0.5,0,1,0,0.5,0.5,-0.5,0,1,0,-0.5,0.5,0.5,0,1,0,0.5,0.5,-0.5,0,1,0,-0.5,0.5,-0.5,0,1,0,-0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,0.5,0,-1,0,-0.5,-0.5,-0.5,0,-1,0,0.5,-0.5,0.5,0,-1,0,-0.5,-0.5,0.5,0,-1,0]);

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

export function WebGLViewport({project,preview}:{project:EditorProject;preview:(project:EditorProject)=>void}){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const hits=useRef(new Map<string,{x:number;y:number}>());
  const drag=useRef({x:0,y:0,yaw:0,pitch:0,tx:0,ty:0,mode:'orbit' as 'orbit'|'pan',active:false,moved:false});
  const [viewport,setViewport]=useState({width:1,height:1});
  const [renderError,setRenderError]=useState<string>();
  const boxes=useMemo(()=>buildSceneBoxes(project.objects),[project.objects]);

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
    const canvas=canvasRef.current;
    if(!canvas||viewport.width<2||viewport.height<2)return;
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false});
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

      const modelLocation=gl.getUniformLocation(program,'uModel');
      const viewProjectionLocation=gl.getUniformLocation(program,'uViewProjection');
      const colorLocation=gl.getUniformLocation(program,'uColor');
      const roughnessLocation=gl.getUniformLocation(program,'uRoughness');
      const metalnessLocation=gl.getUniformLocation(program,'uMetalness');
      const eyeLocation=gl.getUniformLocation(program,'uEye');
      if(modelLocation===null||viewProjectionLocation===null||colorLocation===null||roughnessLocation===null||metalnessLocation===null||eyeLocation===null){
        throw new Error('The 3D shader uniforms could not be initialized.');
      }

      const dpr=Math.min(window.devicePixelRatio||1,2);
      const width=viewport.width;
      const height=viewport.height;
      canvas.width=Math.max(1,Math.floor(width*dpr));
      canvas.height=Math.max(1,Math.floor(height*dpr));
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(.88,.9,.89,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

      const camera=project.camera3d;
      const yaw=camera.yaw*Math.PI/180;
      const pitch=camera.pitch*Math.PI/180;
      const distance=Math.max(5,camera.distance/24);
      const contentBoxes=boxes.filter(box=>box.kind!=='floor');
      const bounds=sceneBounds3D(contentBoxes.length?contentBoxes:boxes);
      const target:Vec3=[camera.target.x/24,bounds.center[1],camera.target.y/24];
      const eye:Vec3=[
        target[0]+Math.cos(pitch)*Math.sin(yaw)*distance,
        target[1]+Math.sin(pitch)*distance,
        target[2]+Math.cos(pitch)*Math.cos(yaw)*distance,
      ];
      const near=Math.max(.03,Math.min(.5,distance/200));
      const far=Math.max(100,distance+bounds.radius*4+20);
      const viewProjection=multiplyMat4(
        perspectiveMatrix(Math.PI/4,canvas.width/canvas.height,near,far),
        lookAtMatrix(eye,target),
      );
      gl.uniformMatrix4fv(viewProjectionLocation,false,new Float32Array(viewProjection));
      gl.uniform3fv(eyeLocation,new Float32Array(eye));
      hits.current.clear();

      for(const box of boxes){
        const model=multiplyMat4(
          translationMatrix(...box.center),
          multiplyMat4(rotationYMatrix(box.rotationY),scaleMatrix(...box.size)),
        );
        gl.uniformMatrix4fv(modelLocation,false,new Float32Array(model));
        gl.uniform3fv(colorLocation,new Float32Array(colorToRgb(box.sourceId===project.selectedId?'#49A88B':box.color)));
        gl.uniform1f(roughnessLocation,box.roughness);
        gl.uniform1f(metalnessLocation,box.metalness);
        gl.drawArrays(gl.TRIANGLES,0,36);

        if(box.sourceId&&!hits.current.has(box.sourceId)){
          const clip=transformPoint(viewProjection,box.center);
          if(clip[3]>.0001){
            const normalizedX=clip[0]/clip[3];
            const normalizedY=clip[1]/clip[3];
            if(Number.isFinite(normalizedX)&&Number.isFinite(normalizedY)&&Math.abs(normalizedX)<=1.25&&Math.abs(normalizedY)<=1.25){
              hits.current.set(box.sourceId,{
                x:(normalizedX*.5+.5)*width,
                y:(1-(normalizedY*.5+.5))*height,
              });
            }
          }
        }
      }
      setRenderError(current=>current?undefined:current);
    }catch(error){
      setRenderError(error instanceof Error?error.message:'Kitchen AI could not render this 3D scene.');
    }
    return()=>{
      if(buffer)gl.deleteBuffer(buffer);
      if(program)gl.deleteProgram(program);
    };
  },[boxes,project.camera3d,project.selectedId,viewport]);

  const pick=(event:any)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const x=event.clientX-rect.left;
    const y=event.clientY-rect.top;
    let id:string|undefined;
    let best=44;
    for(const[candidate,point]of hits.current){
      const distance=Math.hypot(point.x-x,point.y-y);
      if(distance<best){best=distance;id=candidate;}
    }
    return id;
  };

  const handleWheel=(event:any)=>{
    event.preventDefault();
    preview({...project,camera3d:{
      ...project.camera3d,
      distance:Math.max(120,Math.min(1100,project.camera3d.distance+(event.deltaY>0?32:-32))),
    }});
  };

  const handleMouseDown=(event:any)=>{
    drag.current={
      x:event.clientX,
      y:event.clientY,
      yaw:project.camera3d.yaw,
      pitch:project.camera3d.pitch,
      tx:project.camera3d.target.x,
      ty:project.camera3d.target.y,
      mode:event.button===1||event.button===2?'pan':'orbit',
      active:true,
      moved:false,
    };
  };

  const handleMouseMove=(event:any)=>{
    if(!drag.current.active)return;
    const dx=event.clientX-drag.current.x;
    const dy=event.clientY-drag.current.y;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.current.moved=true;
    if(drag.current.mode==='orbit'){
      preview({...project,camera3d:{
        ...project.camera3d,
        yaw:drag.current.yaw+dx*.28,
        pitch:Math.max(8,Math.min(76,drag.current.pitch+dy*.2)),
      }});
      return;
    }
    const panScale=Math.max(.12,project.camera3d.distance/Math.max(360,Math.min(viewport.width,viewport.height))*.75);
    preview({...project,camera3d:{
      ...project.camera3d,
      target:{x:drag.current.tx-dx*panScale,y:drag.current.ty+dy*panScale},
    }});
  };

  const handleMouseUp=(event:any)=>{
    drag.current.active=false;
    if(!drag.current.moved)preview({...project,selectedId:pick(event)});
  };

  const handleDoubleClick=(event:any)=>{
    const id=pick(event);
    const object=project.objects.find(item=>item.id===id);
    if(!object)return;
    const objectSize=Math.max(object.widthIn,object.depthIn,object.heightIn);
    preview({...project,
      selectedId:object.id,
      camera3d:{
        ...project.camera3d,
        target:{x:object.x+object.widthIn/2,y:object.y+object.depthIn/2},
        distance:Math.max(120,Math.min(1100,objectSize*4.2)),
      },
    });
  };

  if(renderError)return <View style={styles.root}>
    <Native3DWorkspace project={project} apply={next=>preview(next)}/>
    <View pointerEvents="none" style={styles.error}>
      <Text style={styles.errorTitle}>Software 3D mode</Text>
      <Text style={styles.errorText}>WebGL is unavailable, so Kitchen AI is showing the compatible interactive 3D preview.</Text>
      <Text style={styles.errorHelp}>Drag to orbit, pinch or use the mouse to navigate, and double-click an object to focus it.</Text>
    </View>
  </View>;

  return <View style={styles.root}>
    <canvas
      ref={canvasRef}
      aria-label="3D kitchen viewport"
      style={{width:'100%',height:'100%',display:'block',cursor:drag.current.active?'grabbing':'grab'}}
      onContextMenu={event=>event.preventDefault()}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={()=>{drag.current.active=false;}}
      onDoubleClick={handleDoubleClick}
    />
    {renderError&&<View pointerEvents="none" style={styles.error}>
      <Text style={styles.errorTitle}>3D view needs attention</Text>
      <Text style={styles.errorText}>{renderError}</Text>
      <Text style={styles.errorHelp}>The editable 2D plan remains available. Update the graphics driver or enable browser hardware acceleration, then reopen 3D.</Text>
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,minHeight:0,position:'relative',backgroundColor:'#E0E5E3'},
  error:{position:'absolute',left:20,right:20,top:20,borderRadius:12,borderWidth:1,borderColor:'#C59E75',backgroundColor:'rgba(255,250,244,.96)',padding:14},
  errorTitle:{fontSize:15,fontWeight:'900',color:'#6D3D20'},
  errorText:{fontSize:12,lineHeight:18,fontWeight:'700',color:'#704F3C',marginTop:4},
  errorHelp:{fontSize:11,lineHeight:16,color:'#725E52',marginTop:5},
});
