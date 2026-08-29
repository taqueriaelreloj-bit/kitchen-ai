import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { planSvgFileName, PlanSvgOptions, projectPlanSvg } from '../domain/planSvg';

type Props={project:EditorProject};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function download(name:string,content:string){
  const blob=new Blob([content],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function PlanSvgExportPanel({project}:Props){
  const[options,setOptions]=useState<PlanSvgOptions>({includeGrid:false,includeMeasurements:true,includeLabels:true,includeTitleBlock:true,gridSpacingIn:12,pageScale:2});
  const svg=useMemo(()=>projectPlanSvg(project,options),[project,options]);
  const preview=useMemo(()=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,[svg]);
  const toggle=(key:keyof Pick<PlanSvgOptions,'includeGrid'|'includeMeasurements'|'includeLabels'|'includeTitleBlock'>)=>setOptions(current=>({...current,[key]:!current[key]}));
  return <View style={s.container}>
    <Text style={s.title}>Export 2D Plan</Text>
    <Text style={s.help}>Create a clean vector plan for printing, sharing or conversion to PDF. Export never changes project dimensions.</Text>
    <View style={s.preview}><Image accessibilityLabel={`Preview of ${project.name} 2D plan`} source={{uri:preview}} resizeMode="contain" style={s.image}/></View>
    <View style={s.wrap}><Button label="Grid" active={options.includeGrid===true} onPress={()=>toggle('includeGrid')}/><Button label="Measurements" active={options.includeMeasurements!==false} onPress={()=>toggle('includeMeasurements')}/><Button label="Labels" active={options.includeLabels!==false} onPress={()=>toggle('includeLabels')}/><Button label="Title Block" active={options.includeTitleBlock!==false} onPress={()=>toggle('includeTitleBlock')}/></View>
    <View style={s.summary}><Text style={s.summaryTitle}>{planSvgFileName(project)}</Text><Text style={s.summaryText}>{project.objects.length} design objects · SVG vector output · Dimensions in inches</Text></View>
    <Button label="Download SVG Plan" active onPress={()=>download(planSvgFileName(project),svg)}/>
    <Text style={s.note}>SVG remains sharp at any print size and can be opened in a browser, design software or converted to PDF. Field-verify all measurements before construction.</Text>
  </View>;
}

const s=StyleSheet.create({container:{paddingBottom:20},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:12,lineHeight:18,color:'#5C6B66',marginBottom:9},preview:{height:190,borderWidth:1,borderColor:'#B7C3BF',borderRadius:10,backgroundColor:'#E9EEEC',padding:8,marginBottom:9},image:{width:'100%',height:'100%'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},button:{minHeight:42,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},summary:{borderWidth:1,borderColor:'#D1D9D6',borderRadius:8,backgroundColor:'#F8FAF9',padding:9,marginVertical:7},summaryTitle:{fontSize:11,fontWeight:'900',color:'#315F55'},summaryText:{fontSize:9,color:'#6A7672',marginTop:3},note:{fontSize:10,lineHeight:16,color:'#707B77',marginTop:7}});
