import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { parseProject, projectFileName, projectScheduleCsv, serializeProject, summarizeProject } from '../domain/projectIO';

function Button({label,onPress}:{label:string;onPress:()=>void}) { return <Pressable accessibilityRole="button" onPress={onPress} style={s.button}><Text style={s.buttonText}>{label}</Text></Pressable>; }
function Section({title,children}:{title:string;children:ReactNode}) { return <View style={s.section}><Text style={s.title}>{title}</Text>{children}</View>; }
function download(name:string,content:string,type:string) { const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=name; anchor.style.display='none'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(()=>URL.revokeObjectURL(url),0); }
function importFile(apply:(project:EditorProject)=>void,onError:(message:string)=>void) { const input=document.createElement('input'); input.type='file'; input.accept='.json,.kitchenai.json,application/json'; input.onchange=()=>{ const file=input.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{ const project=parseProject(String(reader.result??'')); if(!project){onError('This file is not a valid Kitchen AI project.');return;} apply(project); }; reader.onerror=()=>onError('Kitchen AI could not read this project file.'); reader.readAsText(file); }; input.click(); }

export function ProjectPanel({project,apply,onMessage}:{project:EditorProject;apply:(project:EditorProject)=>void;onMessage:(message:string)=>void}) {
  const summary=summarizeProject(project);
  return <View><Section title="Project"><Text style={s.projectName}>{project.name}</Text><Text style={s.help}>Kitchen AI project v{summary.version} · {summary.objectCount} design objects</Text><Button label="Open Project File" onPress={()=>importFile(apply,onMessage)}/><Text style={s.help}>Older Kitchen AI project files are migrated automatically when possible.</Text></Section><Section title="Project Summary"><Text style={s.summary}>Walls {summary.walls} · Cabinets {summary.cabinets} · Islands {summary.islands}</Text><Text style={s.summary}>Countertops {summary.countertops} · Openings {summary.openings} · Appliances {summary.appliances}</Text><Text style={s.summary}>Lighting {summary.lighting}</Text></Section></View>;
}

export function ExportPanel({project,onMessage}:{project:EditorProject;onMessage:(message:string)=>void}) {
  return <View><Section title="Export Project"><Button label="Download Kitchen AI Project" onPress={()=>{download(projectFileName(project),serializeProject(project),'application/json;charset=utf-8');onMessage('Project file exported.');}}/><Text style={s.help}>Use this file to reopen the complete editable project later.</Text></Section><Section title="Export Schedule"><Button label="Download Object Schedule CSV" onPress={()=>{download(projectFileName(project).replace('.kitchenai.json','-schedule.csv'),projectScheduleCsv(project),'text/csv;charset=utf-8');onMessage('Object schedule exported.');}}/><Text style={s.help}>CSV includes dimensions, materials, finishes, toe kick, hardware, openings, lighting, countertop and island notes.</Text></Section></View>;
}

const s=StyleSheet.create({section:{gap:9,marginBottom:18},title:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},projectName:{fontSize:18,fontWeight:'900',color:'#1D2A27'},help:{fontSize:13,lineHeight:19,color:'#5C6B66'},summary:{fontSize:13,fontWeight:'700',color:'#34443E',lineHeight:20},button:{minHeight:44,borderWidth:1,borderColor:'#91AAA2',borderRadius:9,backgroundColor:'#fff',paddingHorizontal:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:13,fontWeight:'800',color:'#21483D'}});
