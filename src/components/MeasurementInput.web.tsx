import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import {
  applyMeasurementInput, formatFeetInches, formatMeasurement, MeasurementField,
  MeasurementLimits, MeasurementUnit, parseMeasurement,
} from '../domain/measurements';

type Props={
  project:EditorProject;
  objectId:string;
  field:MeasurementField;
  label:string;
  valueIn:number;
  apply:(project:EditorProject)=>void;
  limits?:MeasurementLimits;
  preferredUnit?:MeasurementUnit;
  stepIn?:number;
};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

export function MeasurementInput({project,objectId,field,label,valueIn,apply,limits={},preferredUnit='ft',stepIn=1}:Props){
  const[unit,setUnit]=useState<MeasurementUnit>(preferredUnit);
  const[text,setText]=useState(preferredUnit==='ft'?formatFeetInches(valueIn):formatMeasurement(valueIn,preferredUnit));
  const[error,setError]=useState<string>();
  useEffect(()=>{setText(unit==='ft'?formatFeetInches(valueIn):formatMeasurement(valueIn,unit));setError(undefined);},[valueIn,unit]);
  const preview=useMemo(()=>parseMeasurement(text,unit),[text,unit]);
  const commit=(input=text)=>{
    const result=applyMeasurementInput(project,objectId,field,input,limits);
    if(result.error){setError(result.error);return;}
    setError(undefined);apply(result.project);setText(unit==='ft'?formatFeetInches(result.result.inches):formatMeasurement(result.result.inches,unit));
  };
  const step=(direction:number)=>commit(formatMeasurement(valueIn+direction*stepIn,'in'));
  return <View style={s.field}>
    <View style={s.header}><Text style={s.label}>{label}</Text><Text style={s.current}>{formatFeetInches(valueIn)} · {formatMeasurement(valueIn,'in')}</Text></View>
    <View style={s.inputRow}><Button label="−" onPress={()=>step(-1)}/><TextInput accessibilityLabel={`${label} measurement`} value={text} onChangeText={value=>{setText(value);setError(undefined);}} onSubmitEditing={()=>commit()} selectTextOnFocus style={[s.input,error&&s.inputError]}/><Button label="+" onPress={()=>step(1)}/><Button label="Apply" active={preview.valid&&!error} onPress={()=>commit()}/></View>
    <View style={s.units}>{(['ft','in','cm','mm'] as MeasurementUnit[]).map(value=><Button key={value} label={value} active={unit===value} onPress={()=>setUnit(value)}/>)}</View>
    {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:preview.valid?<Text style={s.preview}>Will apply {formatFeetInches(preview.inches)} ({formatMeasurement(preview.inches,'in')})</Text>:<Text style={s.help}>Examples: 3' 6&quot; · 42 in · 3 1/2 in · 106.7 cm</Text>}
  </View>;
}

const s=StyleSheet.create({field:{marginBottom:12},header:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8,marginBottom:5},label:{fontSize:12,fontWeight:'900',color:'#34443E'},current:{fontSize:9,fontWeight:'700',color:'#68756F'},inputRow:{flexDirection:'row',alignItems:'center',gap:4},input:{flex:1,minHeight:44,borderWidth:1,borderColor:'#AFC0BA',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,fontSize:14,fontWeight:'800',color:'#23312D'},inputError:{borderColor:'#B94A42',backgroundColor:'#FFF8F7'},button:{minHeight:44,minWidth:42,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center'},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},units:{flexDirection:'row',gap:4,marginTop:5},error:{fontSize:11,lineHeight:16,color:'#9B302A',marginTop:5},preview:{fontSize:10,lineHeight:15,color:'#28604F',marginTop:5},help:{fontSize:10,lineHeight:15,color:'#6B7773',marginTop:5}});
