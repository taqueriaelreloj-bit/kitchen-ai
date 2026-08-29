import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useRef, useState } from 'react';
import { clampZoom, EditorObject, EditorProject, updateObject } from '../domain/editor';
import { attachOpening, moveOpeningAlongWall, openingData, openingsForWall } from '../domain/openings';
import { resizeObject, ResizeHandle, rotateObjectTowardPoint } from '../domain/objectTransform';
import { AlignmentGuide, guideExtent, snapPlanObject } from '../domain/planSnap';
import { PLAN_DISPLAY_SCALE } from '../domain/viewFitting';
import { GasRangePlanGraphic } from './GasRangePlanGraphic';

const AnyView=View as any;
const AnyPressable=Pressable as any;
const AnyHandle=View as any;
const GRID_IN=12;
const HANDLE_SIZE=9;

type Props={
  project:EditorProject;
  preview:(project:EditorProject)=>void;
  commitHistory:(snapshot:EditorProject,finalProject:EditorProject)=>void;
};
type PanState={x:number;y:number;panX:number;panY:number;active:boolean};
type Interaction={
  mode:'move'|'resize'|'rotate';
  id:string;
  clientX:number;
  clientY:number;
  object:EditorObject;
  openingOffset:number;
  handle?:ResizeHandle;
  snapshot:EditorProject;
  active:boolean;
  moved:boolean;
};

