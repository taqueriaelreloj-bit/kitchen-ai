import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GLView } from 'expo-gl';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { CUBE_INDICES, CUBE_VERTICES, nativeGlFrame, NativeGlFrame } from '../domain/nativeGlScene';

type GL=any;
type Props={project:EditorProject;camera:Camera3DState};
type Resources={program:any;vertexBuffer:any;indexBuffer:any;position:number;normal:number;viewProjection:any;model:any;color:any;metalness:any;roughness:any};

const vertexShader=`
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uViewProjection;
uniform mat4 uModel;
varying vec3 vNormal;
varying vec3 vWorld;
void main(){
  vec4 world=uModel*vec4(aPosition,1.0);
  vWorld=world.xyz;
  vNormal=normalize(mat3(uModel)*aNormal);
  gl_Position=uViewProjection*world;
}`;
const fragmentShader=`
precision mediump float;
varying vec3 vNormal;
varying vec3 vWorld;
uniform vec4 uColor;
uniform float uMetalness;
uniform float uRoughness;
void main(){
  vec3 normal=normalize(vNormal);
  vec3 light=normalize(vec3(-0.45,0.82,0.35));
  float diffuse=max(dot(normal,light),0.0);
  float ambient=0.30+0.18*(1.0-uMetalness);
  float edge=pow(max(dot(normal,normalize(vec3(0.2,0.7,0.5))),0.0),mix(6.0,28.0,1.0-uRoughness));
  vec3 base=uColor.rgb*(ambient+diffuse*0.72);
  vec3 specular=mix(vec3(0.08),uColor.rgb,uMetalness)*edge*(1.0-uRoughness)*0.65;
  gl_FragColor=vec4(base+specular,uColor.a);
}`;

function compile(gl:GL,type:number,source:string){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Shader compilation failed.');
  return shader;
}
function resources(gl:GL):Resources{
  const vertex=compile(gl,gl.VERTEX_SHADER,vertexShader),fragment=compile(gl,gl.FRAGMENT_SHADER,fragmentShader),program=gl.createProgram();
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'OpenGL program linking failed.');
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  const vertexBuffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,CUBE_VERTICES,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,CUBE_INDICES,gl.STATIC_DRAW);
  return{
    program,vertexBuffer,indexBuffer,
    position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),
    viewProjection:gl.getUniformLocation(program,'uViewProjection'),model:gl.getUniformLocation(program,'uModel'),color:gl.getUniformLocation(program,'uColor'),metalness:gl.getUniformLocation(program,'uMetalness'),roughness:gl.getUniformLocation(program,'uRoughness'),
  };
}
function dispose(gl:GL,value?:Resources){
  if(!value)return;
  gl.deleteBuffer(value.vertexBuffer);gl.deleteBuffer(value.indexBuffer);gl.deleteProgram(value.program);
}
function draw(gl:GL,value:Resources,frame:NativeGlFrame){
  gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.clearColor(.86,.89,.88,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(value.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,value.vertexBuffer);
  gl.enableVertexAttribArray(value.position);gl.vertexAttribPointer(value.position,3,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(value.normal);gl.vertexAttribPointer(value.normal,3,gl.FLOAT,false,24,12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,value.indexBuffer);
  gl.uniformMatrix4fv(value.viewProjection,false,frame.viewProjection);
  for(const command of frame.commands){
    gl.uniformMatrix4fv(value.model,false,command.model);
    gl.uniform4fv(value.color,command.color);
    gl.uniform1f(value.metalness,command.metalness);
    gl.uniform1f(value.roughness,command.roughness);
    gl.drawElements(gl.TRIANGLES,CUBE_INDICES.length,gl.UNSIGNED_SHORT,0);
  }
  gl.flush();gl.endFrameEXP();
}

export function NativeGLViewport({project,camera}:Props){
  const[aspect,setAspect]=useState(1.35),[error,setError]=useState<string>();
  const boxes=useMemo(()=>buildSceneBoxes(project.objects),[project.objects]);
  const frame=useMemo(()=>nativeGlFrame(boxes,camera,aspect,project.selectedId),[boxes,camera,aspect,project.selectedId]);
  const frameRef=useRef(frame),glRef=useRef<GL>(),resourcesRef=useRef<Resources>(),animationRef=useRef<number>();
  useEffect(()=>{frameRef.current=frame;},[frame]);
  useEffect(()=>()=>{if(animationRef.current!==undefined)cancelAnimationFrame(animationRef.current);if(glRef.current)dispose(glRef.current,resourcesRef.current);},[]);

  const onContextCreate=useCallback((gl:GL)=>{
    try{
      glRef.current=gl;resourcesRef.current=resources(gl);setError(undefined);
      const render=()=>{if(!glRef.current||!resourcesRef.current)return;draw(glRef.current,resourcesRef.current,frameRef.current);animationRef.current=requestAnimationFrame(render);};
      render();
    }catch(reason){setError(reason instanceof Error?reason.message:'Native 3D renderer could not start.');}
  },[]);
  const onLayout=(event:LayoutChangeEvent)=>{const{width,height}=event.nativeEvent.layout;if(width>0&&height>0)setAspect(width/height);};

  return <View style={s.root} onLayout={onLayout}>
    <GLView style={s.gl} msaaSamples={4} onContextCreate={onContextCreate}/>
    <View pointerEvents="none" style={s.badge}><Text style={s.badgeTitle}>REAL 3D</Text><Text style={s.badgeText}>{frame.commands.length} scene parts · Same project geometry as desktop</Text></View>
    {error&&<View style={s.error}><Text style={s.errorTitle}>3D renderer error</Text><Text style={s.errorText}>{error}</Text></View>}
  </View>;
}

const s=StyleSheet.create({root:{flex:1,overflow:'hidden',backgroundColor:'#DCE3E0'},gl:{flex:1},badge:{position:'absolute',left:10,top:10,borderRadius:8,backgroundColor:'#17211FDD',paddingHorizontal:9,paddingVertical:6},badgeTitle:{fontSize:9,fontWeight:'900',color:'#8ED4BA'},badgeText:{fontSize:9,fontWeight:'700',color:'#E4ECE9',marginTop:1},error:{position:'absolute',left:12,right:12,bottom:12,borderWidth:1,borderColor:'#C57972',borderRadius:10,backgroundColor:'#472925EE',padding:10},errorTitle:{fontSize:12,fontWeight:'900',color:'#FFDAD5'},errorText:{fontSize:10,lineHeight:15,color:'#FFE9E6',marginTop:2}});
