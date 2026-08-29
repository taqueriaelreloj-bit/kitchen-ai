import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AIDesignPanel } from './AIDesignPanel.web';
import { Button, ContextPanel, Tool, ToolButton, ToolPanel, TOOLS } from './EditorPanels.web';
import { Workspace2DPro } from './Workspace2DPro.web';
import { WebGLViewportPro } from './WebGLViewportPro.web';
import { clampZoom, deleteObject, EditorObject, EditorProject, reset2DView, reset3DView } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

const AnyView=View as any;
const PIXELS_PER_INCH=.45;
type SaveState='saved'|'saving';
type WorldBounds={left:number;top:number;right:number;bottom:number;centerX:number;centerY:number;width:number;height:number};

function objectBounds(object:EditorObject){
  const angle=object.rotation*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
  const width=object.widthIn*cos+object.depthIn*sin,height=object.widthIn*sin+object.depthIn*cos,centerX=object.x+object.widthIn/2,centerY=object.y+object.depthIn/2;
  return{left:centerX-width/2,top:centerY-height/2,right:centerX+width/2,bottom:centerY+height/2};
}
function projectBounds(objects:EditorObject[]):WorldBounds{
  if(!objects.length)return{left:0,top:0,right:1,bottom:1,centerX:.5,centerY:.5,width:1,height:1};
  const values=objects.map(objectBounds),left=Math.min(...values.map(value=>value.left)),top=Math.min(...values.map(value=>value.top)),right=Math.max(...values.map(value=>value.right)),bottom=Math.max(...values.map(value=>value.bottom));
  return{left,top,right,bottom,centerX:(left+right)/2,centerY:(top+bottom)/2,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
function fit2D(project:EditorProject,viewport:{width:number;height:number}){
  const bounds=projectBounds(project.objects),availableWidth=Math.max(1,viewport.width-88),availableHeight=Math.max(1,viewport.height-88),zoom=clampZoom(Math.min(availableWidth/(bounds.width*PIXELS_PER_INCH),availableHeight/(bounds.height*PIXELS_PER_INCH)));
  return{...project,view2d:{...project.view2d,zoom,pan:{x:viewport.width/2-bounds.centerX*PIXELS_PER_INCH*zoom,y:viewport.height/2-bounds.centerY*PIXELS_PER_INCH*zoom}}};
}
function center2D(project:EditorProject,viewport:{width:number;height:number}){
  const bounds=projectBounds(project.objects),zoom=project.view2d.zoom;
  return{...project,view2d:{...project.view2d,pan:{x:viewport.width/2-bounds.centerX*PIXELS_PER_INCH*zoom,y:viewport.height/2-bounds.centerY*PIXELS_PER_INCH*zoom}}};
}
function fit3D(project:EditorProject){
  const boxes=buildSceneBoxes(project.objects).filter(box=>box.kind!=='floor');
  if(!boxes.length)return project;
  const minX=Math.min(...boxes.map(box=>box.center[0]-box.size[0]/2)),maxX=Math.max(...boxes.map(box=>box.center[0]+box.size[0]/2)),minY=Math.min(...boxes.map(box=>box.center[1]-box.size[1]/2)),maxY=Math.max(...boxes.map(box=>box.center[1]+box.size[1]/2)),minZ=Math.min(...boxes.map(box=>box.center[2]-box.size[2]/2)),maxZ=Math.max(...boxes.map(box=>box.center[2]+box.size[2]/2)),span=Math.max(maxX-minX,maxZ-minZ,(maxY-minY)*.8,4);
  return{...project,camera3d:{...project.camera3d,distance:Math.max(220,Math.min(1100,Math.round(span*82))),target:{x:Math.round((minX+maxX)/2*24),y:Math.round((minZ+maxZ)/2*24)}}};
}

export function EditorShellPro({initialProject,onProjectChange,onExit}:{initialProject:EditorProject;onProjectChange:(project:EditorProject)=>void;onExit:()=>void}){
  const{width}=useWindowDimensions(),compact=width<1050;
  const rootRef=useRef<any>(null),undo=useRef<EditorProject[]>([]),redo=useRef<EditorProject[]>([]),saveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const[project,setProject]=useState(initialProject),[tool,setTool]=useState<Tool>('Plan'),[aiOpen,setAiOpen]=useState(false),[leftOpen,setLeftOpen]=useState(!compact),[rightOpen,setRightOpen]=useState(!compact),[maximized,setMaximized]=useState(false),[viewport,setViewport]=useState({width:900,height:650}),[saveState,setSaveState]=useState<SaveState>('saved');
  const selected=useMemo(()=>project.objects.find(object=>object.id===project.selectedId),[project.objects,project.selectedId]);
  useEffect(()=>{if(compact){setLeftOpen(false);setRightOpen(false);}},[compact]);
  useEffect(()=>()=>{if(saveTimer.current)clearTimeout(saveTimer.current);},[]);

  const markSaving=()=>{setSaveState('saving');if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>setSaveState('saved'),350);};
  const publish=(next:EditorProject)=>{setProject(next);markSaving();onProjectChange(next);};
  const apply=(next:EditorProject,record=true)=>{if(record){undo.current.push(project);if(undo.current.length>80)undo.current.shift();redo.current=[];}publish(next);};
  const preview=(next:EditorProject)=>setProject(next);
  const commitHistory=(snapshot:EditorProject,finalProject:EditorProject)=>{undo.current.push(snapshot);if(undo.current.length>80)undo.current.shift();redo.current=[];publish(finalProject);};
  const doUndo=()=>{const previous=undo.current.pop();if(!previous)return;redo.current.push(project);publish(previous);};
  const doRedo=()=>{const next=redo.current.pop();if(!next)return;undo.current.push(project);publish(next);};
  const save=()=>{markSaving();onProjectChange(project);};
  const chooseTool=(next:Tool)=>{setAiOpen(false);setTool(next);setLeftOpen(true);};
  const fit=()=>preview(project.viewMode==='2d'?fit2D(project,viewport):fit3D(project));
  const center=()=>project.viewMode==='2d'&&preview(center2D(project,viewport));
  const reset=()=>preview(project.viewMode==='2d'?reset2DView(project):reset3DView(project));
  const fullscreen=async()=>{try{const element=rootRef.current as HTMLElement|undefined;if(!document.fullscreenElement)await(element?.requestFullscreen?.()??document.documentElement.requestFullscreen());else await document.exitFullscreen();}catch{return;}};
  const removeSelected=()=>{if(!selected)return;if(window.confirm(`Delete ${selected.name}?`))apply(deleteObject(project,selected.id));};

  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null,tag=target?.tagName?.toLowerCase();if(tag==='input'||tag==='textarea'||target?.isContentEditable)return;
      const command=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
      if(command&&key==='z'){event.preventDefault();event.shiftKey?doRedo():doUndo();return;}
      if(command&&key==='y'){event.preventDefault();doRedo();return;}
      if(command&&key==='s'){event.preventDefault();save();return;}
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();removeSelected();return;}
      if(!command&&!event.altKey&&key==='2'){preview({...project,viewMode:'2d'});return;}
      if(!command&&!event.altKey&&key==='3'){preview({...project,viewMode:'3d'});return;}
      if(!command&&!event.altKey&&key==='g'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}});return;}
      if(!command&&!event.altKey&&key==='m'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}});return;}
      if(!command&&!event.altKey&&key==='f'){fit();return;}
      if(!command&&!event.altKey&&key==='c'){center();return;}
      if(event.key==='Escape'){setAiOpen(false);setLeftOpen(false);preview({...project,selectedId:undefined});}
    };
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[project,selected,viewport]);

  const leftPanel=aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>;
  return <AnyView ref={rootRef} style={s.app}>
    <View style={s.top}><View style={s.brand}><Text style={s.logo}>K</Text><View><Text style={s.brandTitle}>Kitchen AI</Text><Text numberOfLines={1} style={s.projectName}>{project.name}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topActions}>
      <Button label="Undo" disabled={!undo.current.length} onPress={doUndo}/><Button label="Redo" disabled={!redo.current.length} onPress={doRedo}/><Button label={saveState==='saving'?'Saving…':'Save'} onPress={save}/><Button label="Open Project" onPress={()=>chooseTool('Project')}/><Button label="AI Design" active={aiOpen} onPress={()=>{setAiOpen(true);setLeftOpen(true);}}/><Button label="2D" active={project.viewMode==='2d'} onPress={()=>preview({...project,viewMode:'2d'})}/><Button label="3D" active={project.viewMode==='3d'} onPress={()=>preview({...project,viewMode:'3d'})}/><Button label="Fit View" onPress={fit}/><Button label="Export" onPress={()=>chooseTool('Export')}/><Button label="Estimate" onPress={onExit}/><Button label="Tools" onPress={()=>setLeftOpen(!leftOpen)}/><Button label="Properties" onPress={()=>setRightOpen(!rightOpen)}/>
    </ScrollView></View>
    <View style={s.main}>
      {!maximized&&!compact&&<ScrollView style={s.toolbar}>{TOOLS.map(item=><ToolButton key={item} tool={item} active={!aiOpen&&tool===item} onPress={()=>chooseTool(item)}/>)}</ScrollView>}
      {!maximized&&leftOpen&&<View style={[s.leftPanel,compact&&s.leftOverlay]}>{compact&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mobileTools}>{TOOLS.map(item=><Button key={item} label={item} active={!aiOpen&&tool===item} onPress={()=>chooseTool(item)}/>)}</ScrollView>}{leftPanel}</View>}
      <View style={s.center}>
        <View style={s.workspaceHeader}><Text style={s.workspaceTitle}>{project.viewMode==='2d'?'2D Plan':'3D WebGL Kitchen'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>
          {project.viewMode==='2d'&&<><Button label="Zoom −" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom-.1)}})}/><Text style={s.zoom}>{Math.round(project.view2d.zoom*100)}%</Text><Button label="Zoom +" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom+.1)}})}/><Button label="Grid" active={project.view2d.grid} onPress={()=>preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}})}/><Button label="Measurements" active={project.view2d.measurements} onPress={()=>preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}})}/><Button label="Snap" active={project.view2d.snap} onPress={()=>preview({...project,view2d:{...project.view2d,snap:!project.view2d.snap}})}/><Button label="Center" onPress={center}/></>}
          <Button label="Fit" onPress={fit}/><Button label="Reset" onPress={reset}/><Button label="Fullscreen" onPress={fullscreen}/><Button label={maximized?'Restore':'Maximize'} onPress={()=>setMaximized(!maximized)}/>
        </ScrollView></View>
        {project.viewMode==='2d'?<Workspace2DPro project={project} preview={preview} commitHistory={commitHistory} onViewportChange={setViewport}/>:<View style={s.workspace}><WebGLViewportPro project={project} preview={preview}/></View>}
        <View style={s.status}><Text numberOfLines={1} style={s.statusText}>{project.viewMode==='2d'?`${Math.round(project.view2d.zoom*100)}% · ${project.view2d.snap?'Snap 5 in + alignment':'Snap Off'} · ${project.view2d.grid?'Grid 12 in':'Grid Off'}`:'WebGL · Wheel Zoom · Empty-space Orbit · Middle/Right Pan · Double-click Focus'}</Text><Text numberOfLines={1} style={s.statusText}>{selected?`${selected.name} · X ${Math.round(selected.x*10)/10} · Y ${Math.round(selected.y*10)/10} · ${Math.round(selected.rotation*10)/10}°`:saveState==='saving'?'Saving locally…':'Saved locally'}</Text></View>
      </View>
      {!maximized&&rightOpen&&!compact&&<ContextPanel project={project} selected={selected} apply={next=>apply(next)}/>} 
    </View>
    {compact&&!maximized&&rightOpen&&<View style={s.bottomSheet}><ContextPanel project={project} selected={selected} apply={next=>apply(next)}/></View>}
  </AnyView>;
}

