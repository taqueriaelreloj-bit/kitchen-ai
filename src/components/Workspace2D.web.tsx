import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  KITCHEN_CATALOG_DRAG_MIME,
  addDragCatalogItemAtPlanPoint,
  parseDragCatalogItem,
  workspaceClientPointToPlan,
} from '../domain/dragCatalog';
import { clampZoom, EditorProject } from '../domain/editor';
import { createObjectDragOrigin, moveObjectByPlanDelta, OBJECT_SNAP_IN, ObjectDragOrigin } from '../domain/objectMovement';
import { PLAN_DISPLAY_SCALE, planInchesToDisplay } from '../domain/viewFitting';
import { GasRangePlanGraphic } from './GasRangePlanGraphic';

const AnyView=View as any;
const AnyPressable=Pressable as any;
type DragState={id:string;x:number;y:number;active:boolean;moved:boolean;origin?:ObjectDragOrigin;start?:EditorProject};
type Apply=(project:EditorProject,record?:boolean)=>void;
const GRID_IN=12;
const formatInches=(value:number)=>{const feet=Math.floor(value/12),inches=Math.round((value-feet*12)*10)/10;return feet>0?`${feet}' ${inches>0?`${inches}\"`:''}`:`${inches}\"`;};
const hasCatalogDrag=(event:any)=>Array.from(event.dataTransfer?.types??[]).includes(KITCHEN_CATALOG_DRAG_MIME);

export function Workspace2D({project,preview,apply,commitHistory}:{project:EditorProject;preview:(project:EditorProject)=>void;apply:Apply;commitHistory:(snapshot:EditorProject,finalProject:EditorProject)=>void}){
  const pan=useRef({x:0,y:0,panX:0,panY:0,active:false});
  const move=useRef<DragState>({id:'',x:0,y:0,active:false,moved:false});
  const spaceHeld=useRef(false);
  const catalogDragDepth=useRef(0);
  const[dropActive,setDropActive]=useState(false);
  const finishMove=()=>{const state=move.current;if(state.active&&state.moved&&state.start)commitHistory(state.start,project);move.current={id:'',x:0,y:0,active:false,moved:false};};
  const resetCatalogDrop=()=>{catalogDragDepth.current=0;setDropActive(false);};
  const webProps={
    tabIndex:0,
    onKeyDown:(event:any)=>{if(event.code==='Space'){spaceHeld.current=true;event.preventDefault();}},
    onKeyUp:(event:any)=>{if(event.code==='Space')spaceHeld.current=false;},
    onBlur:()=>{spaceHeld.current=false;pan.current.active=false;finishMove();resetCatalogDrop();},
    onWheel:(event:any)=>{event.preventDefault();const old=project.view2d.zoom,next=clampZoom(old+(event.deltaY<0?.08:-.08));if(next===old)return;const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,ratio=next/old;preview({...project,view2d:{...project.view2d,zoom:next,pan:{x:x-(x-project.view2d.pan.x)*ratio,y:y-(y-project.view2d.pan.y)*ratio}}});},
    onMouseDown:(event:any)=>{if(event.button===1||(event.button===0&&spaceHeld.current)){pan.current={x:event.clientX,y:event.clientY,panX:project.view2d.pan.x,panY:project.view2d.pan.y,active:true};event.preventDefault();}},
    onMouseMove:(event:any)=>{if(pan.current.active){preview({...project,view2d:{...project.view2d,pan:{x:pan.current.panX+event.clientX-pan.current.x,y:pan.current.panY+event.clientY-pan.current.y}}});return;}if(!move.current.active||!move.current.origin)return;const displayDx=(event.clientX-move.current.x)/project.view2d.zoom,displayDy=(event.clientY-move.current.y)/project.view2d.zoom,dx=displayDx/PLAN_DISPLAY_SCALE,dy=displayDy/PLAN_DISPLAY_SCALE;if(Math.abs(dx)+Math.abs(dy)>.5)move.current.moved=true;preview(moveObjectByPlanDelta(project,move.current.origin,dx,dy));},
    onMouseUp:()=>{pan.current.active=false;finishMove();},
    onMouseLeave:()=>{pan.current.active=false;finishMove();},
    onContextMenu:(event:any)=>event.preventDefault(),
    onDragEnter:(event:any)=>{if(!hasCatalogDrag(event))return;event.preventDefault();catalogDragDepth.current+=1;setDropActive(true);},
    onDragOver:(event:any)=>{if(!hasCatalogDrag(event))return;event.preventDefault();event.dataTransfer.dropEffect='copy';if(!dropActive)setDropActive(true);},
    onDragLeave:(event:any)=>{if(!hasCatalogDrag(event))return;catalogDragDepth.current=Math.max(0,catalogDragDepth.current-1);if(catalogDragDepth.current===0)setDropActive(false);},
    onDrop:(event:any)=>{const serialized=event.dataTransfer?.getData(KITCHEN_CATALOG_DRAG_MIME)||event.dataTransfer?.getData('text/plain');const item=parseDragCatalogItem(serialized);resetCatalogDrop();if(!item)return;event.preventDefault();event.stopPropagation();const rect=event.currentTarget.getBoundingClientRect();const point=workspaceClientPointToPlan(project,{x:event.clientX,y:event.clientY},{x:rect.left,y:rect.top});apply(addDragCatalogItemAtPlanPoint(project,item.id,point));},
  };
  const gridStyle=project.view2d.grid?({backgroundImage:'linear-gradient(to right, rgba(69,92,84,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(69,92,84,.14) 1px, transparent 1px)',backgroundSize:`${GRID_IN*PLAN_DISPLAY_SCALE}px ${GRID_IN*PLAN_DISPLAY_SCALE}px`} as any):undefined;
  return <AnyView accessibilityLabel="2D kitchen workspace" accessibilityHint="Drag catalog items here to place them" style={[s.workspace,gridStyle,dropActive&&s.workspaceDropActive]} {...webProps} onClick={(event:any)=>{if(event.target===event.currentTarget)preview({...project,selectedId:undefined});}}>
    <View style={[s.plan,{transform:[{translateX:project.view2d.pan.x},{translateY:project.view2d.pan.y},{scale:project.view2d.zoom}]}]}>{project.objects.map(object=>{const width=Math.max(10,planInchesToDisplay(object.widthIn)),depth=object.kind==='wall'?Math.max(4,planInchesToDisplay(object.depthIn)):Math.max(8,planInchesToDisplay(object.depthIn));return <AnyPressable key={object.id} accessibilityRole="button" accessibilityLabel={`${object.name}, ${formatInches(object.widthIn)} by ${formatInches(object.depthIn)}`} onPress={()=>preview({...project,selectedId:object.id})} onMouseDown={(event:any)=>{if(event.button!==0||spaceHeld.current)return;event.stopPropagation();move.current={id:object.id,x:event.clientX,y:event.clientY,origin:createObjectDragOrigin(project,object.id),active:true,moved:false,start:project};preview({...project,selectedId:object.id});}} style={[s.object,{left:planInchesToDisplay(object.x),top:planInchesToDisplay(object.y),width,height:depth,backgroundColor:object.color??(object.kind==='window'?'#91C7DC':object.kind==='door'?'#8A664B':'#C7CECA'),transform:[{rotate:`${object.rotation}deg`}]},project.selectedId===object.id&&s.selected]}><GasRangePlanGraphic object={object}/><Text numberOfLines={1} style={s.label}>{object.name}</Text>{project.view2d.measurements&&<View pointerEvents="none" style={[s.measureWrap,{top:depth+4,minWidth:Math.max(72,width)}]}><View style={s.dimensionLine}/><Text style={s.measureText}>{object.kind==='wall'?formatInches(object.widthIn):`${formatInches(object.widthIn)} × ${formatInches(object.depthIn)}`}</Text></View>}</AnyPressable>;})}</View>
    {dropActive&&<View pointerEvents="none" style={s.dropOverlay}><View style={s.dropMessage}><Text style={s.dropIcon}>＋</Text><Text style={s.dropTitle}>Release to place item</Text><Text style={s.dropHelp}>The object will use real dimensions, snapping and Undo/Redo.</Text></View></View>}
    {project.view2d.grid&&<View pointerEvents="none" style={s.scaleBadge}><Text style={s.scaleText}>Grid 12 in · Snap {project.view2d.snap?`${OBJECT_SNAP_IN} in`:'Off'}</Text></View>}
  </AnyView>;
}
const s=StyleSheet.create({workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5',borderWidth:0,borderColor:'transparent'},workspaceDropActive:{borderWidth:3,borderColor:'#1B8A68',backgroundColor:'#DDEBE6'},plan:{position:'absolute',left:0,top:0,width:1800,height:1400},object:{position:'absolute',borderWidth:1,borderColor:'#596762',borderRadius:3,justifyContent:'center'},label:{fontSize:9,fontWeight:'700',paddingHorizontal:2},selected:{borderWidth:3,borderColor:'#0B785A'},measureWrap:{position:'absolute',left:0,alignItems:'center'},dimensionLine:{height:1,width:'100%',backgroundColor:'#315F55'},measureText:{fontSize:9,fontWeight:'900',color:'#24453C',backgroundColor:'rgba(244,248,246,.92)',paddingHorizontal:4,paddingVertical:2,borderRadius:3,marginTop:2},dropOverlay:{...StyleSheet.absoluteFill,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(35,79,66,.12)',zIndex:80},dropMessage:{minWidth:280,maxWidth:430,borderRadius:14,borderWidth:2,borderColor:'#2C8B6E',backgroundColor:'rgba(247,252,250,.96)',paddingHorizontal:22,paddingVertical:18,alignItems:'center',shadowColor:'#000',shadowOpacity:.2,shadowRadius:12,shadowOffset:{width:0,height:6}},dropIcon:{fontSize:30,fontWeight:'300',color:'#17664F'},dropTitle:{fontSize:17,fontWeight:'900',color:'#173F34',marginTop:2},dropHelp:{fontSize:11,lineHeight:16,textAlign:'center',color:'#5A6E67',marginTop:4},scaleBadge:{position:'absolute',right:12,bottom:12,backgroundColor:'rgba(23,33,31,.88)',paddingHorizontal:9,paddingVertical:6,borderRadius:6},scaleText:{fontSize:10,fontWeight:'800',color:'#E7F0ED'}});
