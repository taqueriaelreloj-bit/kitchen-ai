import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, clampZoom, EditorObject, EditorProject, updateObject, View2DState } from '../domain/editor';

const GRID_SPACING_IN=12;
const PLAN_SCALE=.38;

type Props={project:EditorProject;apply:(project:EditorProject,record?:boolean)=>void};
type GestureStart={mode:'2d'|'3d';distance:number;centerX:number;centerY:number;view2d:View2DState;camera3d:Camera3DState};

const touchMetrics=(touches:readonly any[])=>{
  if(touches.length<2)return undefined;
  const a=touches[0],b=touches[1];
  return {distance:Math.max(1,Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY)),centerX:(a.pageX+b.pageX)/2,centerY:(a.pageY+b.pageY)/2};
};
const clampCameraDistance=(value:number)=>Math.max(180,Math.min(1100,value));
const snapValue=(value:number,enabled:boolean)=>enabled?Math.round(value/5)*5:value;

function DraggableObject({object,project,zoom,apply}:{object:EditorObject;project:EditorProject;zoom:number;apply:Props['apply']}){
  const [draft,setDraft]=useState({x:object.x,y:object.y});
  const draftRef=useRef(draft);
  const start=useRef({pageX:0,pageY:0,x:object.x,y:object.y,moved:false});
  useEffect(()=>{draftRef.current={x:object.x,y:object.y};setDraft({x:object.x,y:object.y});},[object.x,object.y]);
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:event=>event.nativeEvent.touches.length===1,
    onMoveShouldSetPanResponder:event=>event.nativeEvent.touches.length===1,
    onPanResponderGrant:event=>{const touch=event.nativeEvent.touches[0];start.current={pageX:touch.pageX,pageY:touch.pageY,x:object.x,y:object.y,moved:false};},
    onPanResponderMove:event=>{
      if(event.nativeEvent.touches.length!==1)return;
      const touch=event.nativeEvent.touches[0],dx=(touch.pageX-start.current.pageX)/Math.max(.25,zoom),dy=(touch.pageY-start.current.pageY)/Math.max(.25,zoom);
      if(Math.abs(dx)+Math.abs(dy)>.8)start.current.moved=true;
      const next={x:start.current.x+dx,y:start.current.y+dy};draftRef.current=next;setDraft(next);
    },
    onPanResponderRelease:()=>{
      if(!start.current.moved){apply({...project,selectedId:object.id},false);return;}
      const x=snapValue(draftRef.current.x,project.view2d.snap),y=snapValue(draftRef.current.y,project.view2d.snap);
      setDraft({x,y});draftRef.current={x,y};
      apply({...updateObject(project,object.id,{x,y}),selectedId:object.id});
    },
    onPanResponderTerminationRequest:event=>event.nativeEvent.touches.length>=2,
    onPanResponderTerminate:()=>{draftRef.current={x:object.x,y:object.y};setDraft({x:object.x,y:object.y});},
    onShouldBlockNativeResponder:()=>true,
  }),[object,project,zoom,apply]);
  const width=Math.max(18,object.widthIn*PLAN_SCALE),height=object.kind==='wall'?Math.max(5,object.depthIn*PLAN_SCALE):Math.max(12,object.depthIn*PLAN_SCALE);
  return <View accessibilityRole="button" accessibilityLabel={object.name} {...responder.panHandlers} style={[s.object,{left:draft.x,top:draft.y,width,height,backgroundColor:object.color??(object.kind==='window'?'#91C7DC':object.kind==='door'?'#8A664B':'#C7CECA'),transform:[{rotate:`${object.rotation}deg`}]},project.selectedId===object.id&&s.selected]}>
    <Text numberOfLines={1} style={s.objectLabel}>{object.name}</Text>
    {project.view2d.measurements&&<Text pointerEvents="none" style={s.dimension}>{Math.round(object.widthIn)} in × {Math.round(object.kind==='wall'?object.heightIn:object.depthIn)} in</Text>}
  </View>;
}

