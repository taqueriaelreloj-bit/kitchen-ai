import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { clampZoom, EditorProject, View2DState } from '../domain/editor';

type Props={project:EditorProject;apply:(project:EditorProject,record?:boolean)=>void};
type GestureState={mode:'none'|'pan'|'pinch';startPan:{x:number;y:number};startZoom:number;startDistance:number;startMid:{x:number;y:number}};
const midpoint=(touches:any[])=>({x:(touches[0].pageX+touches[1].pageX)/2,y:(touches[0].pageY+touches[1].pageY)/2});
const distance=(touches:any[])=>Math.hypot(touches[1].pageX-touches[0].pageX,touches[1].pageY-touches[0].pageY);

export function NativeWorkspace({project,apply}:Props){
  const[view,setView]=useState<View2DState>(project.view2d),viewRef=useRef<View2DState>(project.view2d);
  const gesture=useRef<GestureState>({mode:'none',startPan:{x:0,y:0},startZoom:1,startDistance:1,startMid:{x:0,y:0}});
  useEffect(()=>{viewRef.current=project.view2d;setView(project.view2d);},[project.view2d]);
  const setLocal=(next:View2DState)=>{viewRef.current=next;setView(next);};
  const beginPinch=(touches:any[])=>{gesture.current={mode:'pinch',startPan:{...viewRef.current.pan},startZoom:viewRef.current.zoom,startDistance:Math.max(1,distance(touches)),startMid:midpoint(touches)};};
  const commit=()=>{if(gesture.current.mode!=='none')apply({...project,view2d:viewRef.current},false);gesture.current={...gesture.current,mode:'none'};};
  const panResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(event,state)=>event.nativeEvent.touches.length>=2||Math.abs(state.dx)+Math.abs(state.dy)>5,
    onPanResponderGrant:(event)=>{const touches=event.nativeEvent.touches;if(touches.length>=2)beginPinch(touches);else gesture.current={mode:'pan',startPan:{...viewRef.current.pan},startZoom:viewRef.current.zoom,startDistance:1,startMid:{x:0,y:0}};},
    onPanResponderMove:(event,state)=>{const touches=event.nativeEvent.touches;if(touches.length>=2){if(gesture.current.mode!=='pinch')beginPinch(touches);const currentMid=midpoint(touches),nextZoom=clampZoom(gesture.current.startZoom*(distance(touches)/gesture.current.startDistance)),ratio=nextZoom/gesture.current.startZoom;setLocal({...viewRef.current,zoom:nextZoom,pan:{x:currentMid.x-(gesture.current.startMid.x-gesture.current.startPan.x)*ratio,y:currentMid.y-(gesture.current.startMid.y-gesture.current.startPan.y)*ratio}});return;}if(gesture.current.mode!=='pan')gesture.current={mode:'pan',startPan:{...viewRef.current.pan},startZoom:viewRef.current.zoom,startDistance:1,startMid:{x:0,y:0}};setLocal({...viewRef.current,pan:{x:gesture.current.startPan.x+state.dx,y:gesture.current.startPan.y+state.dy}});},
    onPanResponderRelease:commit,onPanResponderTerminate:commit,onPanResponderTerminationRequest:()=>true,
  }),[project,apply]);
  if(project.viewMode==='3d')return <View style={s.workspace}><View style={s.native3d}><Text style={s.native3dTitle}>3D Project Preview</Text><Text style={s.help}>This device keeps the complete shared 3D project, including AI layouts and lighting. Desktop web uses the full WebGL renderer.</Text><View style={s.previewFloor}>{project.objects.filter(object=>object.kind!=='wall').slice(0,18).map((object,index)=><View key={object.id} style={[s.previewBlock,{width:Math.max(24,Math.min(90,object.widthIn)),height:Math.max(18,Math.min(65,object.heightIn*.55)),backgroundColor:object.color??'#D5D2CA',marginLeft:(index%3)*8}]}><Text numberOfLines={1} style={s.previewLabel}>{object.name}</Text></View>)}</View></View></View>;
  return <View accessibilityLabel="Touch 2D kitchen workspace" style={s.workspace} {...panResponder.panHandlers}><View style={[s.plan,{transform:[{translateX:view.pan.x},{translateY:view.pan.y},{scale:view.zoom}]}]}>{project.objects.map(object=><Pressable key={object.id} onPress={()=>apply({...project,selectedId:object.id},false)} style={[s.object,{left:object.x,top:object.y,width:Math.max(18,object.widthIn*.38),height:object.kind==='wall'?Math.max(5,object.depthIn*.38):Math.max(12,object.depthIn*.38),backgroundColor:object.color??'#C8CFCC',transform:[{rotate:`${object.rotation}deg`}]},project.selectedId===object.id&&s.selected]}><Text numberOfLines={1} style={s.objectLabel}>{object.name}</Text></Pressable>)}</View><View pointerEvents="none" style={s.touchHint}><Text style={s.touchHintText}>Pinch to zoom · Drag empty space to pan</Text></View></View>;
}

const s=StyleSheet.create({workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},plan:{position:'absolute',left:0,top:0,width:900,height:650},object:{position:'absolute',borderWidth:1,borderColor:'#596762',borderRadius:3,justifyContent:'center'},objectLabel:{fontSize:9,fontWeight:'700',paddingHorizontal:2},selected:{borderWidth:3,borderColor:'#0B785A'},touchHint:{position:'absolute',left:10,bottom:10,backgroundColor:'#17211FCC',borderRadius:8,paddingHorizontal:9,paddingVertical:5},touchHintText:{fontSize:10,color:'#E6EFEC',fontWeight:'700'},help:{fontSize:13,lineHeight:19,color:'#5C6B66'},native3d:{flex:1,padding:18,backgroundColor:'#DCE3E0'},native3dTitle:{fontSize:22,fontWeight:'900',color:'#23312D',marginBottom:6},previewFloor:{flex:1,marginTop:16,borderWidth:1,borderColor:'#9DAAA6',backgroundColor:'#CAD1CE',padding:12,flexDirection:'row',flexWrap:'wrap',alignContent:'flex-end'},previewBlock:{borderWidth:1,borderColor:'#5C6B66',margin:4,justifyContent:'center',padding:3},previewLabel:{fontSize:8,fontWeight:'700'}});
