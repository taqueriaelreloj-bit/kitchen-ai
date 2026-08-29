import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COUNTERTOP_MATERIALS, EDGE_PROFILES } from '../domain/countertops';
import {
  countertopRunSummary,
  detachCountertopFromRun,
  normalizeCountertopRun,
  updateCountertopRun,
  updateCountertopRunEdge,
  updateCountertopRunMaterial,
} from '../domain/countertopRunControls';
import { EditorObject, EditorProject } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}
function Stepper({label,value,min,max,step=.25,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}){
  const next=(direction:number)=>Math.max(min,Math.min(max,Math.round((value+direction*step)*100)/100));
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}><Button label="−" onPress={()=>onChange(next(-1))}/><Text style={s.value}>{Math.round(value*100)/100} in</Text><Button label="+" onPress={()=>onChange(next(1))}/></View></View>;
}

export function CountertopRunPanel({project,selected,apply,compact=false}:Props){
  const summary=selected?countertopRunSummary(project,selected.id):undefined;
  const content=<>
    <Text style={s.title}>Continuous Countertop</Text>
    <Text style={s.help}>Edit every compatible cabinet in the selected countertop run. Sink and cooktop cutouts remain tied to their original cabinet.</Text>
    {selected&&summary?<>
      <View style={s.summary}><Text style={s.summaryTitle}>{summary.cabinetCount>1?`${summary.cabinetCount}-Cabinet Run`:'Single Countertop'}</Text><Text style={s.summaryLine}>{Math.round(summary.widthIn*10)/10} in long · {Math.round(summary.depthIn*10)/10} in deep · {Math.round(summary.rotation*10)/10}°</Text><Text style={s.summaryLine}>{summary.sinkCount} sink cutout · {summary.cooktopCount} cooktop cutout</Text></View>
      <Text style={s.section}>Material</Text>
      <View style={s.materials}>{COUNTERTOP_MATERIALS.map(material=><Pressable key={material.id} accessibilityRole="button" accessibilityState={{selected:summary.materialId===material.id}} onPress={()=>apply(updateCountertopRunMaterial(project,selected.id,material.id))} style={[s.material,summary.materialId===material.id&&s.materialActive]}><View style={[s.swatch,{backgroundColor:material.color}]}/><Text style={s.materialName}>{material.name}</Text></Pressable>)}</View>
      <Text style={s.section}>Slab</Text>
      <Stepper label="Thickness" value={summary.thicknessIn} min={.5} max={4} onChange={value=>apply(updateCountertopRun(project,selected.id,{thicknessIn:value}))}/>
      <Stepper label="Front Overhang" value={summary.overhangFrontIn} min={0} max={24} onChange={value=>apply(updateCountertopRun(project,selected.id,{overhangFrontIn:value}))}/>
      <Stepper label="Side Overhang" value={summary.overhangSideIn} min={0} max={24} onChange={value=>apply(updateCountertopRun(project,selected.id,{overhangSideIn:value}))}/>
      <Stepper label="Backsplash" value={summary.backsplashHeightIn} min={0} max={24} onChange={value=>apply(updateCountertopRun(project,selected.id,{backsplashHeightIn:value}))}/>
      <Text style={s.section}>Edge Profile</Text><View style={s.wrap}>{EDGE_PROFILES.map(edge=><Button key={edge} label={edge} active={summary.edgeProfile===edge} onPress={()=>apply(updateCountertopRunEdge(project,selected.id,edge))}/>)}</View>
      <Text style={s.section}>Run Management</Text><View style={s.wrap}><Button label="Normalize Run" onPress={()=>apply(normalizeCountertopRun(project,selected.id))}/><Button label="Separate Selected Piece" disabled={summary.cabinetCount<=1} onPress={()=>apply(detachCountertopFromRun(project,selected.id))}/></View>
      <Text style={s.note}>Separate Selected Piece creates an intentional slab break without moving the cabinet. Use Normalize Run to restore matching specifications.</Text>
    </>:<Text style={s.note}>Select a base cabinet, island or standalone countertop to edit its slab or continuous run.</Text>}
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},summary:{borderWidth:1,borderColor:'#9DB8AE',borderRadius:10,backgroundColor:'#EDF5F2',padding:10},summaryTitle:{fontSize:15,fontWeight:'900',color:'#21332D'},summaryLine:{fontSize:10,lineHeight:15,color:'#5C6C66',marginTop:2},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},materials:{flexDirection:'row',flexWrap:'wrap',gap:6},material:{width:'31%',minHeight:77,borderWidth:1,borderColor:'#C7D2CE',borderRadius:8,backgroundColor:'#FFFFFF',padding:5},materialActive:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#E6F1ED'},swatch:{height:38,borderRadius:5,borderWidth:1,borderColor:'#A8B2AE'},materialName:{fontSize:9,fontWeight:'800',color:'#34423D',marginTop:3},field:{gap:4,marginBottom:7},label:{fontSize:11,fontWeight:'800',color:'#46564F'},row:{flexDirection:'row',alignItems:'center',gap:5},value:{minWidth:68,textAlign:'center',fontSize:12,fontWeight:'900',color:'#263530'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:10}});
