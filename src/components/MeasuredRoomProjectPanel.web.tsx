import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createMeasuredRoomProject, ROOM_PRESETS, RoomMeasurementInput, RoomShape,
  validateMeasuredRoom,
} from '../domain/measuredRoom';
import { EditorProject } from '../domain/editor';

type Props={onCreate:(project:EditorProject)=>void};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function feetInches(inches:number){return`${Math.floor(inches/12)}' ${Math.round(inches%12)}"`;}

function DimensionInput({label,value,onChange,min,max}:{label:string;value:number;onChange:(value:number)=>void;min:number;max:number}){
  const feet=Math.floor(value/12),inches=Math.round(value-feet*12);
  const update=(nextFeet:number,nextInches:number)=>onChange(Math.max(min,Math.min(max,nextFeet*12+nextInches)));
  return <View style={s.dimension}><Text style={s.dimensionLabel}>{label}</Text><View style={s.dimensionRow}><View style={s.numberGroup}><TextInput accessibilityLabel={`${label} feet`} value={String(feet)} keyboardType="number-pad" onChangeText={text=>update(Number(text||0),inches)} style={s.input}/><Text style={s.unit}>ft</Text></View><View style={s.numberGroup}><TextInput accessibilityLabel={`${label} inches`} value={String(inches)} keyboardType="number-pad" onChangeText={text=>update(feet,Math.max(0,Math.min(11,Number(text||0))))} style={s.input}/><Text style={s.unit}>in</Text></View></View></View>;
}

export function MeasuredRoomProjectPanel({onCreate}:Props){
  const[input,setInput]=useState<RoomMeasurementInput>({widthIn:120,lengthIn:144,heightIn:96,shape:'Rectangle',projectName:'My Kitchen'});
  const validation=useMemo(()=>validateMeasuredRoom(input),[input]);
  const patch=<K extends keyof RoomMeasurementInput>(key:K,value:RoomMeasurementInput[K])=>setInput(current=>({...current,[key]:value}));
  const choosePreset=(preset:typeof ROOM_PRESETS[number])=>setInput(current=>({...current,widthIn:preset.widthIn,lengthIn:preset.lengthIn,heightIn:preset.heightIn,shape:preset.shape}));

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Enter Room Measurements</Text>
    <Text style={s.help}>Create a kitchen without using the camera. Start with a common room size, then adjust the measurements before opening the editor.</Text>
    <Text style={s.sectionTitle}>Quick Start</Text>
    <View style={s.presets}>{ROOM_PRESETS.map(preset=><Pressable accessibilityRole="button" key={preset.id} onPress={()=>choosePreset(preset)} style={[s.preset,input.widthIn===preset.widthIn&&input.lengthIn===preset.lengthIn&&input.shape===preset.shape&&s.presetSelected]}><Text style={s.presetName}>{preset.name}</Text><Text style={s.presetSize}>{feetInches(preset.widthIn)} × {feetInches(preset.lengthIn)}</Text><Text style={s.presetDescription}>{preset.description}</Text></Pressable>)}</View>

    <Text style={s.sectionTitle}>Project Name</Text>
    <TextInput accessibilityLabel="Project name" value={input.projectName} onChangeText={value=>patch('projectName',value)} style={s.nameInput}/>

    <Text style={s.sectionTitle}>Room Shape</Text>
    <View style={s.wrap}>{(['Rectangle','L-Shape','U-Shape'] as RoomShape[]).map(shape=><Button key={shape} label={shape} active={input.shape===shape} onPress={()=>patch('shape',shape)}/>)}</View>

    <Text style={s.sectionTitle}>Confirmed Dimensions</Text>
    <DimensionInput label="Width" value={input.widthIn} onChange={value=>patch('widthIn',value)} min={60} max={600}/>
    <DimensionInput label="Length" value={input.lengthIn} onChange={value=>patch('lengthIn',value)} min={60} max={600}/>
    <DimensionInput label="Ceiling Height" value={input.heightIn} onChange={value=>patch('heightIn',value)} min={72} max={240}/>

    <View style={s.summary}><Text style={s.summaryTitle}>Room Summary</Text><Text style={s.summaryValue}>{feetInches(input.widthIn)} × {feetInches(input.lengthIn)} · {feetInches(input.heightIn)} ceiling</Text><Text style={s.summaryText}>{input.shape} · Manual measurement confidence 100%</Text></View>
    {!validation.valid&&<View accessibilityRole="alert" style={s.errorCard}>{validation.errors.map(error=><Text key={error} style={s.error}>• {error}</Text>)}</View>}
    <Button label="Create Kitchen Project" active={validation.valid} onPress={()=>{if(validation.valid)onCreate(createMeasuredRoomProject(input));}}/>
    <Text style={s.note}>Measurements can be adjusted again inside the editor. Confirm all field dimensions before ordering cabinets or starting construction.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{padding:18,paddingBottom:36,backgroundColor:'#F4F7F5'},title:{fontSize:24,fontWeight:'900',color:'#1D2A27'},help:{fontSize:14,lineHeight:21,color:'#5C6B66',marginTop:5,marginBottom:15},sectionTitle:{fontSize:13,fontWeight:'900',color:'#33443E',textTransform:'uppercase',marginTop:8,marginBottom:7},presets:{flexDirection:'row',flexWrap:'wrap',gap:8},preset:{width:'48%',minHeight:112,borderWidth:1,borderColor:'#C6D0CC',borderRadius:11,backgroundColor:'#FFFFFF',padding:11},presetSelected:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#EAF3F0'},presetName:{fontSize:14,fontWeight:'900',color:'#25342F'},presetSize:{fontSize:12,fontWeight:'800',color:'#315F55',marginTop:3},presetDescription:{fontSize:10,lineHeight:15,color:'#68756F',marginTop:5},nameInput:{minHeight:48,borderWidth:1,borderColor:'#B6C3BE',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:12,fontSize:15,fontWeight:'800',color:'#24332E'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:5},button:{minHeight:48,borderWidth:1,borderColor:'#AFC0BA',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:13,alignItems:'center',justifyContent:'center',marginBottom:5},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:13,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},dimension:{borderWidth:1,borderColor:'#CCD5D2',borderRadius:10,backgroundColor:'#FFFFFF',padding:10,marginBottom:8},dimensionLabel:{fontSize:12,fontWeight:'900',color:'#3E4E48',marginBottom:6},dimensionRow:{flexDirection:'row',gap:12},numberGroup:{flex:1,flexDirection:'row',alignItems:'center'},input:{flex:1,minHeight:44,borderWidth:1,borderColor:'#BDC9C5',borderRadius:8,paddingHorizontal:10,fontSize:16,fontWeight:'900',color:'#23312D',textAlign:'center'},unit:{width:28,fontSize:12,fontWeight:'800',color:'#64716C',textAlign:'center'},summary:{borderWidth:1,borderColor:'#A8BDB5',borderRadius:11,backgroundColor:'#EAF3F0',padding:12,marginVertical:10},summaryTitle:{fontSize:11,fontWeight:'900',color:'#486159',textTransform:'uppercase'},summaryValue:{fontSize:18,fontWeight:'900',color:'#1D5545',marginTop:4},summaryText:{fontSize:11,color:'#5E6F69',marginTop:3},errorCard:{borderWidth:1,borderColor:'#D2A09B',borderRadius:9,backgroundColor:'#FFF2F1',padding:10,marginBottom:8},error:{fontSize:11,lineHeight:17,color:'#93372F'},note:{fontSize:11,lineHeight:17,color:'#6D7975',marginTop:7}});
