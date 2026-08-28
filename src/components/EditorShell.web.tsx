import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { layoutIssueCounts, validateKitchenLayout } from '../domain/designValidation';
import { clampZoom, deleteObject, EditorProject, reset2DView, reset3DView } from '../domain/editor';
import { AIDesignPanel } from './AIDesignPanel.web';
import { Button, ContextPanel, Tool, ToolButton, ToolPanel, TOOLS } from './EditorPanels.web';
import { LayoutCheckPanel } from './LayoutCheckPanel.web';
import { WebGLViewport } from './WebGLViewport.web';
import { Workspace2D } from './Workspace2D.web';

export function EditorShell({initialProject,onProjectChange,onExit}:{initialProject:EditorProject;onProjectChange:(project:EditorProject)=>void;onExit:()=>void}) {
  const [project,setProject]=useState(initialProject);
  const [tool,setTool]=useState<Tool>('Plan');
  const [aiOpen,setAiOpen]=useState(false);
  const [checkOpen,setCheckOpen]=useState(false);
  const [rightOpen,setRightOpen]=useState(true);
  const [maximized,setMaximized]=useState(false);
  const undo=useRef<EditorProject[]>([]),redo=useRef<EditorProject[]>([]);
  const selected=useMemo(()=>project.objects.find(object=>object.id===project.selectedId),[project.objects,project.selectedId]);
  const layoutIssues=useMemo(()=>validateKitchenLayout(project),[project]);
  const layoutCounts=useMemo(()=>layoutIssueCounts(layoutIssues),[layoutIssues]);
  const publish=(next:EditorProject)=>{setProject(next);onProjectChange(next);};
  const apply=(next:EditorProject,record=true)=>{if(record){undo.current.push(project);if(undo.current.length>60)undo.current.shift();redo.current=[];}publish(next);};
  const preview=(next:EditorProject)=>setProject(next);
  const commitHistory=(snapshot:EditorProject,finalProject:EditorProject)=>{undo.current.push(snapshot);if(undo.current.length>60)undo.current.shift();redo.current=[];publish(finalProject);};
  const doUndo=()=>{const previous=undo.current.pop();if(!previous)return;redo.current.push(project);publish(previous);};
  const doRedo=()=>{const next=redo.current.pop();if(!next)return;undo.current.push(project);publish(next);};
  const fit=()=>project.viewMode==='2d'?preview({...project,view2d:{...project.view2d,zoom:.72,pan:{x:30,y:24}}}):preview({...project,camera3d:{...project.camera3d,distance:700,target:{x:220,y:170}}});
  const reset=()=>preview(project.viewMode==='2d'?reset2DView(project):reset3DView(project));
  const fullscreen=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{return;}};
  const chooseTool=(next:Tool)=>{setAiOpen(false);setCheckOpen(false);setTool(next);};
  const openAI=()=>{setCheckOpen(false);setAiOpen(true);};
  const openCheck=()=>{setAiOpen(false);setCheckOpen(true);};
  const layoutLabel=layoutCounts.errors?`Layout ${layoutCounts.errors}E`:layoutCounts.warnings?`Layout ${layoutCounts.warnings}W`:'Layout ✓';

  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      const tag=target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||target?.isContentEditable)return;
      const command=event.ctrlKey||event.metaKey;
      const key=event.key.toLowerCase();
      if(command&&key==='z'){event.preventDefault();event.shiftKey?doRedo():doUndo();return;}
      if(command&&key==='y'){event.preventDefault();doRedo();return;}
      if(command&&key==='s'){event.preventDefault();onProjectChange(project);return;}
      if((event.key==='Delete'||event.key==='Backspace')&&selected){event.preventDefault();apply(deleteObject(project,selected.id));return;}
      if(!command&&!event.altKey&&key==='2'){preview({...project,viewMode:'2d'});return;}
      if(!command&&!event.altKey&&key==='3'){preview({...project,viewMode:'3d'});return;}
      if(!command&&!event.altKey&&key==='g'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}});return;}
      if(!command&&!event.altKey&&key==='m'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}});return;}
      if(!command&&!event.altKey&&key==='c'){openCheck();return;}
      if(event.key==='Escape'){setAiOpen(false);setCheckOpen(false);preview({...project,selectedId:undefined});}
    };
    window.addEventListener('keydown',handle);
    return()=>window.removeEventListener('keydown',handle);
  },[project,selected,onProjectChange]);

  return <View style={s.app}>
    <View style={s.top}><View style={s.brand}><Text style={s.logo}>K</Text><View><Text style={s.brandTitle}>Kitchen AI</Text><Text style={s.projectName}>{project.name}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topActions}><Button label="Undo" disabled={!undo.current.length} onPress={doUndo}/><Button label="Redo" disabled={!redo.current.length} onPress={doRedo}/><Button label="Save" onPress={()=>onProjectChange(project)}/><Button label="Open Project" onPress={()=>chooseTool('Project')}/><Button label="AI Design" active={aiOpen} onPress={openAI}/><Button label={layoutLabel} active={checkOpen} onPress={openCheck}/><Button label="2D" active={project.viewMode==='2d'} onPress={()=>preview({...project,viewMode:'2d'})}/><Button label="3D" active={project.viewMode==='3d'} onPress={()=>preview({...project,viewMode:'3d'})}/><Button label="Fit View" onPress={fit}/><Button label="Export" onPress={()=>chooseTool('Export')}/><Button label="Estimate" onPress={onExit}/><Button label="Help" onPress={()=>chooseTool('View')}/><Button label="Settings" onPress={()=>chooseTool('Settings')}/></ScrollView></View>
    <View style={s.main}>{!maximized&&<ScrollView style={s.toolbar}>{TOOLS.map(item=><ToolButton key={item} tool={item} active={!aiOpen&&!checkOpen&&tool===item} onPress={()=>chooseTool(item)}/>)}</ScrollView>}{!maximized&&<View style={s.leftPanel}>{checkOpen?<LayoutCheckPanel project={project} apply={apply}/>:aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}</View>}<View style={s.center}><View style={s.workspaceHeader}><Text style={s.workspaceTitle}>{project.viewMode==='2d'?'2D Plan':'3D WebGL Kitchen'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>{project.viewMode==='2d'&&<><Button label="Zoom −" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom-.1)}})}/><Text style={s.zoom}>{Math.round(project.view2d.zoom*100)}%</Text><Button label="Zoom +" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom+.1)}})}/><Button label="Grid" active={project.view2d.grid} onPress={()=>preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}})}/><Button label="Measurements" active={project.view2d.measurements} onPress={()=>preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}})}/><Button label="Snap" active={project.view2d.snap} onPress={()=>preview({...project,view2d:{...project.view2d,snap:!project.view2d.snap}})}/></>}<Button label="Fit" onPress={fit}/><Button label="Reset" onPress={reset}/><Button label="Fullscreen" onPress={fullscreen}/><Button label={maximized?'Restore':'Maximize'} onPress={()=>setMaximized(!maximized)}/><Button label={rightOpen?'Hide Properties':'Properties'} onPress={()=>setRightOpen(!rightOpen)}/></ScrollView></View>{project.viewMode==='2d'?<Workspace2D project={project} preview={preview} commitHistory={commitHistory}/>:<View style={s.workspace}><WebGLViewport project={project} preview={preview}/></View>}<View style={s.status}><Text style={s.statusText}>{project.viewMode==='3d'?'WebGL 3D · real openings · countertop materials · continuous toe kick':`${Math.round(project.view2d.zoom*100)}% · ${project.view2d.snap?'Snap 5 in':'Snap Off'} · ${project.view2d.grid?'Grid 12 in':'Grid Off'} · ${project.view2d.measurements?'Measurements On':'Measurements Off'}`} · Layout {layoutCounts.errors}E/{layoutCounts.warnings}W</Text><Text style={s.statusText}>{project.viewMode==='3d'?'Wheel Zoom · Drag Orbit · Middle/Right Pan · Double-click Focus':'Ctrl/Cmd+Z Undo · Delete Selected · 2/3 View · G Grid · M Measurements · C Check'}</Text></View></View>{!maximized&&rightOpen&&<ContextPanel project={project} selected={selected} apply={next=>apply(next)}/>}</View>
  </View>;
}
const s=StyleSheet.create({app:{flex:1,backgroundColor:'#E8ECEA'},top:{minHeight:64,backgroundColor:'#17211F',flexDirection:'row',alignItems:'center',paddingHorizontal:10},brand:{minWidth:190,flexDirection:'row',alignItems:'center',gap:9},logo:{width:38,height:38,borderRadius:10,backgroundColor:'#5EA38F',color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',textAlignVertical:'center'},brandTitle:{color:'#fff',fontSize:17,fontWeight:'900'},projectName:{color:'#AAB9B5',fontSize:11,maxWidth:130},topActions:{alignItems:'center',gap:5,paddingVertical:7},main:{flex:1,flexDirection:'row'},toolbar:{width:94,backgroundColor:'#202C29'},leftPanel:{width:310,backgroundColor:'#F6F8F7',borderRightWidth:1,borderRightColor:'#CCD5D2',padding:12},center:{flex:1,minWidth:0},workspaceHeader:{minHeight:52,backgroundColor:'#F6F8F7',borderBottomWidth:1,borderBottomColor:'#CBD4D1',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},workspaceTitle:{fontSize:15,fontWeight:'900',color:'#1D2A27'},headerActions:{alignItems:'center',gap:3},zoom:{width:44,textAlign:'center',fontSize:12,fontWeight:'900'},workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},status:{minHeight:30,backgroundColor:'#17211F',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},statusText:{fontSize:10,color:'#CBD6D3'}});
