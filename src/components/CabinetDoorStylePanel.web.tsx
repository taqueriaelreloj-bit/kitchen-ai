import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  applyCabinetDoorStyle, cabinetDoorStyleId, CABINET_DOOR_STYLES, CabinetDoorStyle,
} from '../domain/cabinetDoorStyles';
import { CabinetScope, EditorObject, EditorProject } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

function DoorPreview({style}:{style:CabinetDoorStyle}){
  if(style.id==='slab')return <View style={s.previewSlab}/>;
  return <View style={s.previewFrame}>
    <View style={[s.previewRail,s.previewTop]}/><View style={[s.previewRail,s.previewBottom]}/><View style={[s.previewStile,s.previewLeft]}/><View style={[s.previewStile,s.previewRight]}/>
    <View style={[s.previewCenter,style.glass&&s.previewGlass,style.id==='raised-panel'&&s.previewRaised,style.id==='recessed-panel'&&s.previewRecessed]}>
      {style.texture==='beadboard'&&Array.from({length:5},(_,index)=><View key={index} style={[s.previewBead,{left:`${16+index*17}%` as any}]}/>)}
      {style.texture==='louvered'&&Array.from({length:7},(_,index)=><View key={index} style={[s.previewLouver,{top:`${12+index*12}%` as any}]}/>)}
    </View>
  </View>;
}

export function CabinetDoorStylePanel({project,selected,apply}:Props){
  const[scope,setScope]=useState<CabinetScope>('selected');
  const selectedStyle=selected?cabinetDoorStyleId(selected):undefined;
  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Cabinet Door Style</Text>
    <Text style={s.help}>Choose a professional door profile and apply it to the selected cabinet, a cabinet group or the entire kitchen.</Text>
    <View style={s.scope}>{(['selected','base','wall','island','all'] as CabinetScope[]).map(value=><Button key={value} label={value==='selected'?'Selected':value==='base'?'Base/Tall':value==='wall'?'Wall':value==='island'?'Island':'All'} active={scope===value} onPress={()=>setScope(value)}/>)}</View>
    <View style={s.grid}>{CABINET_DOOR_STYLES.map(style=><Pressable accessibilityRole="button" accessibilityState={{selected:selectedStyle===style.id}} key={style.id} onPress={()=>apply(applyCabinetDoorStyle(project,style.id,scope))} style={[s.card,selectedStyle===style.id&&s.cardSelected]}>
      <View style={s.preview}><DoorPreview style={style}/></View>
      <Text style={s.name}>{style.name}</Text>
      <Text numberOfLines={3} style={s.description}>{style.description}</Text>
      <View style={s.tags}><Text style={s.tag}>{style.texture.replace(/-/g,' ')}</Text>{style.glass&&<Text style={s.tag}>glass</Text>}{style.marketCommon&&<Text style={s.tag}>popular</Text>}</View>
    </Pressable>)}</View>
    <Text style={s.note}>Door-style geometry is stored with the cabinet and remains after duplicate, save/load and Undo/Redo operations.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
  container:{paddingBottom:24},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},scope:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:10},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginBottom:3},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},card:{width:'47.5%',borderWidth:1,borderColor:'#C6D0CC',borderRadius:10,backgroundColor:'#FFFFFF',padding:8},cardSelected:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#EEF5F2'},preview:{height:86,borderRadius:7,backgroundColor:'#E9E4DA',alignItems:'center',justifyContent:'center',marginBottom:6},previewSlab:{width:54,height:68,borderWidth:1,borderColor:'#928A7D',backgroundColor:'#D1C6B4'},previewFrame:{width:54,height:68,borderWidth:1,borderColor:'#928A7D',backgroundColor:'#D1C6B4',position:'relative'},previewRail:{position:'absolute',left:0,right:0,height:11,backgroundColor:'#B8A98F'},previewTop:{top:0},previewBottom:{bottom:0},previewStile:{position:'absolute',top:11,bottom:11,width:9,backgroundColor:'#B8A98F'},previewLeft:{left:0},previewRight:{right:0},previewCenter:{position:'absolute',left:9,right:9,top:11,bottom:11,backgroundColor:'#C7BBA5',overflow:'hidden'},previewGlass:{backgroundColor:'#AED0D9',opacity:.72},previewRaised:{borderWidth:3,borderColor:'#A99A81'},previewRecessed:{borderWidth:1,borderColor:'#958A76',backgroundColor:'#BEB29D'},previewBead:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:'#988A73'},previewLouver:{position:'absolute',left:1,right:1,height:2,backgroundColor:'#968873',transform:[{rotate:'-5deg'}]},name:{fontSize:12,fontWeight:'900',color:'#25342F'},description:{fontSize:9,lineHeight:13,color:'#65716D',marginTop:3,minHeight:39},tags:{flexDirection:'row',flexWrap:'wrap',gap:3,marginTop:5},tag:{overflow:'hidden',borderRadius:4,backgroundColor:'#E8EEEB',paddingHorizontal:4,paddingVertical:2,fontSize:7,fontWeight:'800',color:'#4B5C56',textTransform:'uppercase'},note:{fontSize:11,lineHeight:17,color:'#6A7672',marginTop:10},
});
