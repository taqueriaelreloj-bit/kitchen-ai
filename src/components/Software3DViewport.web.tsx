import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject } from '../domain/editor';
import {
  Professional3DView,
  buildProfessional3DScene,
  professionalCameraForView,
  professionalViewLabel,
} from '../domain/professional3d';
import {
  Software3DFrame,
  SoftwareFace,
  buildSoftware3DFrame,
  pickSoftware3DSource,
} from '../domain/software3d';

const AnyCanvas='canvas' as any;
type DragState={
  x:number;
  y:number;
  start:Camera3DState;
  mode:'orbit'|'pan';
  active:boolean;
  moved:boolean;
};

const differentCamera=(a:Camera3DState,b:Camera3DState)=>
  Math.abs(a.distance-b.distance)>.01||Math.abs(a.yaw-b.yaw)>.01||Math.abs(a.pitch-b.pitch)>.01||
  Math.abs(a.target.x-b.target.x)>.01||Math.abs(a.target.y-b.target.y)>.01;

function polygonPath(context:CanvasRenderingContext2D,face:SoftwareFace){
  if(!face.points.length)return;
  context.beginPath();
  context.moveTo(face.points[0].x,face.points[0].y);
  for(let index=1;index<face.points.length;index++)context.lineTo(face.points[index].x,face.points[index].y);
  context.closePath();
}

function drawFace(context:CanvasRenderingContext2D,face:SoftwareFace){
  context.save();
  polygonPath(context,face);
  context.globalAlpha=face.opacity;
  context.fillStyle=face.color;
  context.fill();
  if(face.surface==='glass'){
    const gradient=context.createLinearGradient(
      face.points[0]?.x??0,face.points[0]?.y??0,
      face.points[2]?.x??0,face.points[2]?.y??0,
    );
    gradient.addColorStop(0,'rgba(255,255,255,.42)');
    gradient.addColorStop(.46,'rgba(175,218,232,.08)');
    gradient.addColorStop(1,'rgba(255,255,255,.18)');
    context.fillStyle=gradient;
    context.fill();
  }
  context.globalAlpha=Math.min(1,face.opacity+.18);
  context.lineJoin='round';
  context.lineWidth=face.selected?3.2:face.surface==='wall'?1.05:.7;
  context.strokeStyle=face.selected?'#0B9B68':face.surface==='wall'?'rgba(76,89,85,.38)':'rgba(45,57,53,.28)';
  context.stroke();
  if(face.selected){
    context.globalAlpha=.25;
    context.lineWidth=8;
    context.strokeStyle='#50D3A4';
    context.stroke();
  }
  context.restore();
}

function drawFrame(context:CanvasRenderingContext2D,frame:Software3DFrame,width:number,height:number,dpr:number){
  context.setTransform(dpr,0,0,dpr,0,0);
  context.clearRect(0,0,width,height);
  const sky=context.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,'#AFC9D8');
  sky.addColorStop(.5,'#D7E1E2');
  sky.addColorStop(1,'#C4CFCD');
  context.fillStyle=sky;
  context.fillRect(0,0,width,height);

  const base=frame.faces.filter(face=>face.surface==='site-grid'||face.surface==='platform'||face.surface==='wood-floor');
  const content=frame.faces.filter(face=>face.surface!=='site-grid'&&face.surface!=='platform'&&face.surface!=='wood-floor');
  base.forEach(face=>drawFace(context,face));
  for(const line of frame.lines){
    context.save();
    context.beginPath();
    context.moveTo(line.a.x,line.a.y);
    context.lineTo(line.b.x,line.b.y);
    context.globalAlpha=line.opacity;
    context.lineWidth=line.width;
    context.strokeStyle=line.color;
    context.stroke();
    context.restore();
  }
  content.forEach(face=>drawFace(context,face));

  const vignette=context.createRadialGradient(width*.5,height*.42,Math.min(width,height)*.18,width*.5,height*.48,Math.max(width,height)*.76);
  vignette.addColorStop(.55,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(22,38,43,.15)');
  context.fillStyle=vignette;
  context.fillRect(0,0,width,height);
}