export function NativeWorkspace({project,apply}:Props){
  const [visual2d,setVisual2d]=useState(project.view2d),[visual3d,setVisual3d]=useState(project.camera3d);
  const visual2dRef=useRef<View2DState>(visual2d),visual3dRef=useRef<Camera3DState>(visual3d),start=useRef<GestureStart|undefined>(undefined),active=useRef(false);
  useEffect(()=>{if(!active.current){visual2dRef.current=project.view2d;visual3dRef.current=project.camera3d;setVisual2d(project.view2d);setVisual3d(project.camera3d);}},[project.view2d,project.camera3d]);
  const commitGesture=()=>{if(!active.current)return;active.current=false;start.current=undefined;if(project.viewMode==='2d')apply({...project,view2d:visual2dRef.current},false);else apply({...project,camera3d:visual3dRef.current},false);};
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponderCapture:event=>event.nativeEvent.touches.length>=2,
    onMoveShouldSetPanResponderCapture:event=>event.nativeEvent.touches.length>=2,
    onStartShouldSetPanResponder:event=>event.nativeEvent.touches.length>=2,
    onMoveShouldSetPanResponder:event=>event.nativeEvent.touches.length>=2,
    onPanResponderGrant:event=>{const metrics=touchMetrics(event.nativeEvent.touches);if(!metrics)return;active.current=true;start.current={mode:project.viewMode,...metrics,view2d:{...visual2dRef.current,pan:{...visual2dRef.current.pan}},camera3d:{...visual3dRef.current,target:{...visual3dRef.current.target}}};},
    onPanResponderMove:event=>{
      const initial=start.current,metrics=touchMetrics(event.nativeEvent.touches);if(!initial||!metrics)return;const ratio=metrics.distance/initial.distance;
      if(initial.mode==='2d'){
        const zoom=clampZoom(initial.view2d.zoom*ratio),worldX=(initial.centerX-initial.view2d.pan.x)/initial.view2d.zoom,worldY=(initial.centerY-initial.view2d.pan.y)/initial.view2d.zoom;
        const next:View2DState={...initial.view2d,zoom,pan:{x:metrics.centerX-worldX*zoom,y:metrics.centerY-worldY*zoom}};visual2dRef.current=next;setVisual2d(next);
      }else{
        const next:Camera3DState={...initial.camera3d,distance:clampCameraDistance(initial.camera3d.distance/ratio),target:{x:initial.camera3d.target.x-(metrics.centerX-initial.centerX)*.45,y:initial.camera3d.target.y+(metrics.centerY-initial.centerY)*.45}};visual3dRef.current=next;setVisual3d(next);
      }
    },
    onPanResponderRelease:commitGesture,onPanResponderTerminate:commitGesture,onShouldBlockNativeResponder:()=>true,
  }),[project,apply]);

  if(project.viewMode==='3d'){
    const scale=Math.max(.55,Math.min(1.35,520/visual3d.distance)),translateX=(220-visual3d.target.x)*.12,translateY=(170-visual3d.target.y)*.08;
    return <View accessibilityLabel="3D kitchen touch preview" style={s.workspace} {...responder.panHandlers}><View style={s.previewHeader}><Text style={s.previewTitle}>3D Project Preview</Text><Text style={s.gestureHint}>Pinch to zoom · Two-finger drag to pan</Text></View><View style={s.previewStage}><View style={[s.previewFloor,{transform:[{translateX},{translateY},{scale}]}]}>{project.objects.filter(object=>object.kind!=='wall').slice(0,28).map((object,index)=><Pressable key={object.id} accessibilityRole="button" accessibilityLabel={object.name} onPress={()=>apply({...project,selectedId:object.id},false)} style={[s.previewBlock,{width:Math.max(22,Math.min(88,object.widthIn)),height:Math.max(14,Math.min(70,object.heightIn*.52)),backgroundColor:object.color??'#D5D2CA',marginLeft:(index%4)*4},project.selectedId===object.id&&s.selected]}><Text numberOfLines={1} style={s.previewLabel}>{object.name}</Text></Pressable>)}</View></View></View>;
  }

  const gridLines=project.view2d.grid?Array.from({length:30},(_,index)=>index):[];
  return <Pressable accessibilityLabel="2D kitchen touch workspace" onPress={()=>apply({...project,selectedId:undefined},false)} style={s.workspace} {...responder.panHandlers}>
    <View pointerEvents="none" style={s.gestureBadge}><Text style={s.gestureBadgeText}>{Math.round(visual2d.zoom*100)}% · One-finger object drag · Pinch zoom · Two-finger pan</Text></View>
    <View style={[s.plan,{transform:[{translateX:visual2d.pan.x},{translateY:visual2d.pan.y},{scale:visual2d.zoom}]}]}>
      {gridLines.map(index=><View key={`v-${index}`} pointerEvents="none" style={[s.gridVertical,{left:index*GRID_SPACING_IN*PLAN_SCALE}]}/>)}
      {gridLines.map(index=><View key={`h-${index}`} pointerEvents="none" style={[s.gridHorizontal,{top:index*GRID_SPACING_IN*PLAN_SCALE}]}/>)}
      {project.objects.map(object=><DraggableObject key={object.id} object={object} project={project} zoom={visual2d.zoom} apply={apply}/>) }
    </View>
  </Pressable>;
}

const s=StyleSheet.create({workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},gestureBadge:{position:'absolute',zIndex:8,top:8,left:8,borderRadius:8,backgroundColor:'#17211FDD',paddingHorizontal:9,paddingVertical:6},gestureBadgeText:{color:'#F1F6F4',fontSize:10,fontWeight:'800'},plan:{position:'absolute',left:0,top:0,width:1000,height:760},gridVertical:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:'#B9C5C155'},gridHorizontal:{position:'absolute',left:0,right:0,height:1,backgroundColor:'#B9C5C155'},object:{position:'absolute',borderWidth:1,borderColor:'#596762',borderRadius:3,justifyContent:'center'},objectLabel:{fontSize:9,fontWeight:'800',paddingHorizontal:2,color:'#263530'},dimension:{position:'absolute',top:-15,minWidth:90,fontSize:8,fontWeight:'800',color:'#2E4C43'},selected:{borderWidth:3,borderColor:'#0B785A'},previewHeader:{paddingHorizontal:16,paddingTop:14,paddingBottom:8},previewTitle:{fontSize:20,fontWeight:'900',color:'#23312D'},gestureHint:{fontSize:12,color:'#5C6B66',marginTop:3},previewStage:{flex:1,padding:14},previewFloor:{flex:1,borderWidth:1,borderColor:'#9DAAA6',backgroundColor:'#CAD1CE',padding:12,flexDirection:'row',flexWrap:'wrap',alignContent:'flex-end'},previewBlock:{borderWidth:1,borderColor:'#5C6B66',margin:4,justifyContent:'center',padding:3},previewLabel:{fontSize:8,fontWeight:'800',color:'#263530'}});
