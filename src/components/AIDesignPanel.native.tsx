import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { EditorProject } from '../domain/editor';
import * as LayoutCheck from '../domain/layoutCheck';

type Props={project:EditorProject;apply:(project:EditorProject)=>void};
type Tab='designs'|'check';
type AnyIssue={
  id?:string;
  severity?:'error'|'warning'|'info'|string;
  code?:string;
  title?:string;
  message?:string;
  description?:string;
  objectId?:string;
  objectIds?:string[];
  relatedObjectIds?:string[];
};

function runCheck(project:EditorProject){
  const module=LayoutCheck as unknown as Record<string,unknown>;
  const checker=(module.checkKitchenLayout??module.runLayoutCheck??module.checkLayout??module.validateKitchenLayout??module.validateLayout) as ((project:EditorProject)=>unknown)|undefined;
  if(!checker)return{issues:[] as AnyIssue[]};
  const result=checker(project) as any;
  return{issues:Array.isArray(result)?result:Array.isArray(result?.issues)?result.issues:[] as AnyIssue[]};
}

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

const issueTitle=(issue:AnyIssue)=>issue.title??issue.message??issue.description??issue.code??'Layout issue';
const issueDetail=(issue:AnyIssue)=>issue.title?(issue.message??issue.description):issue.description;
const targetId=(issue:AnyIssue)=>issue.objectId??issue.objectIds?.[0]??issue.relatedObjectIds?.[0];