function ViewButton({label,icon,active,onPress}:{label:string;icon:string;active?:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[styles.viewButton,active&&styles.viewButtonActive]}>
    <Text style={[styles.viewIcon,active&&styles.viewIconActive]}>{icon}</Text>
    <Text style={[styles.viewButtonText,active&&styles.viewButtonTextActive]}>{label}</Text>
  </Pressable>;
}

export function Software3DViewport({project,preview}:{project:EditorProject;preview:(project:EditorProject)=>void}){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const cameraRef=useRef(project.camera3d);
  const frameRef=useRef<Software3DFrame|undefined>(undefined);
  const drag=useRef<DragState>({x:0,y:0,start:project.camera3d,mode:'orbit',active:false,moved:false});
  const wheelTimer=useRef<number|undefined>(undefined);
  const autoFramed=useRef(false);
  const[camera,setCamera]=useState(project.camera3d);
  const[viewport,setViewport]=useState({width:1,height:1});
  const[view,setView]=useState<Professional3DView>('dollhouse');
  const[hoveredId,setHoveredId]=useState<string|undefined>(undefined);
  const[pointer,setPointer]=useState({x:0,y:0});
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
    const animationFrame=window.requestAnimationFrame(measure);
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(measure);
      observer.observe(canvas);
      return()=>{window.cancelAnimationFrame(animationFrame);observer.disconnect();};
    }
    window.addEventListener('resize',measure);
    return()=>{window.cancelAnimationFrame(animationFrame);window.removeEventListener('resize',measure);};
  },[]);

  useEffect(()=>{
    if(autoFramed.current||viewport.width<200||viewport.height<180)return;
    autoFramed.current=true;
    const next=professionalCameraForView(project,'dollhouse',viewport);
    setLocalCamera(next);
    preview({...project,camera3d:next});
  },[viewport.width,viewport.height]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas||viewport.width<2||viewport.height<2)return;
    const context=canvas.getContext('2d');
    if(!context)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(viewport.width*dpr);
    canvas.height=Math.floor(viewport.height*dpr);
    const frame=buildSoftware3DFrame(scene,camera,view,viewport,project.selectedId);
    frameRef.current=frame;
    drawFrame(context,frame,viewport.width,viewport.height,dpr);
  },[scene,camera,view,viewport,project.selectedId]);

  useEffect(()=>()=>{
    if(wheelTimer.current)window.clearTimeout(wheelTimer.current);
  },[]);

  const pointForEvent=(event:any)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    return{x:event.clientX-rect.left,y:event.clientY-rect.top};
  };
  const pick=(event:any)=>{
    const point=pointForEvent(event);
    return frameRef.current?pickSoftware3DSource(frameRef.current,point.x,point.y):undefined;
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
    commitCamera(next);
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
    const point=pointForEvent(event);
    setPointer(point);
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

  return <View style={styles.root}>
    <AnyCanvas
      ref={canvasRef}
      aria-label="Professional compatible 3D kitchen designer"
      style={{width:'100%',height:'100%',display:'block',cursor:drag.current.active?'grabbing':hoveredId?'pointer':'grab'}}
      onContextMenu={(event:any)=>event.preventDefault()}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={()=>{if(drag.current.active)commitCamera();drag.current.active=false;setHoveredId(undefined);}}
      onDoubleClick={handleDoubleClick}
    />

    <View pointerEvents="none" style={styles.areaBadge}>
      <Text style={styles.areaText}>{scene.areaSqFt} ft² · {professionalViewLabel(view)} · Compatible 3D</Text>
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

    {hovered&&!drag.current.active&&<View pointerEvents="none" style={[styles.hoverCard,{left:Math.max(8,Math.min(viewport.width-230,pointer.x+14)),top:Math.max(8,Math.min(viewport.height-74,pointer.y+14))}]}>
      <Text numberOfLines={1} style={styles.hoverName}>{hovered.name}</Text>
      <Text style={styles.hoverSize}>{hovered.widthIn}″ × {hovered.depthIn}″ × {hovered.heightIn}″</Text>
    </View>}
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,minHeight:0,position:'relative',overflow:'hidden',backgroundColor:'#C6D3D8'},
  areaBadge:{position:'absolute',top:12,left:'37%',borderRadius:999,backgroundColor:'rgba(18,31,37,.82)',paddingHorizontal:13,paddingVertical:7},
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
});
