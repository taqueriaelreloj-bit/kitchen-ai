import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { planSvg, planSvgFileName } from '../domain/planSvg';

type Props={project:EditorProject;onMessage?:(message:string)=>void};

function download(name:string,content:string){
  const blob=new Blob([content],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function PlanSvgExport({project,onMessage}:Props){
  return <View style={s.section}>
    <Text style={s.title}>Vector Plan</Text>
    <Pressable accessibilityRole="button" onPress={()=>{download(planSvgFileName(project),planSvg(project));onMessage?.('Vector plan exported.');}} style={s.button}><Text style={s.buttonText}>Download 2D Plan SVG</Text></Pressable>
    <Text style={s.help}>Scalable plan with labels, true dimensions, rotations, digital colors and a 12-inch scale bar. Editor zoom and camera do not affect the export.</Text>
  </View>;
}

const s=StyleSheet.create({section:{gap:9,marginBottom:18},title:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},button:{minHeight:44,borderWidth:1,borderColor:'#91AAA2',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:13,fontWeight:'800',color:'#21483D'},help:{fontSize:13,lineHeight:19,color:'#5C6B66'}});
