import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildDesignReview, designReviewFileName, designReviewHtml } from '../domain/designReview';
import { EditorProject } from '../domain/editor';

type Props={project:EditorProject;onMessage?:(message:string)=>void};

function download(name:string,content:string){
  const blob=new Blob([content],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function DesignReviewExport({project,onMessage}:Props){
  const review=buildDesignReview(project);
  return <View style={s.section}>
    <Text style={s.title}>Design Review Report</Text>
    <View style={s.summary} accessibilityLabel={`${review.counts.errors} errors and ${review.counts.warnings} warnings`}>
      <Text style={[s.status,review.status==='blocked'&&s.blocked,review.status==='review'&&s.review]}>{review.status.toUpperCase()}</Text>
      <Text style={s.count}>{review.counts.errors} errors · {review.counts.warnings} warnings · {review.counts.info} info</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={()=>{download(designReviewFileName(project),designReviewHtml(project));onMessage?.('Design review exported.');}} style={s.button}><Text style={s.buttonText}>Download Design Review HTML</Text></Pressable>
    <Text style={s.help}>Printable report with Layout Check, project integrity, work triangle, planning estimate and Bill of Materials.</Text>
  </View>;
}

const s=StyleSheet.create({section:{gap:9,marginBottom:18},title:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},summary:{borderWidth:1,borderColor:'#CAD4D0',borderRadius:9,backgroundColor:'#F8FAF9',padding:10},status:{alignSelf:'flex-start',overflow:'hidden',borderRadius:999,backgroundColor:'#DDEEE8',paddingHorizontal:8,paddingVertical:4,fontSize:10,fontWeight:'900',color:'#245C4C'},blocked:{backgroundColor:'#F4D8D5',color:'#8C2F27'},review:{backgroundColor:'#F4E7BF',color:'#745214'},count:{fontSize:12,fontWeight:'700',color:'#52625C',marginTop:6},button:{minHeight:44,borderWidth:1,borderColor:'#91AAA2',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:13,fontWeight:'800',color:'#21483D'},help:{fontSize:13,lineHeight:19,color:'#5C6B66'}});
