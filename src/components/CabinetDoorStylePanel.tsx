import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { applyCabinetDoorStyle, CABINET_DOOR_STYLES, cabinetDoorStyleId, CabinetDoorStyle } from '../domain/cabinetDoorStyles';
import { CabinetScope, EditorObject, EditorProject, isCabinetKind } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function Preview({style}:{style:CabinetDoorStyle}){
  if(style.id==='slab')return <View style={s.preview}><View style={s.slab}/></View>;
  return <View style={s.preview}><View style={s.doorFrame}><View style={[s.centerPanel,style.glass&&s.glass,style.id==='raised-panel'&&s.raised]}/>{style.grooveCount>0&&Array.from({length:style.grooveCount},(_,index)=><View key={index} style={[s.groove,{left:`${(index+1)*100/(style.grooveCount+1)}%`}]} />)}</View></View>;
}

export function CabinetDoorStylePanel({project,selected,apply}:Props){
  const[scope,setScope]=useState<CabinetScope>('selected');
  const cabinet=selected&&isCabinetKind(selected.kind)?selected:undefined;
  const current=cabinet?cabinetDoorStyleId(cabinet):undefined;
  return <View style={s.section}>
    <Text style={s.title}>Door Style</Text>
    <Text style={s.help}>Choose the cabinet front profile. Styles change the shared 3D door geometry and are saved with the project.</Text>
    <View style={s.scope}>{(['selected','base','wall','island','all'] as CabinetScope[]).map(value=><Button key={value} label={value==='selected'?'Selected':value==='base'?'Base/Tall':value==='wall'?'Wall':value==='island'?'Island':'All'} active={scope===value} onPress={()=>setScope(value)}/>)}</View>
    <View style={s.grid}>{CABINET_DOOR_STYLES.map(style=><Pressable accessibilityRole="button" accessibilityState={{selected:current===style.id}} key={style.id} onPress={()=>apply(applyCabinetDoorStyle(project,style.id,scope))} style={[s.card,current===style.id&&s.selected]}><Preview style={style}/><Text style={s.name}>{style.displayName}</Text><Text numberOfLines={2} style={s.description}>{style.description}</Text></Pressable>)}</View>
  </View>;
}

const s=StyleSheet.create({section:{marginBottom:10},title:{fontSize:12,fontWeight:'900',color:'#30423B',textTransform:'uppercase',marginBottom:5},help:{fontSize:11,lineHeight:16,color:'#68756F',marginBottom:7},scope:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:7},button:{minHeight:39,borderWidth:1,borderColor:'#AFC0BA',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:8,alignItems:'center',justifyContent:'center',marginBottom:3},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:10,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},grid:{flexDirection:'row',flexWrap:'wrap',gap:7},card:{width:'48%',minHeight:126,borderWidth:2,borderColor:'transparent',borderRadius:10,backgroundColor:'#F7F9F8',padding:7,alignItems:'center'},selected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},preview:{width:54,height:66,alignItems:'center',justifyContent:'center'},slab:{width:45,height:58,borderWidth:1,borderColor:'#6A756F',borderRadius:2,backgroundColor:'#D8D4CA'},doorFrame:{position:'relative',width:45,height:58,borderWidth:6,borderColor:'#BEB9AE',backgroundColor:'#BEB9AE'},centerPanel:{flex:1,borderWidth:1,borderColor:'#8B8F8C',backgroundColor:'#9E9C95'},glass:{backgroundColor:'#B9D5DD88',borderColor:'#7294A0'},raised:{borderWidth:3,borderColor:'#AEA99D',backgroundColor:'#CAC5B9'},groove:{position:'absolute',top:6,bottom:6,width:1,backgroundColor:'#777B76'},name:{fontSize:10,fontWeight:'900',color:'#293833',textAlign:'center'},description:{fontSize:8,lineHeight:12,color:'#6A7772',textAlign:'center',marginTop:2}});