const emptyInteraction=():Interaction=>({mode:'move',id:'',clientX:0,clientY:0,object:{} as EditorObject,openingOffset:0,snapshot:{} as EditorProject,active:false,moved:false});
const objectDepth=(object:EditorObject)=>Math.max(object.kind==='wall'?2:.75,object.depthIn);
const objectPlanSize=(object:EditorObject)=>({width:Math.max(4,object.widthIn*PLAN_DISPLAY_SCALE),height:Math.max(object.kind==='wall'?2:4,objectDepth(object)*PLAN_DISPLAY_SCALE)});
const formatInches=(value:number)=>{const feet=Math.floor(value/12),inches=Math.round((value-feet*12)*10)/10;return feet>0?`${feet}' ${inches>0?`${inches}\"`:''}`:`${inches}\"`;};

const handlePositions:Record<ResizeHandle,Record<string,unknown>>={
  nw:{left:-HANDLE_SIZE/2,top:-HANDLE_SIZE/2},
  n:{left:'50%',top:-HANDLE_SIZE/2,marginLeft:-HANDLE_SIZE/2},
  ne:{right:-HANDLE_SIZE/2,top:-HANDLE_SIZE/2},
  e:{right:-HANDLE_SIZE/2,top:'50%',marginTop:-HANDLE_SIZE/2},
  se:{right:-HANDLE_SIZE/2,bottom:-HANDLE_SIZE/2},
  s:{left:'50%',bottom:-HANDLE_SIZE/2,marginLeft:-HANDLE_SIZE/2},
  sw:{left:-HANDLE_SIZE/2,bottom:-HANDLE_SIZE/2},
  w:{left:-HANDLE_SIZE/2,top:'50%',marginTop:-HANDLE_SIZE/2},
};

function cloneObject(object:EditorObject):EditorObject{
  return{
    ...object,
    toeKick:object.toeKick?{...object.toeKick}:undefined,
    hardware:object.hardware?{...object.hardware}:undefined,
  };
}

function clampAttachedOpenings(project:EditorProject,wallId:string){
  let next=project;
  const wall=next.objects.find(object=>object.id===wallId&&object.kind==='wall');
  if(!wall)return next;
  for(const opening of openingsForWall(next.objects,wallId)){
    const offset=Math.max(0,Math.min(wall.widthIn-opening.widthIn,openingData(opening).wallOffsetIn??0));
    next=attachOpening(next,opening.id,wall.id,offset);
  }
  return next;
}

export function Workspace2D({project,preview,commitHistory}:Props){
  const pan=useRef<PanState>({x:0,y:0,panX:0,panY:0,active:false});
  const interaction=useRef<Interaction>(emptyInteraction());
  const spaceHeld=useRef(false);
  const rootRef=useRef<any>(null);
  const[guides,setGuides]=useState<AlignmentGuide[]>([]);
  const selected=project.objects.find(object=>object.id===project.selectedId);

  const planExtent=useMemo(()=>{
    const right=Math.max(project.room.widthM*39.3701,...project.objects.map(object=>object.x+object.widthIn),600)+96;
    const bottom=Math.max(project.room.lengthM*39.3701,...project.objects.map(object=>object.y+object.depthIn),480)+96;
    return{widthIn:right,heightIn:bottom};
  },[project.room,project.objects]);
  const gridVertical=project.view2d.grid?Array.from({length:Math.ceil(planExtent.widthIn/GRID_IN)+1},(_,index)=>index):[];
  const gridHorizontal=project.view2d.grid?Array.from({length:Math.ceil(planExtent.heightIn/GRID_IN)+1},(_,index)=>index):[];
  const verticalExtent=guideExtent(project.objects,'x'),horizontalExtent=guideExtent(project.objects,'y');

  const finishInteraction=()=>{
    const state=interaction.current;
    if(state.active&&state.moved)commitHistory(state.snapshot,project);
    interaction.current=emptyInteraction();
    setGuides([]);
  };

  const begin=(event:any,object:EditorObject,mode:Interaction['mode'],handle?:ResizeHandle)=>{
    event.preventDefault();event.stopPropagation();
    interaction.current={
      mode,
      id:object.id,
      clientX:event.clientX,
      clientY:event.clientY,
      object:cloneObject(object),
      openingOffset:openingData(object).wallOffsetIn??0,
      handle,
      snapshot:project,
      active:true,
      moved:false,
    };
    preview({...project,selectedId:object.id});
  };

  const worldPointer=(event:any)=>{
    const element=rootRef.current as HTMLElement|undefined;
    if(!element)return{x:0,y:0};
    const rect=element.getBoundingClientRect();
    return{
      x:(event.clientX-rect.left-project.view2d.pan.x)/(project.view2d.zoom*PLAN_DISPLAY_SCALE),
      y:(event.clientY-rect.top-project.view2d.pan.y)/(project.view2d.zoom*PLAN_DISPLAY_SCALE),
    };
  };

  const onMouseMove=(event:any)=>{
    if(pan.current.active){
      preview({...project,view2d:{...project.view2d,pan:{x:pan.current.panX+event.clientX-pan.current.x,y:pan.current.panY+event.clientY-pan.current.y}}});
      return;
    }
    const state=interaction.current;
    if(!state.active)return;
    const deltaScreen={x:event.clientX-state.clientX,y:event.clientY-state.clientY};
    const deltaWorld={x:deltaScreen.x/(project.view2d.zoom*PLAN_DISPLAY_SCALE),y:deltaScreen.y/(project.view2d.zoom*PLAN_DISPLAY_SCALE)};
    if(Math.abs(deltaScreen.x)+Math.abs(deltaScreen.y)>3)state.moved=true;

    if(state.mode==='move'){
      const data=openingData(state.object),parent=data.parentWallId?project.objects.find(object=>object.id===data.parentWallId&&object.kind==='wall'):undefined;
      if(parent&&(state.object.kind==='door'||state.object.kind==='window')){
        const angle=parent.rotation*Math.PI/180,along=deltaWorld.x*Math.cos(angle)+deltaWorld.y*Math.sin(angle);
        setGuides([]);
        preview(moveOpeningAlongWall(project,state.object.id,state.openingOffset+along));
        return;
      }
      const snapped=snapPlanObject(state.object,{x:state.object.x+deltaWorld.x,y:state.object.y+deltaWorld.y},project.objects,{grid:project.view2d.snap,gridSizeIn:5,alignment:project.view2d.snap,toleranceIn:3.5});
      setGuides(snapped.guides);
      preview(updateObject(project,state.object.id,{x:snapped.x,y:snapped.y}));
      return;
    }

    if(state.mode==='resize'&&state.handle){
      const resized=resizeObject(state.object,state.handle,deltaWorld,{minWidthIn:3,minDepthIn:1,snapIncrementIn:project.view2d.snap?1:undefined});
      let next=updateObject(project,state.object.id,{x:resized.x,y:resized.y,widthIn:resized.widthIn,depthIn:resized.depthIn});
      if(state.object.kind==='wall')next=clampAttachedOpenings(next,state.object.id);
      const parentId=openingData(state.object).parentWallId;
      if(parentId&&(state.object.kind==='door'||state.object.kind==='window'))next=attachOpening(next,state.object.id,parentId,state.openingOffset);
      preview(next);
      return;
    }

    if(state.mode==='rotate'){
      const rotated=rotateObjectTowardPoint(state.object,worldPointer(event),project.view2d.snap?15:1);
      let next=updateObject(project,state.object.id,{rotation:rotated.rotation});
      if(state.object.kind==='wall')next=clampAttachedOpenings(next,state.object.id);
      preview(next);
    }
  };

  const onWheel=(event:any)=>{
    event.preventDefault();
    const trackpadPan=!event.ctrlKey&&(Math.abs(event.deltaX)>1||Math.abs(event.deltaY)<40);
    if(trackpadPan){
      preview({...project,view2d:{...project.view2d,pan:{x:project.view2d.pan.x-event.deltaX,y:project.view2d.pan.y-event.deltaY}}});
      return;
    }
    const old=project.view2d.zoom,next=clampZoom(old+(event.deltaY<0?.08:-.08));
    if(next===old)return;
    const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,ratio=next/old;
    preview({...project,view2d:{...project.view2d,zoom:next,pan:{x:x-(x-project.view2d.pan.x)*ratio,y:y-(y-project.view2d.pan.y)*ratio}}});
  };

  const webProps={
    ref:rootRef,
    tabIndex:0,
    onKeyDown:(event:any)=>{if(event.code==='Space'){spaceHeld.current=true;event.preventDefault();}},
    onKeyUp:(event:any)=>{if(event.code==='Space')spaceHeld.current=false;},
    onBlur:()=>{spaceHeld.current=false;pan.current.active=false;finishInteraction();},
    onWheel,
    onMouseDown:(event:any)=>{
      if(event.button===1||(event.button===0&&spaceHeld.current)){
        pan.current={x:event.clientX,y:event.clientY,panX:project.view2d.pan.x,panY:project.view2d.pan.y,active:true};
        event.preventDefault();
      }
    },
    onMouseMove,
    onMouseUp:()=>{pan.current.active=false;finishInteraction();},
    onMouseLeave:()=>{pan.current.active=false;finishInteraction();},
    onContextMenu:(event:any)=>event.preventDefault(),
    onClick:(event:any)=>{const target=event.target as HTMLElement;if(!target.closest?.('[data-plan-object="true"]'))preview({...project,selectedId:undefined});},
  };

  return <AnyView accessibilityLabel="Professional 2D kitchen workspace" style={s.workspace} {...webProps}>
    <View style={[s.plan,{width:planExtent.widthIn*PLAN_DISPLAY_SCALE,height:planExtent.heightIn*PLAN_DISPLAY_SCALE,transform:[{translateX:project.view2d.pan.x},{translateY:project.view2d.pan.y},{scale:project.view2d.zoom}]}]}>
      {gridVertical.map(index=><View pointerEvents="none" key={`grid-v-${index}`} style={[s.gridVertical,{left:index*GRID_IN*PLAN_DISPLAY_SCALE}]}/>) }
      {gridHorizontal.map(index=><View pointerEvents="none" key={`grid-h-${index}`} style={[s.gridHorizontal,{top:index*GRID_IN*PLAN_DISPLAY_SCALE}]}/>) }
      {guides.map((guide,index)=>guide.axis==='x'
        ?<View pointerEvents="none" key={`guide-${index}`} style={[s.guideVertical,{left:guide.value*PLAN_DISPLAY_SCALE,top:verticalExtent.start*PLAN_DISPLAY_SCALE,height:(verticalExtent.end-verticalExtent.start)*PLAN_DISPLAY_SCALE},guide.kind==='center'&&s.guideCenter]}/>
        :<View pointerEvents="none" key={`guide-${index}`} style={[s.guideHorizontal,{top:guide.value*PLAN_DISPLAY_SCALE,left:horizontalExtent.start*PLAN_DISPLAY_SCALE,width:(horizontalExtent.end-horizontalExtent.start)*PLAN_DISPLAY_SCALE},guide.kind==='center'&&s.guideCenter]}/>) }
      {project.objects.map(object=>{
        const size=objectPlanSize(object),isSelected=project.selectedId===object.id;
        const handles:ResizeHandle[]=object.kind==='wall'||object.kind==='door'||object.kind==='window'?['e','w']:['nw','n','ne','e','se','s','sw','w'];
        const attachedOpening=(object.kind==='door'||object.kind==='window')&&Boolean(openingData(object).parentWallId);
        return <AnyPressable
          key={object.id}
          dataSet={{planObject:'true'}}
          accessibilityRole="button"
          accessibilityLabel={`${object.name}, ${formatInches(object.widthIn)} by ${formatInches(object.depthIn)}`}
          onPress={()=>preview({...project,selectedId:object.id})}
          onMouseDown={(event:any)=>{if(event.button===0&&!spaceHeld.current)begin(event,object,'move');}}
          style={[s.object,{left:object.x*PLAN_DISPLAY_SCALE,top:object.y*PLAN_DISPLAY_SCALE,width:size.width,height:size.height,backgroundColor:object.color??(object.kind==='window'?'#91C7DC':object.kind==='door'?'#8A664B':'#C7CECA'),transform:[{rotate:`${object.rotation}deg`}]},isSelected&&s.selected]}
        >
          <GasRangePlanGraphic object={object}/>
          <Text numberOfLines={1} style={s.label}>{object.name}</Text>
          {project.view2d.measurements&&<View pointerEvents="none" style={[s.measureWrap,{top:size.height+4,minWidth:Math.max(72,size.width)}]}><View style={s.dimensionLine}/><Text style={s.measureText}>{object.kind==='wall'?formatInches(object.widthIn):`${formatInches(object.widthIn)} × ${formatInches(object.depthIn)}`}</Text></View>}
          {isSelected&&handles.map(handle=><AnyHandle key={handle} dataSet={{planObject:'true'}} accessibilityLabel={`Resize ${handle}`} onMouseDown={(event:any)=>begin(event,object,'resize',handle)} style={[s.handle,handlePositions[handle]]}/>) }
          {isSelected&&!attachedOpening&&<AnyHandle dataSet={{planObject:'true'}} accessibilityLabel="Rotate object" onMouseDown={(event:any)=>begin(event,object,'rotate')} style={s.rotateHandle}><View style={s.rotateStem}/></AnyHandle>}
        </AnyPressable>;
      })}
    </View>
    <View pointerEvents="none" style={s.scaleBadge}><Text style={s.scaleText}>{Math.round(project.view2d.zoom*100)}% · Grid {project.view2d.grid?'12 in':'Off'} · Snap {project.view2d.snap?'5 in + alignment':'Off'}</Text></View>
    {selected&&<View pointerEvents="none" style={s.coordinateBadge}><Text style={s.coordinateText}>X {Math.round(selected.x*10)/10} in · Y {Math.round(selected.y*10)/10} in · {Math.round(selected.rotation*10)/10}°</Text></View>}
  </AnyView>;
}

const s=StyleSheet.create({
  workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},
  plan:{position:'absolute',left:0,top:0,transformOrigin:'0 0' as any},
  gridVertical:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:'#9EB0AA33'},
  gridHorizontal:{position:'absolute',left:0,right:0,height:1,backgroundColor:'#9EB0AA33'},
  guideVertical:{position:'absolute',width:1.5,backgroundColor:'#1D8D6C'},
  guideHorizontal:{position:'absolute',height:1.5,backgroundColor:'#1D8D6C'},
  guideCenter:{backgroundColor:'#3E6FA2'},
  object:{position:'absolute',borderWidth:1,borderColor:'#596762',borderRadius:3,justifyContent:'center',overflow:'visible'},
  label:{fontSize:9,fontWeight:'800',paddingHorizontal:2,color:'#25332E'},
  selected:{borderWidth:3,borderColor:'#0B785A'},
  measureWrap:{position:'absolute',left:0,alignItems:'center'},
  dimensionLine:{height:1,width:'100%',backgroundColor:'#315F55'},
  measureText:{fontSize:9,fontWeight:'900',color:'#24453C',backgroundColor:'rgba(244,248,246,.92)',paddingHorizontal:4,paddingVertical:2,borderRadius:3,marginTop:2},
  handle:{position:'absolute',width:HANDLE_SIZE,height:HANDLE_SIZE,borderRadius:2,backgroundColor:'#FFFFFF',borderWidth:1.5,borderColor:'#0B785A',zIndex:20,cursor:'nwse-resize' as any},
  rotateHandle:{position:'absolute',left:'50%',top:-30,marginLeft:-6,width:12,height:12,borderRadius:6,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'#3E6FA2',zIndex:21,cursor:'grab' as any},
  rotateStem:{position:'absolute',left:4.5,top:10,width:1.5,height:18,backgroundColor:'#3E6FA2'},
  scaleBadge:{position:'absolute',right:12,bottom:12,backgroundColor:'rgba(23,33,31,.88)',paddingHorizontal:9,paddingVertical:6,borderRadius:6},
  scaleText:{fontSize:10,fontWeight:'800',color:'#E7F0ED'},
  coordinateBadge:{position:'absolute',left:12,bottom:12,backgroundColor:'rgba(244,248,246,.94)',borderWidth:1,borderColor:'#A7B8B2',paddingHorizontal:9,paddingVertical:6,borderRadius:6},
  coordinateText:{fontSize:10,fontWeight:'900',color:'#254A40'},
});
