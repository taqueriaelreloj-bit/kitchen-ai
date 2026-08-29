import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useRef, useState } from 'react';
import { clampZoom, EditorObject, EditorProject, updateObject } from '../domain/editor';
import { attachOpening, moveOpeningAlongWall, openingData, openingsForWall } from '../domain/openings';
import { resizeObject, ResizeHandle, rotateObjectTowardPoint } from '../domain/objectTransform';
import { AlignmentGuide, guideExtent, snapPlanObject } from '../domain/planSnap';

const AnyView=View as any;
const AnyPressable=Pressable as any;
const AnyHandle=View as any;
const PIXELS_PER_INCH=.45;
const GRID_IN=12;
const HANDLE_SIZE=9;

type Props={
  project:EditorProject;
  preview:(project:EditorProject)=>void;
  commitHistory:(snapshot:EditorProject,finalProject:EditorProject)=>void;
  onViewportChange?:(size:{width:number;height:number})=>void;
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
const objectPlanSize=(object:EditorObject)=>({width:Math.max(4,object.widthIn*PIXELS_PER_INCH),height:Math.max(object.kind==='wall'?2:5,objectDepth(object)*PIXELS_PER_INCH)});
const worldPointer=(event:any,element:any,project:EditorProject)=>{
  const rect=element.getBoundingClientRect();
  return{
    x:(event.clientX-rect.left-project.view2d.pan.x)/(project.view2d.zoom*PIXELS_PER_INCH),
    y:(event.clientY-rect.top-project.view2d.pan.y)/(project.view2d.zoom*PIXELS_PER_INCH),
  };
};

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

export function Workspace2DPro({project,preview,commitHistory,onViewportChange}:Props){
  const pan=useRef<PanState>({x:0,y:0,panX:0,panY:0,active:false});
  const interaction=useRef<Interaction>(emptyInteraction());
  const spaceHeld=useRef(false);
  const rootRef=useRef<any>(null);
  const[guides,setGuides]=useState<AlignmentGuide[]>([]);
  const[viewport,setViewport]=useState({width:900,height:650});
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
    interaction.current={mode,id:object.id,clientX:event.clientX,clientY:event.clientY,object:{...object,toeKick:object.toeKick?{...object.toeKick}:undefined,hardware:object.hardware?{...object.hardware}:undefined},openingOffset:openingData(object).wallOffsetIn??0,handle,snapshot:project,active:true,moved:false};
    preview({...project,selectedId:object.id});
  };

  const onMouseMove=(event:any)=>{
    if(pan.current.active){
      preview({...project,view2d:{...project.view2d,pan:{x:pan.current.panX+event.clientX-pan.current.x,y:pan.current.panY+event.clientY-pan.current.y}}});
      return;
    }
    const state=interaction.current;
    if(!state.active)return;
    const deltaScreen={x:event.clientX-state.clientX,y:event.clientY-state.clientY};
    const deltaWorld={x:deltaScreen.x/(project.view2d.zoom*PIXELS_PER_INCH),y:deltaScreen.y/(project.view2d.zoom*PIXELS_PER_INCH)};
    if(Math.abs(deltaScreen.x)+Math.abs(deltaScreen.y)>3)state.moved=true;
    if(state.mode==='move'){
      const data=openingData(state.object),parent=data.parentWallId?project.objects.find(object=>object.id===data.parentWallId&&object.kind==='wall'):undefined;
      if(parent&&(state.object.kind==='door'||state.object.kind==='window')){
        const angle=parent.rotation*Math.PI/180,along=deltaWorld.x*Math.cos(angle)+deltaWorld.y*Math.sin(angle);
        setGuides([]);preview(moveOpeningAlongWall(project,state.object.id,state.openingOffset+along));return;
      }
      const snapped=snapPlanObject(state.object,{x:state.object.x+deltaWorld.x,y:state.object.y+deltaWorld.y},project.objects,{grid:project.view2d.snap,gridSizeIn:5,alignment:project.view2d.snap,toleranceIn:3.5});
      setGuides(snapped.guides);preview(updateObject(project,state.object.id,{x:snapped.x,y:snapped.y}));return;
    }
    if(state.mode==='resize'&&state.handle){
      const resized=resizeObject(state.object,state.handle,deltaWorld,{minWidthIn:3,minDepthIn:1,snapIncrementIn:project.view2d.snap?1:undefined});
      let next=updateObject(project,state.object.id,{x:resized.x,y:resized.y,widthIn:resized.widthIn,depthIn:resized.depthIn});
      if(state.object.kind==='wall')next=clampAttachedOpenings(next,state.object.id);
      if((state.object.kind==='door'||state.object.kind==='window')&&dataParent(state.object))next=attachOpening(next,state.object.id,dataParent(state.object)!,state.openingOffset);
      preview(next);return;
    }
    if(state.mode==='rotate'){
      const element=rootRef.current as HTMLElement|undefined;
      if(!element)return;
      const rotated=rotateObjectTowardPoint(state.object,worldPointer(event,element,project),project.view2d.snap?15:1);
      let next=updateObject(project,state.object.id,{rotation:rotated.rotation});
      if(state.object.kind==='wall')next=clampAttachedOpenings(next,state.object.id);
      preview(next);
    }
  };

  const dataParent=(object:EditorObject)=>openingData(object).parentWallId;
  const onWheel=(event:any)=>{
    event.preventDefault();
    const smoothTrackpad=!event.ctrlKey&&(Math.abs(event.deltaX)>1||Math.abs(event.deltaY)<40);
    if(smoothTrackpad){
      preview({...project,view2d:{...project.view2d,pan:{x:project.view2d.pan.x-event.deltaX,y:project.view2d.pan.y-event.deltaY}}});return;
    }
    const old=project.view2d.zoom,next=clampZoom(old+(event.deltaY<0?.08:-.08));
    if(next===old)return;
    const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,ratio=next/old;
    preview({...project,view2d:{...project.view2d,zoom:next,pan:{x:x-(x-project.view2d.pan.x)*ratio,y:y-(y-project.view2d.pan.y)*ratio}}});
  };
  const onLayout=(event:LayoutChangeEvent)=>{
    const{width,height}=event.nativeEvent.layout;
    if(width>0&&height>0){const next={width,height};setViewport(next);onViewportChange?.(next);}
  };
  const webProps={
    ref:rootRef,
    tabIndex:0,
    onKeyDown:(event:any)=>{if(event.code==='Space'){spaceHeld.current=true;event.preventDefault();}},
    onKeyUp:(event:any)=>{if(event.code==='Space')spaceHeld.current=false;},
    onBlur:()=>{spaceHeld.current=false;pan.current.active=false;finishInteraction();},
    onWheel,
    onMouseDown:(event:any)=>{if(event.button===1||(event.button===0&&spaceHeld.current)){pan.current={x:event.clientX,y:event.clientY,panX:project.view2d.pan.x,panY:project.view2d.pan.y,active:true};event.preventDefault();}},
    onMouseMove,
    onMouseUp:()=>{pan.current.active=false;finishInteraction();},
    onMouseLeave:()=>{pan.current.active=false;finishInteraction();},
    onContextMenu:(event:any)=>event.preventDefault(),
    onClick:(event:any)=>{const target=event.target as HTMLElement;if(!target.closest?.('[data-plan-object="true"]'))preview({...project,selectedId:undefined});},
  };

  return <AnyView accessibilityLabel="Professional 2D kitchen workspace" onLayout={onLayout} style={[s.workspace,{cursor:spaceHeld.current?'grab':'default'} as any]} {...webProps}>
    <View style={[s.plan,{width:planExtent.widthIn*PIXELS_PER_INCH,height:planExtent.heightIn*PIXELS_PER_INCH,transform:[{translateX:project.view2d.pan.x},{translateY:project.view2d.pan.y},{scale:project.view2d.zoom}]}]}>
      {gridVertical.map(index=><View pointerEvents="none" key={`grid-v-${index}`} style={[s.gridVertical,{left:index*GRID_IN*PIXELS_PER_INCH}]}/>) }
      {gridHorizontal.map(index=><View pointerEvents="none" key={`grid-h-${index}`} style={[s.gridHorizontal,{top:index*GRID_IN*PIXELS_PER_INCH}]}/>) }
      {guides.map((guide,index)=>guide.axis==='x'
        ?<View pointerEvents="none" key={`guide-${index}`} style={[s.guideVertical,{left:guide.value*PIXELS_PER_INCH,top:verticalExtent.start*PIXELS_PER_INCH,height:(verticalExtent.end-verticalExtent.start)*PIXELS_PER_INCH},guide.kind==='center'&&s.guideCenter]}/>
        :<View pointerEvents="none" key={`guide-${index}`} style={[s.guideHorizontal,{top:guide.value*PIXELS_PER_INCH,left:horizontalExtent.start*PIXELS_PER_INCH,width:(horizontalExtent.end-horizontalExtent.start)*PIXELS_PER_INCH},guide.kind==='center'&&s.guideCenter]}/>) }
      {project.objects.map(object=>{
        const size=objectPlanSize(object),isSelected=project.selectedId===object.id;
        const handles:ResizeHandle[]=object.kind==='wall'?['e','w']:['nw','n','ne','e','se','s','sw','w'];
        return <AnyPressable
          key={object.id}
          dataSet={{planObject:'true'}}
          accessibilityRole="button"
          accessibilityLabel={object.name}
          onPress={()=>preview({...project,selectedId:object.id})}
          onMouseDown={(event:any)=>{if(event.button===0&&!spaceHeld.current)begin(event,object,'move');}}
          style={[s.object,{left:object.x*PIXELS_PER_INCH,top:object.y*PIXELS_PER_INCH,width:size.width,height:size.height,backgroundColor:object.color??(object.kind==='window'?'#91C7DC':object.kind==='door'?'#8A664B':'#C7CECA'),transform:[{rotate:`${object.rotation}deg`}]},isSelected&&s.selected]}
        >
          <Text numberOfLines={1} style={s.label}>{object.name}</Text>
          {project.view2d.measurements&&<Text pointerEvents="none" style={s.measurement}>{Math.round(object.widthIn*10)/10} in × {Math.round((object.kind==='wall'?object.heightIn:object.depthIn)*10)/10} in</Text>}
          {isSelected&&handles.map(handle=><AnyHandle key={handle} data-plan-object="true" accessibilityLabel={`Resize ${handle}`} onMouseDown={(event:any)=>begin(event,object,'resize',handle)} style={[s.handle,handlePositions[handle]]}/>) }
          {isSelected&&<AnyHandle data-plan-object="true" accessibilityLabel="Rotate object" onMouseDown={(event:any)=>begin(event,object,'rotate')} style={s.rotateHandle}><View style={s.rotateStem}/></AnyHandle>}
        </AnyPressable>;
      })}
    </View>
    <View pointerEvents="none" style={s.scaleBadge}><Text style={s.scaleText}>{Math.round(project.view2d.zoom*100)}% · Grid {project.view2d.grid?'12 in':'Off'} · Snap {project.view2d.snap?'5 in + alignment':'Off'} · {Math.round(viewport.width)}×{Math.round(viewport.height)}</Text></View>
    {selected&&<View pointerEvents="none" style={s.coordinateBadge}><Text style={s.coordinateText}>X {Math.round(selected.x*10)/10} · Y {Math.round(selected.y*10)/10} · {Math.round(selected.rotation*10)/10}°</Text></View>}
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
  measurement:{position:'absolute',top:-17,minWidth:120,fontSize:8,fontWeight:'800',color:'#315F55'},
  selected:{borderWidth:3,borderColor:'#0B785A'},
  handle:{position:'absolute',width:HANDLE_SIZE,height:HANDLE_SIZE,borderRadius:2,backgroundColor:'#FFFFFF',borderWidth:1.5,borderColor:'#0B785A',zIndex:20,cursor:'nwse-resize' as any},
  rotateHandle:{position:'absolute',left:'50%',top:-30,marginLeft:-6,width:12,height:12,borderRadius:6,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'#3E6FA2',zIndex:21,cursor:'grab' as any},
  rotateStem:{position:'absolute',left:4.5,top:10,width:1.5,height:18,backgroundColor:'#3E6FA2'},
  scaleBadge:{position:'absolute',left:8,bottom:8,borderRadius:7,backgroundColor:'#17211FDD',paddingHorizontal:8,paddingVertical:5},
  scaleText:{fontSize:9,fontWeight:'800',color:'#EDF4F1'},
  coordinateBadge:{position:'absolute',right:8,bottom:8,borderRadius:7,backgroundColor:'#FFFFFFE8',borderWidth:1,borderColor:'#AFC0BA',paddingHorizontal:8,paddingVertical:5},
  coordinateText:{fontSize:9,fontWeight:'900',color:'#315F55'},
});
