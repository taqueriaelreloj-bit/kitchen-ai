import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CabinetScope, EditorObject, EditorProject } from '../domain/editor';
import {
  applyToeKickProfile,
  supportsToeKickProfile,
  TOE_KICK_MODES,
  ToeKickMode,
  toeKickProfileData,
} from '../domain/toeKickProfiles';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}
function Stepper({label,value,min,max,step=.25,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(value:number)=>void}){
  const next=(direction:number)=>Math.max(min,Math.min(max,Math.round((value+direction*step)*100)/100));
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}><Button label="−" onPress={()=>onChange(next(-1))}/><Text style={s.value}>{Math.round(value*100)/100} in</Text><Button label="+" onPress={()=>onChange(next(1))}/></View></View>;
}

export function ToeKickProfilePanel({project,selected,apply,compact=false}:Props){
  const[scope,setScope]=useState<CabinetScope>('selected'),[customColor,setCustomColor]=useState('');
  const cabinet=selected&&supportsToeKickProfile(selected)?selected:undefined,spec=cabinet?toeKickProfileData(cabinet):undefined;
  const patch=(next:Parameters<typeof applyToeKickProfile>[1])=>apply(applyToeKickProfile(project,next,scope));
  const scopeLabel=(value:CabinetScope)=>value==='selected'?'Selected':value==='base'?'Base & Tall':value==='island'?'Island':value==='all'?'All Base-Like':'Wall (N/A)';
  const content=<>
    <Text style={s.title}>Toe Kick & Base</Text>
    <Text style={s.help}>Choose a continuous run, individual cabinet toe kick, flush base, furniture legs or decorative base. Geometry moves, rotates, duplicates and saves with each cabinet.</Text>
    <Text style={s.section}>Application</Text>
    <View style={s.wrap}>{(['selected','base','island','all'] as CabinetScope[]).map(value=><Button key={value} label={scopeLabel(value)} active={scope===value} onPress={()=>setScope(value)}/>)}</View>
    <Text style={s.section}>Profile</Text>
    <View style={s.cards}>{TOE_KICK_MODES.map(mode=><Pressable key={mode} accessibilityRole="button" accessibilityState={{selected:spec?.mode===mode}} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({mode:mode as ToeKickMode})} style={[s.card,spec?.mode===mode&&s.cardActive,scope==='selected'&&!cabinet&&s.disabled]}><View style={s.profilePreview}>{mode==='Furniture Legs'?<><View style={[s.leg,{left:7}]}/><View style={[s.leg,{right:7}]}/></>:<View style={[s.basePreview,mode==='Flush'&&s.flushPreview,mode==='Decorative Base'&&s.decorativePreview]}/>}</View><Text style={s.cardName}>{mode}</Text></Pressable>)}</View>
    <Text style={s.section}>Enabled</Text><View style={s.wrap}><Button label="On" active={spec?.enabled===true} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({enabled:true})}/><Button label="Off" active={spec?.enabled===false} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({enabled:false})}/></View>
    {cabinet&&spec&&<>
      <Text style={s.section}>Dimensions</Text>
      <Stepper label="Height" value={spec.heightIn} min={1} max={12} onChange={value=>patch({heightIn:value})}/>
      {spec.mode!=='Flush'&&spec.mode!=='Furniture Legs'&&<Stepper label="Recess" value={spec.recessIn} min={0} max={12} onChange={value=>patch({recessIn:value})}/>} 
      {spec.mode==='Furniture Legs'&&<><Stepper label="Leg Width" value={spec.legWidthIn} min={1} max={6} onChange={value=>patch({legWidthIn:value})}/><Stepper label="Leg Depth" value={spec.legDepthIn} min={1} max={6} onChange={value=>patch({legDepthIn:value})}/></>}
      {spec.mode==='Decorative Base'&&<><Stepper label="Decorative Height" value={spec.decorativeHeightIn} min={2} max={12} onChange={value=>patch({decorativeHeightIn:value,heightIn:value})}/><Stepper label="Trim Projection" value={spec.decorativeProjectionIn} min={0} max={3} onChange={value=>patch({decorativeProjectionIn:value})}/></>}
      <Text style={s.section}>Color & Finish</Text>
      <View style={s.colorRow}><View style={[s.swatch,{backgroundColor:spec.color}]}/><Text style={s.colorText}>{spec.color} · {spec.finish}</Text></View>
      <TextInput value={customColor} onChangeText={setCustomColor} placeholder="#RRGGBB" autoCapitalize="characters" style={s.input}/><Button label="Apply Custom Color" disabled={!/^#[0-9a-fA-F]{6}$/.test(customColor)} onPress={()=>{patch({color:customColor.toUpperCase()});setCustomColor('');}}/>
      <View style={s.wrap}>{['Matte','Satin','Semi-Gloss','Gloss','Natural'].map(finish=><Button key={finish} label={finish} active={spec.finish===finish} onPress={()=>patch({finish})}/>)}</View>
    </>}
    {!cabinet&&<Text style={s.note}>Select a base, tall or island cabinet for custom dimensions, or apply a standard profile to a group.</Text>}
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},row:{flexDirection:'row',alignItems:'center',gap:5},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},cards:{flexDirection:'row',flexWrap:'wrap',gap:7},card:{width:'47%',minHeight:88,borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#FFFFFF',padding:8,alignItems:'center'},cardActive:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#E6F1ED'},profilePreview:{width:70,height:42,borderWidth:1,borderColor:'#899994',backgroundColor:'#E4E0D8',position:'relative',justifyContent:'flex-end'},basePreview:{height:10,marginHorizontal:9,marginBottom:2,backgroundColor:'#5C6763'},flushPreview:{marginHorizontal:0},decorativePreview:{height:15,marginHorizontal:4,borderTopWidth:3,borderTopColor:'#34443F'},leg:{position:'absolute',bottom:1,width:8,height:17,backgroundColor:'#5C6763'},cardName:{fontSize:10,fontWeight:'800',color:'#2C3A35',textAlign:'center',marginTop:6},field:{gap:4,marginBottom:7},label:{fontSize:11,fontWeight:'800',color:'#46564F'},value:{minWidth:68,textAlign:'center',fontSize:12,fontWeight:'900',color:'#263530'},colorRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:7},swatch:{width:42,height:32,borderRadius:6,borderWidth:1,borderColor:'#A9B3AF'},colorText:{fontSize:11,fontWeight:'800',color:'#52615C'},input:{minHeight:42,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:9,backgroundColor:'#FFFFFF',fontSize:13,fontWeight:'700',color:'#24332E',marginBottom:6},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:12}});
