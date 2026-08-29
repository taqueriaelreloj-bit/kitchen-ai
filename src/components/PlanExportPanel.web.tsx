import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { projectPlanFileName, projectPlanSvg } from '../domain/planExport';

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function download(name:string,content:string){
  const blob=new Blob([content],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function PlanExportPanel({project,onMessage}:{project:EditorProject;onMessage?:(message:string)=>void}){
  const[grid,setGrid]=useState(true),[measurements,setMeasurements]=useState(true),[labels,setLabels]=useState(true),[titleBlock,setTitleBlock]=useState(true);
  const svg=useMemo(()=>projectPlanSvg(project,{grid,measurements,labels,titleBlock}),[project,grid,measurements,labels,titleBlock]);
  return <View style={s.section}>
    <Text style={s.title}>2D Vector Plan</Text>
    <Text style={s.help}>Export a scalable SVG with real project geometry. Zoom never changes the dimensions or exported positions.</Text>
    <View style={s.options}><Button label="Grid" active={grid} onPress={()=>setGrid(!grid)}/><Button label="Measurements" active={measurements} onPress={()=>setMeasurements(!measurements)}/><Button label="Labels" active={labels} onPress={()=>setLabels(!labels)}/><Button label="Title Block" active={titleBlock} onPress={()=>setTitleBlock(!titleBlock)}/></View>
    <View style={s.preview} dangerouslySetInnerHTML={{__html:svg}}/>
    <Button label="Download 2D Plan SVG" onPress={()=>{download(projectPlanFileName(project),svg);onMessage?.('2D vector plan exported.');}}/>
    <Text style={s.note}>SVG is a digital vector drawing, not a permit or fabrication document. Dimensions govern; verify field conditions before construction.</Text>
  </View>;
}

const s=StyleSheet.create({section:{gap:8,marginBottom:18},title:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},help:{fontSize:13,lineHeight:19,color:'#5C6B66'},options:{flexDirection:'row',flexWrap:'wrap',gap:4},button:{minHeight:42,borderWidth:1,borderColor:'#91AAA2',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#21483D'},buttonTextActive:{color:'#0E4939'},preview:{height:190,borderWidth:1,borderColor:'#CBD5D1',borderRadius:9,backgroundColor:'#FFFFFF',overflow:'hidden'} as any,note:{fontSize:10,lineHeight:15,color:'#697670'}});
