import { Alert, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { DesignReviewExport } from './DesignReviewExport.web';
import { PlanSvgExport } from './PlanSvgExport.web';
import { ExportPanel } from './ProjectExportPanel.web';

type Props={project:EditorProject};

export function AdvancedExportPanel({project}:Props){
  const message=(value:string)=>Alert.alert('Kitchen AI',value);
  return <View style={s.content}>
    <Text style={s.title}>Export</Text>
    <Text style={s.help}>Create editable backups, schedules, a scalable 2D plan and a complete design-review report. Exported dimensions never depend on screen zoom or camera position.</Text>
    <ExportPanel project={project} onMessage={message}/>
    <View style={s.divider}/>
    <PlanSvgExport project={project} onMessage={message}/>
    <View style={s.divider}/>
    <DesignReviewExport project={project} onMessage={message}/>
  </View>;
}

const s=StyleSheet.create({content:{paddingBottom:24},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:12},divider:{height:1,backgroundColor:'#D2DBD8',marginVertical:12}});
