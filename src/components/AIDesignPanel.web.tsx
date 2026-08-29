import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { buildAIDesignPreview, previewObjectStyle } from '../domain/aiDesignPreview';
import { EditorObject, EditorProject, isCabinetKind } from '../domain/editor';
import { isLighting } from '../domain/lighting';
import { Button } from './EditorPanels.web';

const VIEWPORT={width:254,height:150};

function objectColor(object:EditorObject){
  if(object.kind==='wall')return '#AEBAB6';
  if(object.kind==='door')return '#8A664B';
  if(object.kind==='window')return '#7DB8D0';
  if(object.kind==='island')return object.color??'#D7D1C5';
  if(object.kind==='countertop')return '#DCD9D1';
  if(object.kind==='appliance'&&!isLighting(object))return '#727A7B';
  if(isLighting(object))return '#E0A94A';
  if(isCabinetKind(object.kind))return object.color??'#D6D2C8';
  return object.color??'#B9C2BE';
}

function PreviewObject({object,preview}:{object:EditorObject;preview:ReturnType<typeof buildAIDesignPreview>}){
  const frame=previewObjectStyle(object,preview.bounds,VIEWPORT);
  return <View pointerEvents="none" style={[s.previewObject,{
    left:frame.left,
    top:frame.top,
    width:frame.width,
    height:frame.height,
    backgroundColor:objectColor(object),
    borderColor:object.kind==='wall'?'#76827E':'#596762',
  }]}/>;
}

export function AIDesignPanel({project,apply}:{project:EditorProject;apply:(project:EditorProject)=>void}){
  const suggestions=useMemo(()=>aiDesignSuggestions(project),[project.room,project.design]);
  const previews=useMemo(()=>suggestions.map(suggestion=>buildAIDesignPreview(project,suggestion)),[project,suggestions]);
  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>AI Design</Text>
    <Text style={s.help}>Compare room-aware layouts before applying one. Walls, doors, windows and lighting remain in place, and openings are kept clear.</Text>
    {suggestions.map((suggestion,index)=>{
      const preview=previews[index];
      return <View key={suggestion.id} style={s.card}>
        <View style={s.cardHeader}><View><Text style={s.option}>OPTION {index+1}</Text><Text style={s.name}>{suggestion.name}</Text></View><Text style={s.styleBadge}>{suggestion.style}</Text></View>
        <View accessibilityLabel={`Preview of ${suggestion.name}`} style={s.preview}>
          <View style={s.previewGrid}/>
          {preview.project.objects.map(object=><PreviewObject key={object.id} object={object} preview={preview}/>)}
        </View>
        <Text style={s.description}>{suggestion.description}</Text>
        <View style={s.metrics}>
          <View style={s.metric}><Text style={s.metricNumber}>{preview.cabinetCount}</Text><Text style={s.metricLabel}>Cabinets</Text></View>
          <View style={s.metric}><Text style={s.metricNumber}>{preview.applianceCount}</Text><Text style={s.metricLabel}>Appliances</Text></View>
          <View style={s.metric}><Text style={s.metricNumber}>{preview.openingCount}</Text><Text style={s.metricLabel}>Openings</Text></View>
          <View style={s.metric}><Text style={s.metricNumber}>{preview.hasIsland?'Yes':'No'}</Text><Text style={s.metricLabel}>Island</Text></View>
        </View>
        <View style={s.metaRow}><Text style={s.meta}>{suggestion.layout}</Text><Text style={s.meta}>{preview.sinkCount>0?'Sink included':'Check sink'}</Text><Text style={s.meta}>{preview.hasIsland?'36 in aisle checked':'No island aisle'}</Text></View>
        <Button label="Apply This Design" onPress={()=>apply(applyAIDesignSuggestion(project,suggestion))}/>
      </View>;
    })}
    <View style={s.noteCard}><Text style={s.noteTitle}>Fully editable</Text><Text style={s.note}>After applying a design, move cabinets, change dimensions, finishes, hardware, countertops, appliances or lighting. Use Undo to return to the previous layout.</Text></View>
  </ScrollView>;
}

const s=StyleSheet.create({
  container:{paddingBottom:24},title:{fontSize:19,fontWeight:'900',color:'#1D2A27',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:12},card:{borderWidth:1,borderColor:'#CBD5D1',backgroundColor:'#FFFFFF',borderRadius:12,padding:11,marginBottom:12},cardHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},option:{fontSize:10,fontWeight:'900',color:'#507C6E'},name:{fontSize:15,fontWeight:'900',color:'#1F2E29',marginTop:3,maxWidth:205},styleBadge:{overflow:'hidden',borderRadius:6,backgroundColor:'#E4ECE9',paddingHorizontal:7,paddingVertical:4,fontSize:9,fontWeight:'900',color:'#315F55',textTransform:'uppercase'},preview:{width:VIEWPORT.width,height:VIEWPORT.height,marginTop:9,marginBottom:8,borderWidth:1,borderColor:'#AEBAB6',borderRadius:8,backgroundColor:'#E4E9E7',overflow:'hidden',position:'relative'},previewGrid:{position:'absolute',left:0,right:0,top:0,bottom:0,opacity:.45,backgroundColor:'#E8ECEA'},previewObject:{position:'absolute',borderWidth:1,minWidth:2,minHeight:2},description:{fontSize:12,lineHeight:18,color:'#596963',marginBottom:8},metrics:{flexDirection:'row',gap:5,marginBottom:8},metric:{flex:1,minHeight:52,borderWidth:1,borderColor:'#D4DDDA',borderRadius:8,backgroundColor:'#F7F9F8',alignItems:'center',justifyContent:'center'},metricNumber:{fontSize:15,fontWeight:'900',color:'#315F55'},metricLabel:{fontSize:8,fontWeight:'800',color:'#68756F',textTransform:'uppercase'},metaRow:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:8},meta:{overflow:'hidden',borderRadius:5,backgroundColor:'#E9EFED',paddingHorizontal:6,paddingVertical:3,fontSize:9,fontWeight:'800',color:'#3E514A',textTransform:'capitalize'},noteCard:{borderWidth:1,borderColor:'#AFC3BC',borderRadius:10,backgroundColor:'#EEF5F2',padding:11},noteTitle:{fontSize:13,fontWeight:'900',color:'#285448'},note:{fontSize:12,lineHeight:18,color:'#5D6D67',marginTop:3},
});
