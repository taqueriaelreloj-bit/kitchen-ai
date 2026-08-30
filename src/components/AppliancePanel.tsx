import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  APPLIANCE_CATALOG,
  APPLIANCE_FINISHES,
  ApplianceFinishId,
  ApplianceInstallation,
  applianceData,
  changeApplianceFinish,
  createAppliance,
  isKitchenAppliance,
  updateAppliance,
} from '../domain/appliances';
import { EditorObject, EditorProject, updateObject } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};
const INSTALLATIONS:ApplianceInstallation[]=['Freestanding','Slide-In','Built-In','Counter-Depth','Under-Counter','Wall-Mounted'];
const HANDLES=['Professional','Integrated','Pocket','None'] as const;

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}
function Stepper({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(value:number)=>void}){
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}><Button label="−" onPress={()=>onChange(Math.max(min,Math.round((value-1)*10)/10))}/><Text style={s.value}>{Math.round(value*10)/10} in</Text><Button label="+" onPress={()=>onChange(Math.min(max,Math.round((value+1)*10)/10))}/></View></View>;
}

export function AppliancePanel({project,selected,apply,compact=false}:Props){
  const[configuration,setConfiguration]=useState('');
  const appliance=selected&&isKitchenAppliance(selected)?selected:undefined,spec=appliance?applianceData(appliance):undefined;
  const add=(type:Parameters<typeof createAppliance>[0])=>{
    const object=createAppliance(type,{x:160+project.objects.length*7,y:130+project.objects.length*6});
    apply({...project,objects:[...project.objects,object],selectedId:object.id,updatedAt:new Date().toISOString()});
  };
  const update=(patch:Parameters<typeof updateAppliance>[2])=>appliance&&apply(updateAppliance(project,appliance.id,patch));
  const content=<>
    <Text style={s.title}>Appliance Catalog</Text>
    <Text style={s.help}>Add real appliance families with standard starting dimensions. Each appliance remains movable, resizable and saved with its finish and configuration.</Text>
    <View style={s.catalog}>{APPLIANCE_CATALOG.map(item=><Pressable key={item.type} accessibilityRole="button" onPress={()=>add(item.type)} style={s.catalogCard}><Text style={s.catalogIcon}>{item.type==='Refrigerator'?'▥':item.type==='Range Hood'?'⌂':item.type==='Cooktop'?'◉':'▣'}</Text><Text style={s.catalogName}>{item.label}</Text><Text style={s.catalogSize}>{item.widthIn} × {item.depthIn} × {item.heightIn} in</Text><Text numberOfLines={2} style={s.catalogDescription}>{item.description}</Text></Pressable>)}</View>
    {appliance&&spec?<View style={s.selectedCard}>
      <Text style={s.selectedTitle}>{appliance.name}</Text>
      <Text style={s.section}>Type</Text>
      <View style={s.wrap}>{APPLIANCE_CATALOG.map(item=><Button key={item.type} label={item.label} active={spec.type===item.type} onPress={()=>update({type:item.type})}/>)}</View>
      <Text style={s.section}>Finish</Text>
      <View style={s.finishes}>{APPLIANCE_FINISHES.map(finish=><Pressable key={finish.id} accessibilityRole="button" accessibilityState={{selected:spec.finishId===finish.id}} onPress={()=>apply(changeApplianceFinish(project,appliance.id,finish.id as ApplianceFinishId))} style={[s.finish,spec.finishId===finish.id&&s.finishActive]}><View style={[s.finishSwatch,{backgroundColor:finish.color}]}/><Text style={s.finishName}>{finish.name}</Text></Pressable>)}</View>
      <Text style={s.section}>Installation</Text>
      <View style={s.wrap}>{INSTALLATIONS.map(value=><Button key={value} label={value} active={spec.installation===value} onPress={()=>update({installation:value})}/>)}</View>
      <Text style={s.section}>Handle</Text>
      <View style={s.wrap}>{HANDLES.map(value=><Button key={value} label={value} active={spec.handleStyle===value} onPress={()=>update({handleStyle:value})}/>)}</View>
      <Text style={s.section}>Configuration</Text>
      <TextInput value={configuration} onChangeText={setConfiguration} placeholder={spec.configuration} style={s.input}/><Button label="Apply Configuration" disabled={!configuration.trim()} onPress={()=>{update({configuration:configuration.trim()});setConfiguration('');}}/>
      <Text style={s.section}>Dimensions</Text>
      <Stepper label="Width" value={appliance.widthIn} min={6} max={72} onChange={widthIn=>apply(updateObject(project,appliance.id,{widthIn}))}/>
      <Stepper label="Depth" value={appliance.depthIn} min={2} max={60} onChange={depthIn=>apply(updateObject(project,appliance.id,{depthIn}))}/>
      <Stepper label="Height" value={appliance.heightIn} min={2} max={108} onChange={heightIn=>apply(updateObject(project,appliance.id,{heightIn}))}/>
      {spec.type==='Range Hood'&&<Button label={spec.vented?'Vented On':'Vented Off'} active={spec.vented} onPress={()=>update({vented:!spec.vented})}/>} 
    </View>:<Text style={s.note}>Select an appliance to change its type, finish, installation, configuration and dimensions.</Text>}
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:11},catalog:{flexDirection:'row',flexWrap:'wrap',gap:7},catalogCard:{width:'48%',minHeight:126,borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#FFFFFF',padding:9},catalogIcon:{fontSize:23,color:'#315F55'},catalogName:{fontSize:13,fontWeight:'900',color:'#24332E',marginTop:3},catalogSize:{fontSize:9,fontWeight:'800',color:'#557068',marginTop:2},catalogDescription:{fontSize:10,lineHeight:14,color:'#68766F',marginTop:4},selectedCard:{borderTopWidth:1,borderTopColor:'#C8D2CE',marginTop:15,paddingTop:12},selectedTitle:{fontSize:17,fontWeight:'900',color:'#1F2E29'},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},row:{flexDirection:'row',alignItems:'center',gap:5},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},finishes:{flexDirection:'row',flexWrap:'wrap',gap:6},finish:{width:'31%',minHeight:73,borderWidth:1,borderColor:'#C8D2CE',borderRadius:8,backgroundColor:'#FFFFFF',padding:5},finishActive:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#E7F1ED'},finishSwatch:{height:34,borderRadius:5,borderWidth:1,borderColor:'#AAB3AF'},finishName:{fontSize:9,fontWeight:'800',color:'#33413C',marginTop:3},input:{minHeight:44,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:10,backgroundColor:'#FFFFFF',fontSize:13,fontWeight:'700',color:'#24332E',marginBottom:6},field:{gap:4,marginBottom:7},label:{fontSize:11,fontWeight:'800',color:'#46564F'},value:{minWidth:70,textAlign:'center',fontSize:12,fontWeight:'900',color:'#263530'},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:13}});
