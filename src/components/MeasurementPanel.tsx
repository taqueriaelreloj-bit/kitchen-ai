import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorObject, EditorProject } from '../domain/editor';
import {
  addMeasurement,
  createObjectClearance,
  createObjectDimension,
  createPointMeasurement,
  deleteMeasurement,
  MeasurementMode,
  projectMeasurements,
  resolveMeasurement,
  updateMeasurement,
} from '../domain/measurements';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};
const MODES:MeasurementMode[]=['direct','horizontal','vertical'];

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}

export function MeasurementPanel({project,selected,apply,compact=false}:Props){
  const[startObjectId,setStartObjectId]=useState<string>();
  const[mode,setMode]=useState<MeasurementMode>('direct');
  const[startX,setStartX]=useState('0'),[startY,setStartY]=useState('0'),[endX,setEndX]=useState('36'),[endY,setEndY]=useState('0');
  const measurements=projectMeasurements(project);
  const objectNames=useMemo(()=>new Map(project.objects.map(object=>[object.id,object.name])),[project.objects]);
  const addObjectDimension=(axis:'width'|'depth')=>selected&&apply(addMeasurement(project,createObjectDimension(selected.id,axis,`${selected.name} ${axis==='width'?'Width':'Depth'}`)));
  const addClearance=()=>{
    if(!startObjectId||!selected||startObjectId===selected.id)return;
    apply(addMeasurement(project,createObjectClearance(startObjectId,selected.id,`${objectNames.get(startObjectId)??'Object'} to ${selected.name}`)));
    setStartObjectId(undefined);
  };
  const addPoints=()=>{
    const values=[startX,startY,endX,endY].map(Number);
    if(values.some(value=>!Number.isFinite(value)))return;
    apply(addMeasurement(project,createPointMeasurement({x:values[0],y:values[1]},{x:values[2],y:values[3]},mode,'Custom Plan Measurement')));
  };
  const content=<>
    <Text style={s.title}>Measurements</Text>
    <Text style={s.help}>Add persistent dimensions tied to objects or exact plan coordinates. Linked measurements update when a cabinet, island, wall or appliance moves or changes size.</Text>
    <Text style={s.section}>Selected Object</Text>
    <View style={s.wrap}><Button label="Add Width" disabled={!selected} onPress={()=>addObjectDimension('width')}/><Button label="Add Depth" disabled={!selected} onPress={()=>addObjectDimension('depth')}/><Button label={startObjectId?'Change Start Object':'Set Clearance Start'} disabled={!selected} active={startObjectId===selected?.id} onPress={()=>selected&&setStartObjectId(selected.id)}/><Button label="Measure to Selected" disabled={!startObjectId||!selected||startObjectId===selected.id} onPress={addClearance}/></View>
    {startObjectId&&<Text style={s.startText}>Clearance start: {objectNames.get(startObjectId)??startObjectId}. Select the second object, then choose Measure to Selected.</Text>}
    <Text style={s.section}>Custom Coordinates</Text>
    <View style={s.modeRow}>{MODES.map(value=><Button key={value} label={value[0].toUpperCase()+value.slice(1)} active={mode===value} onPress={()=>setMode(value)}/>)}</View>
    <View style={s.coordinateGrid}><View style={s.coordinate}><Text style={s.label}>Start X</Text><TextInput keyboardType="decimal-pad" value={startX} onChangeText={setStartX} style={s.input}/></View><View style={s.coordinate}><Text style={s.label}>Start Y</Text><TextInput keyboardType="decimal-pad" value={startY} onChangeText={setStartY} style={s.input}/></View><View style={s.coordinate}><Text style={s.label}>End X</Text><TextInput keyboardType="decimal-pad" value={endX} onChangeText={setEndX} style={s.input}/></View><View style={s.coordinate}><Text style={s.label}>End Y</Text><TextInput keyboardType="decimal-pad" value={endY} onChangeText={setEndY} style={s.input}/></View></View>
    <Button label="Add Custom Measurement" onPress={addPoints}/>
    <Text style={s.section}>Saved Measurements ({measurements.length})</Text>
    {!measurements.length?<Text style={s.note}>No user measurements have been added.</Text>:measurements.map(measurement=>{
      const resolved=resolveMeasurement(project,measurement);
      return <View key={measurement.id} style={[s.card,!resolved.valid&&s.invalidCard]}>
        <View style={s.cardHeader}><View style={s.cardCopy}><Text numberOfLines={1} style={s.cardTitle}>{measurement.name}</Text><Text style={s.cardMeta}>{resolved.valid?`${resolved.label} · ${measurement.mode}`:`Missing object: ${resolved.missingObjectIds.join(', ')}`}</Text></View><Text style={[s.visibility,measurement.visible&&s.visibilityOn]}>{measurement.visible?'VISIBLE':'HIDDEN'}</Text></View>
        <View style={s.wrap}><Button label={measurement.visible?'Hide':'Show'} onPress={()=>apply(updateMeasurement(project,measurement.id,{visible:!measurement.visible}))}/><Button label="Offset −" onPress={()=>apply(updateMeasurement(project,measurement.id,{offsetIn:measurement.offsetIn-2}))}/><Button label="Offset +" onPress={()=>apply(updateMeasurement(project,measurement.id,{offsetIn:measurement.offsetIn+2}))}/><Button label="Delete" onPress={()=>apply(deleteMeasurement(project,measurement.id))}/></View>
      </View>;
    })}
    <Text style={s.note}>Dimensions are digital planning aids. Confirm critical field measurements before fabrication or installation.</Text>
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},modeRow:{flexDirection:'row',flexWrap:'wrap',gap:4},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},startText:{fontSize:11,lineHeight:17,color:'#47675D',backgroundColor:'#E8F2EE',borderRadius:7,padding:8,marginTop:5},coordinateGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},coordinate:{width:'48%'},label:{fontSize:10,fontWeight:'800',color:'#52615C',marginBottom:3},input:{minHeight:42,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:9,backgroundColor:'#FFFFFF',fontSize:13,fontWeight:'700',color:'#24332E'},card:{borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#FFFFFF',padding:10,marginBottom:8},invalidCard:{borderColor:'#D9B3AD',backgroundColor:'#FFF8F7'},cardHeader:{flexDirection:'row',alignItems:'flex-start',gap:7,marginBottom:7},cardCopy:{flex:1},cardTitle:{fontSize:13,fontWeight:'900',color:'#25342F'},cardMeta:{fontSize:10,lineHeight:15,color:'#63716C',marginTop:2},visibility:{overflow:'hidden',borderRadius:999,backgroundColor:'#E6EAE8',paddingHorizontal:6,paddingVertical:3,fontSize:8,fontWeight:'900',color:'#64716C'},visibilityOn:{backgroundColor:'#DDEEE8',color:'#24614F'},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:8}});