const s=StyleSheet.create({app:{flex:1,backgroundColor:'#E8ECEA'},top:{minHeight:64,backgroundColor:'#17211F',flexDirection:'row',alignItems:'center',paddingHorizontal:10},brand:{minWidth:178,flexDirection:'row',alignItems:'center',gap:8},logo:{width:38,height:38,borderRadius:10,backgroundColor:'#5EA38F',color:'#FFFFFF',fontSize:22,fontWeight:'900',textAlign:'center',textAlignVertical:'center'},brandTitle:{color:'#FFFFFF',fontSize:17,fontWeight:'900'},projectName:{color:'#AAB9B5',fontSize:11,maxWidth:116},topActions:{alignItems:'center',gap:4,paddingVertical:7},main:{flex:1,flexDirection:'row'},toolbar:{width:94,backgroundColor:'#202C29'},leftPanel:{width:310,backgroundColor:'#F6F8F7',borderRightWidth:1,borderRightColor:'#CCD5D2',padding:12,zIndex:30},leftOverlay:{position:'absolute',left:0,top:0,bottom:0,width:'min(88%, 340px)' as any,boxShadow:'4px 0 18px #0003' as any},mobileTools:{gap:4,paddingBottom:8},center:{flex:1,minWidth:0},workspaceHeader:{minHeight:52,backgroundColor:'#F6F8F7',borderBottomWidth:1,borderBottomColor:'#CBD4D1',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},workspaceTitle:{fontSize:15,fontWeight:'900',color:'#1D2A27'},headerActions:{alignItems:'center',gap:3},zoom:{width:44,textAlign:'center',fontSize:12,fontWeight:'900'},workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},status:{minHeight:32,backgroundColor:'#17211F',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},statusText:{fontSize:10,color:'#CBD6D3',flexShrink:1},bottomSheet:{position:'absolute',zIndex:40,left:0,right:0,bottom:0,maxHeight:'58%',backgroundColor:'#F7F9F8',borderTopWidth:1,borderTopColor:'#BAC5C1',boxShadow:'0 -5px 20px #0003' as any}});
