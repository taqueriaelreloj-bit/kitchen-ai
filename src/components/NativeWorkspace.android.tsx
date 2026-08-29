import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject } from '../domain/editor';
import { buildSceneBoxes, Box3D } from '../domain/geometry';
import {
  clampNativeCameraDistance,
  clampNativeCameraPitch,
  focusNativeCamera,
  projectSceneBoxes,
} from '../domain/nativeProjection';
import { NativeWorkspace as BaseWorkspace } from './NativeWorkspace.native';

type Props={project:EditorProject;apply:(project:EditorProject,record?:boolean)=>void};
type GestureStart={
  mode:'orbit'|'pinch';
  pageX:number;
  pageY:number;
  distance:number;
  centerX:number;
  centerY:number;
  camera:Camera3DState;
};

const touchMetrics=(touches:readonly any[])=>{
  if(touches.length<2)return undefined;
  const a=touches[0],b=touches[1];
  return{
    distance:Math.max(1,Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY)),
    centerX:(a.pageX+b.pageX)/2,
    centerY:(a.pageY+b.pageY)/2,
  };
};

const boxRadius=(kind:Box3D['kind'])=>kind==='hardware'||kind==='lighting'?5:kind==='fixture'?7:kind==='floor'?1:3;

export function NativeWorkspace({project,apply}:Props){
  if(project.viewMode==='2d')return <BaseWorkspace project={project} apply={apply}/>;
  return <NativeIsometricScene project={project} apply={apply}/>;
}