export function AIDesignPanel({project,apply}:Props){
  const[tab,setTab]=useState<Tab>('designs');
  const suggestions=useMemo(()=>aiDesignSuggestions(project),[project.room,project.design]);
  const report=useMemo(()=>runCheck(project),[project]);
  const errors=report.issues.filter(issue=>issue.severity==='error').length;
  const warnings=report.issues.filter(issue=>issue.severity==='warning').length;
  const info=report.issues.length-errors-warnings;

  return <View style={s.root}>
    <View style={s.tabs}><Button label="AI Designs" active={tab==='designs'} onPress={()=>setTab('designs')}/><Button label={`Layout Check ${errors+warnings?`(${errors+warnings})`:''}`} active={tab==='check'} onPress={()=>setTab('check')}/></View>
    {tab==='designs'?<ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>AI Design</Text>
      <Text style={s.help}>Generate layouts from the scanned room. Walls, doors, windows and lighting remain in place. Each applied proposal is one Undo step.</Text>
      {suggestions.map((suggestion,index)=><View key={suggestion.id} style={s.card}>
        <Text style={s.option}>OPTION {index+1}</Text>
        <Text style={s.name}>{suggestion.name}</Text>
        <Text style={s.description}>{suggestion.description}</Text>
        <View style={s.metaRow}><Text style={s.meta}>{suggestion.layout}</Text><Text style={s.meta}>{suggestion.style}</Text><Text style={s.meta}>{suggestion.includesIsland?'Island':'No Island'}</Text></View>
        <Button label="Apply This Design" onPress={()=>apply(applyAIDesignSuggestion(project,suggestion))}/>
      </View>)}
      <Text style={s.note}>Suggestions remain fully editable. Confirm final clearances and measurements before construction.</Text>
    </ScrollView>:<ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>Layout Check</Text>
      <Text style={s.help}>Review work zones, collisions, island aisles, room boundaries and wall openings before exporting or estimating.</Text>
      <View style={s.summary} accessibilityLabel={`${errors} errors, ${warnings} warnings, ${info} information messages`}>
        <View style={s.summaryCell}><Text style={[s.summaryNumber,s.errorText]}>{errors}</Text><Text style={s.summaryLabel}>Errors</Text></View>
        <View style={s.summaryCell}><Text style={[s.summaryNumber,s.warningText]}>{warnings}</Text><Text style={s.summaryLabel}>Warnings</Text></View>
        <View style={s.summaryCell}><Text style={s.summaryNumber}>{info}</Text><Text style={s.summaryLabel}>Info</Text></View>
      </View>
      {report.issues.length===0?<View style={s.okCard}><Text style={s.okTitle}>✓ Layout check passed</Text><Text style={s.okText}>No blocking layout problems were detected.</Text></View>:report.issues.map((issue,index)=>{
        const severity=issue.severity==='error'?'error':issue.severity==='warning'?'warning':'info';
        const target=targetId(issue);
        return <View key={issue.id??`${issue.code??severity}-${index}`} style={[s.issue,severity==='error'&&s.issueError,severity==='warning'&&s.issueWarning]}>
          <View style={s.issueHeader}><Text style={[s.badge,severity==='error'&&s.badgeError,severity==='warning'&&s.badgeWarning]}>{severity.toUpperCase()}</Text><Text style={s.issueTitle}>{issueTitle(issue)}</Text></View>
          {!!issueDetail(issue)&&<Text style={s.issueDetail}>{issueDetail(issue)}</Text>}
          {target&&<Button label="Select Problem Object" onPress={()=>apply({...project,selectedId:target})}/>} 
        </View>;
      })}
      <Text style={s.note}>Layout Check is a design aid. Confirm local codes, manufacturer requirements and field dimensions.</Text>
    </ScrollView>}
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1},tabs:{flexDirection:'row',gap:6,paddingBottom:8},content:{paddingBottom:28},button:{minHeight:46,borderWidth:1,borderColor:'#AFC0BA',borderRadius:10,backgroundColor:'#FFFFFF',paddingHorizontal:12,alignItems:'center',justifyContent:'center',marginBottom:5,flexShrink:1},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:13,fontWeight:'800',color:'#263530',textAlign:'center'},buttonTextActive:{color:'#0E4939'},title:{fontSize:20,fontWeight:'900',color:'#1D2A27',marginBottom:6},help:{fontSize:14,lineHeight:21,color:'#5C6B66',marginBottom:12},card:{borderWidth:1,borderColor:'#CBD5D1',backgroundColor:'#FFFFFF',borderRadius:12,padding:13,marginBottom:11},option:{fontSize:10,fontWeight:'900',color:'#507C6E'},name:{fontSize:17,fontWeight:'900',color:'#1F2E29',marginTop:3},description:{fontSize:13,lineHeight:19,color:'#596963',marginVertical:7},metaRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:9},meta:{overflow:'hidden',borderRadius:6,backgroundColor:'#E9EFED',paddingHorizontal:7,paddingVertical:4,fontSize:10,fontWeight:'800',color:'#3E514A',textTransform:'capitalize'},note:{fontSize:12,lineHeight:18,color:'#66736E',marginTop:4},summary:{flexDirection:'row',gap:7,marginBottom:12},summaryCell:{flex:1,minHeight:70,borderWidth:1,borderColor:'#CBD5D1',borderRadius:11,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},summaryNumber:{fontSize:24,fontWeight:'900',color:'#315F55'},summaryLabel:{fontSize:10,fontWeight:'800',color:'#596963',textTransform:'uppercase'},errorText:{color:'#A33B32'},warningText:{color:'#8A641D'},okCard:{borderWidth:1,borderColor:'#8BB4A7',borderRadius:11,backgroundColor:'#E8F3EF',padding:14,marginBottom:10},okTitle:{fontSize:15,fontWeight:'900',color:'#225C4B'},okText:{fontSize:13,lineHeight:19,color:'#49675E',marginTop:3},issue:{borderWidth:1,borderColor:'#C7D2CE',borderRadius:11,backgroundColor:'#FFFFFF',padding:12,marginBottom:9},issueError:{borderColor:'#D5A7A2',backgroundColor:'#FFF8F7'},issueWarning:{borderColor:'#D8C38D',backgroundColor:'#FFFCF3'},issueHeader:{flexDirection:'row',alignItems:'flex-start',gap:7},badge:{overflow:'hidden',borderRadius:5,backgroundColor:'#DCE8E4',color:'#315F55',fontSize:8,fontWeight:'900',paddingHorizontal:5,paddingVertical:3},badgeError:{backgroundColor:'#F1D7D4',color:'#8E2E27'},badgeWarning:{backgroundColor:'#F2E7C7',color:'#755313'},issueTitle:{flex:1,fontSize:14,lineHeight:19,fontWeight:'900',color:'#23322D'},issueDetail:{fontSize:13,lineHeight:19,color:'#5A6964',marginTop:6},
});
