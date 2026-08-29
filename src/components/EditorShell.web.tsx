import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { layoutIssueCounts, validateKitchenLayout } from '../domain/designValidation';
import { clampZoom, deleteObject, EditorProject, reset2DView, reset3DView } from '../domain/editor';
import { nudgeSelectedObject } from '../domain/selectionCommands';
import { center2DView, center3DCamera, fit2DView, fit3DCamera } from '../domain/viewFitting';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { AIDesignPanel } from './AIDesignPanel.web';
import { CatalogHoverMenu } from './CatalogHoverMenu.web';
import { Button, ContextPanel, Tool, ToolButton, ToolPanel, TOOLS } from './EditorPanels.web';
import { LayoutCheckPanel } from './LayoutCheckPanel.web';
import { SelectionTransformPanel } from './SelectionTransformPanel';
import { WebGLViewport } from './WebGLViewport.web';
import { Workspace2D } from './Workspace2D.web';

export function EditorShell({initialProject,onProjectChange,onExit}:{initialProject:EditorProject;onProjectChange:(project:EditorProject)=>void;onExit:()=>void}) {
  const [tool,setTool]=useState<Tool>('Plan');
  const [aiOpen,setAiOpen]=useState(false);
  const [checkOpen,setCheckOpen]=useState(false);
  const [rightOpen,setRightOpen]=useState(true);
  const [maximized,setMaximized]=useState(false);
  const [transformOpen,setTransformOpen]=useState(true);
  const {project,apply,preview,commitHistory,undo:doUndo,redo:doRedo,save,canUndo,canRedo}=useEditorHistory(initialProject,onProjectChange);
  const selected=useMemo(()=>project.objects.find(object=>object.id===project.selectedId),[project.objects,project.selectedId]);
  const layoutIssues=useMemo(()=>validateKitchenLayout(project),[project]);
  const layoutCounts=useMemo(()=>layoutIssueCounts(layoutIssues),[layoutIssues]);
  const editorViewport=()=>({width:Math.max(320,window.innerWidth-(maximized?24:94+310+(rightOpen?290:0)+24)),height:Math.max(240,window.innerHeight-202)});
  const fit=()=>project.viewMode==='2d'?preview({...project,view2d:fit2DView(project,editorViewport())}):preview({...project,camera3d:fit3DCamera(project)});
  const center=()=>project.viewMode==='2d'?preview({...project,view2d:center2DView(project,editorViewport())}):preview({...project,camera3d:center3DCamera(project)});
  const reset=()=>preview(project.viewMode==='2d'?reset2DView(project):reset3DView(project));
  const fullscreen=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{return;}};
  const chooseTool=(next:Tool)=>{setAiOpen(false);setCheckOpen(false);setTool(next);};
  const openAI=()=>{setCheckOpen(false);setAiOpen(true);};
  const openCheck=()=>{setAiOpen(false);setCheckOpen(true);};
  const layoutLabel=layoutCounts.errors?`Layout ${layoutCounts.errors}E`:layoutCounts.warnings?`Layout ${layoutCounts.warnings}W`:'Layout ✓';
  const selectedStatus=selected?`${selected.name} · X ${Math.round(selected.x*10)/10} in · Y ${Math.round(selected.y*10)/10} in · `:'';

  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      const tag=target?.tagName?.toLowerCase();
      if(tag==='input'||tag==='textarea'||target?.isContentEditable)return;
      const command=event.ctrlKey||event.metaKey;
      const key=event.key.toLowerCase();
      if(command&&key==='z'){event.preventDefault();event.shiftKey?doRedo():doUndo();return;}
      if(command&&key==='y'){event.preventDefault();doRedo();return;}
      if(command&&key==='s'){event.preventDefault();save();return;}
      if((event.key==='Delete'||event.key==='Backspace')&&selected){event.preventDefault();apply(deleteObject(project,selected.id));return;}
      const arrow=selected&&!command&&!event.altKey?({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as const)[event.key]:undefined;
      if(arrow){event.preventDefault();const step=event.shiftKey?5:1;apply(nudgeSelectedObject(project,arrow[0]*step,arrow[1]*step));return;}
      if(!command&&!event.altKey&&key==='2'){preview({...project,viewMode:'2d'});return;}
      if(!command&&!event.altKey&&key==='3'){preview({...project,viewMode:'3d'});return;}
      if(!command&&!event.altKey&&key==='g'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}});return;}
      if(!command&&!event.altKey&&key==='m'&&project.viewMode==='2d'){preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}});return;}
      if(!command&&!event.altKey&&key==='f'){event.preventDefault();event.shiftKey?center():fit();return;}
      if(!command&&!event.altKey&&key==='c'){openCheck();return;}
      if(event.key==='Escape'){setAiOpen(false);setCheckOpen(false);preview({...project,selectedId:undefined});}
    };
    window.addEventListener('keydown',handle);
    return()=>window.removeEventListener('keydown',handle);
  },[project,selected,maximized,rightOpen,doUndo,doRedo,apply,preview,save]);

  return <View style={s.app}>
    <View style={s.top}><View style={s.brand}><Text style={s.logo}>K</Text><View><Text style={s.brandTitle}>Kitchen AI</Text><Text style={s.projectName}>{project.name}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topActions}><Button label="Undo" disabled={!canUndo} onPress={doUndo}/><Button label="Redo" disabled={!canRedo} onPress={doRedo}/><Button label="Save" onPress={save}/><Button label="Open Project" onPress={()=>chooseTool('Project')}/><Button label="AI Design" active={aiOpen} onPress={openAI}/><Button label={layoutLabel} active={checkOpen} onPress={openCheck}/><Button label="2D" active={project.viewMode==='2d'} onPress={()=>preview({...project,viewMode:'2d'})}/><Button label="3D" active={project.viewMode==='3d'} onPress={()=>preview({...project,viewMode:'3d'})}/><Button label="Fit View" onPress={fit}/><Button label="Export" onPress={()=>chooseTool('Export')}/><Button label="Estimate" onPress={onExit}/><Button label="Help" onPress={()=>chooseTool('View')}/><Button label="Settings" onPress={()=>chooseTool('Settings')}/></ScrollView></View>
    <CatalogHoverMenu project={project} apply={apply} preview={preview}/>
    <View style={s.main}>{!maximized&&<ScrollView style={s.toolbar}>{TOOLS.map(item=><ToolButton key={item} tool={item} active={!aiOpen&&!checkOpen&&tool===item} onPress={()=>chooseTool(item)}/>)}</ScrollView>}{!maximized&&<View style={s.leftPanel}>{checkOpen?<LayoutCheckPanel project={project} apply={apply}/>:aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}</View>}<View style={s.center}><View style={s.workspaceHeader}><Text style={s.workspaceTitle}>{project.viewMode==='2d'?'2D Plan':'3D WebGL Kitchen'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>{project.viewMode==='2d'&&<><Button label="Zoom −" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom-.1)}})}/><Text style={s.zoom}>{Math.round(project.view2d.zoom*100)}%</Text><Button label="Zoom +" onPress={()=>preview({...project,view2d:{...project.view2d,zoom:clampZoom(project.view2d.zoom+.1)}})}/><Button label="Grid" active={project.view2d.grid} onPress={()=>preview({...project,view2d:{...project.view2d,grid:!project.view2d.grid}})}/><Button label="Measurements" active={project.view2d.measurements} onPress={()=>preview({...project,view2d:{...project.view2d,measurements:!project.view2d.measurements}})}/><Button label="Snap" active={project.view2d.snap} onPress={()=>preview({...project,view2d:{...project.view2d,snap:!project.view2d.snap}})}/></>}<Button label="Fit" onPress={fit}/><Button label="Center" onPress={center}/><Button label="Reset" onPress={reset}/><Button label="Fullscreen" onPress={fullscreen}/><Button label={maximized?'Restore':'Maximize'} onPress={()=>setMaximized(!maximized)}/><Button label={rightOpen?'Hide Properties':'Properties'} onPress={()=>setRightOpen(!rightOpen)}/><Button label="Transform" active={Boolean(selected&&transformOpen)} disabled={!selected} onPress={()=>setTransformOpen(!transformOpen)}/></ScrollView></View><View style={s.workspace}>{project.viewMode==='2d'?<Workspace2D project={project} preview={preview} apply={apply} commitHistory={commitHistory}/>:<WebGLViewport project={project} preview={preview}/>} {selected&&transformOpen&&<View style={s.quickTransform}><SelectionTransformPanel project={project} selected={selected} apply={apply}/></View>}</View><View style={s.status}><Text style={s.statusText}>{project.viewMode==='3d'?'WebGL 3D · real openings · countertop materials · continuous toe kick':`${Math.round(project.view2d.zoom*100)}% · ${project.view2d.snap?'Snap 5 in':'Snap Off'} · ${project.view2d.grid?'Grid 12 in':'Grid Off'} · ${project.view2d.measurements?'Measurements On':'Measurements Off'}`} · Layout {layoutCounts.errors}E/{layoutCounts.warnings}W</Text><Text style={s.statusText}>{selectedStatus}{project.viewMode==='3d'?'Hover catalog · drag switches to 2D · Wheel Zoom · Drag Orbit':'Hover catalog · drag product to place · Arrows 1 in · Shift+Arrows 5 in'}</Text></View></View>{!maximized&&rightOpen&&<ContextPanel project={project} selected={selected} apply={next=>apply(next)}/>}</View>
  </View>;
}
const s=StyleSheet.create({app:{flex:1,backgroundColor:'#E8ECEA',overflow:'visible'},top:{minHeight:64,backgroundColor:'#17211F',flexDirection:'row',alignItems:'center',paddingHorizontal:10,zIndex:90},brand:{minWidth:190,flexDirection:'row',alignItems:'center',gap:9},logo:{width:38,height:38,borderRadius:10,backgroundColor:'#5EA38F',color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',textAlignVertical:'center'},brandTitle:{color:'#fff',fontSize:17,fontWeight:'900'},projectName:{color:'#AAB9B5',fontSize:11,maxWidth:130},topActions:{alignItems:'center',gap:5,paddingVertical:7},main:{flex:1,flexDirection:'row',zIndex:1},toolbar:{width:94,backgroundColor:'#202C29'},leftPanel:{width:310,backgroundColor:'#F6F8F7',borderRightWidth:1,borderRightColor:'#CCD5D2',padding:12},center:{flex:1,minWidth:0},workspaceHeader:{minHeight:52,backgroundColor:'#F6F8F7',borderBottomWidth:1,borderBottomColor:'#CBD4D1',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},workspaceTitle:{fontSize:15,fontWeight:'900',color:'#1D2A27'},headerActions:{alignItems:'center',gap:3},zoom:{width:44,textAlign:'center',fontSize:12,fontWeight:'900'},workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},quickTransform:{position:'absolute',right:12,top:12,zIndex:20},status:{minHeight:30,backgroundColor:'#17211F',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},statusText:{fontSize:10,color:'#CBD6D3'}});