function NativeIsometricScene({project,apply}:Props){
  const[viewport,setViewport]=useState({width:360,height:520});
  const[visualCamera,setVisualCamera]=useState(project.camera3d);
  const cameraRef=useRef<Camera3DState>(visualCamera);
  const gestureStart=useRef<GestureStart|undefined>(undefined);
  const gestureActive=useRef(false);
  const boxes=useMemo(()=>buildSceneBoxes(project.objects),[project.objects]);
  const projected=useMemo(()=>projectSceneBoxes(boxes,visualCamera,viewport),[boxes,visualCamera,viewport]);
  const selected=useMemo(()=>project.objects.find(object=>object.id===project.selectedId),[project.objects,project.selectedId]);

  useEffect(()=>{
    if(!gestureActive.current){cameraRef.current=project.camera3d;setVisualCamera(project.camera3d);}
  },[project.camera3d]);

  const setCamera=(camera:Camera3DState)=>{cameraRef.current=camera;setVisualCamera(camera);};
  const commitCamera=()=>{
    if(!gestureActive.current)return;
    gestureActive.current=false;
    gestureStart.current=undefined;
    apply({...project,camera3d:cameraRef.current},false);
  };
  const startOrbit=(event:any,gesture:any)=>{
    const touch=event.nativeEvent.touches[0];
    gestureStart.current={mode:'orbit',pageX:gesture.x0??touch?.pageX??0,pageY:gesture.y0??touch?.pageY??0,distance:1,centerX:0,centerY:0,camera:{...cameraRef.current,target:{...cameraRef.current.target}}};
    gestureActive.current=true;
  };
  const startPinch=(touches:readonly any[])=>{
    const metrics=touchMetrics(touches);
    if(!metrics)return;
    gestureStart.current={mode:'pinch',pageX:0,pageY:0,...metrics,camera:{...cameraRef.current,target:{...cameraRef.current.target}}};
    gestureActive.current=true;
  };

  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponderCapture:event=>event.nativeEvent.touches.length>=2,
    onMoveShouldSetPanResponderCapture:(event,gesture)=>event.nativeEvent.touches.length>=2||Math.abs(gesture.dx)+Math.abs(gesture.dy)>5,
    onStartShouldSetPanResponder:event=>event.nativeEvent.touches.length>=2,
    onMoveShouldSetPanResponder:(event,gesture)=>event.nativeEvent.touches.length>=2||Math.abs(gesture.dx)+Math.abs(gesture.dy)>5,
    onPanResponderGrant:(event,gesture)=>event.nativeEvent.touches.length>=2?startPinch(event.nativeEvent.touches):startOrbit(event,gesture),
    onPanResponderMove:(event,gesture)=>{
      const touches=event.nativeEvent.touches;
      if(touches.length>=2){
        if(gestureStart.current?.mode!=='pinch')startPinch(touches);
        const start=gestureStart.current,metrics=touchMetrics(touches);
        if(!start||!metrics)return;
        const ratio=metrics.distance/start.distance;
        setCamera({
          ...start.camera,
          distance:clampNativeCameraDistance(start.camera.distance/ratio),
          target:{
            x:start.camera.target.x-(metrics.centerX-start.centerX)*.46,
            y:start.camera.target.y+(metrics.centerY-start.centerY)*.46,
          },
        });
        return;
      }
      if(gestureStart.current?.mode!=='orbit')startOrbit(event,gesture);
      const start=gestureStart.current;
      if(!start)return;
      setCamera({
        ...start.camera,
        yaw:start.camera.yaw+gesture.dx*.32,
        pitch:clampNativeCameraPitch(start.camera.pitch+gesture.dy*.22),
      });
    },
    onPanResponderRelease:commitCamera,
    onPanResponderTerminate:commitCamera,
    onPanResponderTerminationRequest:()=>false,
    onShouldBlockNativeResponder:()=>true,
  }),[project,apply]);

  const onLayout=(event:LayoutChangeEvent)=>{
    const{width,height}=event.nativeEvent.layout;
    if(width>0&&height>0)setViewport({width,height});
  };
  const select=(sourceId:string)=>apply({...project,selectedId:sourceId},false);
  const focus=(box:Box3D)=>{
    const camera=focusNativeCamera(cameraRef.current,box);
    setCamera(camera);
    apply({...project,selectedId:box.sourceId,camera3d:camera},false);
  };

  return <View accessibilityLabel="Interactive isometric 3D kitchen" style={s.workspace} onLayout={onLayout} {...responder.panHandlers}>
    <View pointerEvents="none" style={s.helpBadge}>
      <Text style={s.helpTitle}>3D Touch View</Text>
      <Text style={s.helpText}>Drag to orbit · Pinch zoom · Two-finger pan · Hold to focus</Text>
    </View>
    <View pointerEvents="none" style={s.cameraBadge}><Text style={s.cameraText}>{Math.round(visualCamera.distance)} · {Math.round(visualCamera.yaw)}° · {Math.round(visualCamera.pitch)}°</Text></View>
    {projected.slice(0,650).map((item,index)=>{
      const selectedPart=Boolean(item.sourceId&&item.sourceId===project.selectedId);
      const dynamic={
        left:item.x,
        top:item.y,
        width:item.width,
        height:item.height,
        backgroundColor:item.color,
        opacity:item.opacity,
        borderRadius:boxRadius(item.kind),
        borderWidth:selectedPart?3:item.kind==='floor'?1:1,
        borderColor:selectedPart?'#0B785A':item.kind==='floor'?'#A9B2AE':'#58655F66',
        transform:[{rotate:`${item.rotationDeg}deg`}],
        zIndex:index,
        elevation:item.kind==='floor'?0:Math.max(1,Math.round(1+item.metalness*3)),
      } as const;
      if(!item.sourceId)return <View pointerEvents="none" key={item.id} style={[s.box,dynamic]}/>;
      return <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={`Select ${project.objects.find(object=>object.id===item.sourceId)?.name??item.kind}`}
        onPress={()=>select(item.sourceId!)}
        onLongPress={()=>focus(item.source)}
        delayLongPress={420}
        style={[s.box,dynamic]}
      />;
    })}
    {selected&&<View pointerEvents="none" style={s.selectionBadge}><Text numberOfLines={1} style={s.selectionText}>{selected.name} · {Math.round(selected.widthIn)} × {Math.round(selected.depthIn)} × {Math.round(selected.heightIn)} in</Text></View>}
  </View>;
}

const s=StyleSheet.create({
  workspace:{flex:1,overflow:'hidden',backgroundColor:'#DCE3E0'},
  box:{position:'absolute',minWidth:2,minHeight:2},
  helpBadge:{position:'absolute',zIndex:2000,left:10,top:10,maxWidth:'72%',borderRadius:10,backgroundColor:'#17211FDD',paddingHorizontal:10,paddingVertical:8},
  helpTitle:{color:'#FFFFFF',fontSize:12,fontWeight:'900'},
  helpText:{color:'#D5E2DE',fontSize:9,lineHeight:14,marginTop:2},
  cameraBadge:{position:'absolute',zIndex:2000,right:10,top:10,borderRadius:8,backgroundColor:'#FFFFFFE8',paddingHorizontal:8,paddingVertical:6},
  cameraText:{fontSize:9,fontWeight:'900',color:'#34443E'},
  selectionBadge:{position:'absolute',zIndex:2000,left:10,right:10,bottom:10,minHeight:36,borderRadius:9,backgroundColor:'#F7FAF8EE',borderWidth:1,borderColor:'#6E9C8D',alignItems:'center',justifyContent:'center',paddingHorizontal:10},
  selectionText:{fontSize:11,fontWeight:'900',color:'#21483D',textAlign:'center'},
});
