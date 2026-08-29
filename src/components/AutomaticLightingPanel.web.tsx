import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import {
  applyAutomaticLighting, AutomaticLightingOptions, generateAutomaticLighting,
} from '../domain/lightingLayout';

type Props={project:EditorProject;apply:(project:EditorProject)=>void};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

function Stepper({label,value,suffix,onChange,min,max,step=1}:{label:string;value:number;suffix:string;onChange:(value:number)=>void;min:number;max:number;step?:number}){
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.stepRow}><Button label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={s.stepValue}>{value}{suffix}</Text><Button label="+" onPress={()=>onChange(Math.min(max,value+step))}/></View></View>;
}

export function AutomaticLightingPanel({project,apply}:Props){
  const[options,setOptions]=useState<AutomaticLightingOptions>({recessed:true,pendants:true,underCabinet:true,recessedSpacingIn:54,recessedMarginIn:30,colorTemperatureK:3000,recessedIntensityPercent:78,pendantIntensityPercent:80,underCabinetIntensityPercent:68,pendantDropIn:30,replacePreviousAutomatic:true});
  const plan=useMemo(()=>generateAutomaticLighting(project,options),[project,options]);
  const patch=<K extends keyof AutomaticLightingOptions>(key:K,value:AutomaticLightingOptions[K])=>setOptions(current=>({...current,[key]:value}));
  return <View style={s.container}>
    <Text style={s.title}>Automatic Lighting</Text>
    <Text style={s.help}>Generate a balanced lighting plan from the confirmed room, island and upper cabinets. Every fixture remains editable after placement.</Text>
    <View style={s.wrap}><Button label="Recessed" active={options.recessed!==false} onPress={()=>patch('recessed',options.recessed===false)}/><Button label="Pendants" active={options.pendants!==false} onPress={()=>patch('pendants',options.pendants===false)}/><Button label="Under Cabinet" active={options.underCabinet!==false} onPress={()=>patch('underCabinet',options.underCabinet===false)}/></View>
    <View style={s.preview}><View style={s.metric}><Text style={s.metricNumber}>{plan.recessedCount}</Text><Text style={s.metricLabel}>Recessed</Text></View><View style={s.metric}><Text style={s.metricNumber}>{plan.pendantCount}</Text><Text style={s.metricLabel}>Pendants</Text></View><View style={s.metric}><Text style={s.metricNumber}>{plan.underCabinetCount}</Text><Text style={s.metricLabel}>Under Cabinet</Text></View></View>
    <Stepper label="Recessed spacing" value={options.recessedSpacingIn??54} suffix=" in" min={36} max={72} step={6} onChange={value=>patch('recessedSpacingIn',value)}/>
    <Stepper label="Wall margin" value={options.recessedMarginIn??30} suffix=" in" min={18} max={48} step={3} onChange={value=>patch('recessedMarginIn',value)}/>
    <Stepper label="Pendant drop" value={options.pendantDropIn??30} suffix=" in" min={12} max={60} step={3} onChange={value=>patch('pendantDropIn',value)}/>
    <Text style={s.fieldLabel}>Color Temperature</Text><View style={s.wrap}>{([2700,3000,3500,4000,5000] as const).map(value=><Button key={value} label={`${value}K`} active={options.colorTemperatureK===value} onPress={()=>patch('colorTemperatureK',value)}/>)}</View>
    <View style={s.notice}><Text style={s.noticeTitle}>Room coverage</Text><Text style={s.noticeText}>{Math.round(plan.roomBounds.width)} × {Math.round(plan.roomBounds.height)} in detected. Existing manual lights remain unchanged.</Text></View>
    <Button label={`Generate ${plan.generated.length} Lights`} onPress={()=>apply(applyAutomaticLighting(project,plan,options.replacePreviousAutomatic!==false))}/>
    <Text style={s.note}>Automatic lighting is a design aid. Confirm circuit capacity, local electrical code, fixture photometrics and ceiling conditions before installation.</Text>
  </View>;
}

const s=StyleSheet.create({container:{paddingBottom:18},title:{fontSize:17,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:12,lineHeight:18,color:'#5C6B66',marginBottom:9},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginRight:3,marginBottom:4},buttonActive:{backgroundColor:'#FFF1C9',borderColor:'#B18A2F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#6F4D00'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:3},preview:{flexDirection:'row',gap:5,marginVertical:9},metric:{flex:1,minHeight:60,borderWidth:1,borderColor:'#D0D8D5',borderRadius:9,backgroundColor:'#F8FAF9',alignItems:'center',justifyContent:'center'},metricNumber:{fontSize:20,fontWeight:'900',color:'#8B6511'},metricLabel:{fontSize:8,fontWeight:'800',color:'#65726E',textTransform:'uppercase',textAlign:'center'},field:{marginBottom:8},fieldLabel:{fontSize:11,fontWeight:'800',color:'#4D5C57',marginBottom:4},stepRow:{flexDirection:'row',alignItems:'center'},stepValue:{minWidth:90,textAlign:'center',fontSize:13,fontWeight:'900',color:'#263530'},notice:{borderWidth:1,borderColor:'#D7C996',borderRadius:9,backgroundColor:'#FFF9E9',padding:9,marginVertical:8},noticeTitle:{fontSize:11,fontWeight:'900',color:'#765718'},noticeText:{fontSize:10,lineHeight:15,color:'#6A624E',marginTop:2},note:{fontSize:10,lineHeight:16,color:'#707B77',marginTop:7}});
