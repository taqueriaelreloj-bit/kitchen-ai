import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorObject, EditorProject } from '../domain/editor';
import { continueWall, createWallSegment, moveWallEnd, wallEndpoints } from '../domain/wallDrawing';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};

function Button({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}

export function WallDrawingPanel({project,selected,apply}:Props){
  const[lengthText,setLengthText]=useState('96');
  const[endXText,setEndXText]=useState('');
  const[endYText,setEndYText]=useState('');
  const wall=selected?.kind==='wall'?selected:undefined;
  const endpoints=useMemo(()=>wall?wallEndpoints(wall):undefined,[wall]);
  const length=Math.max(.25,Number(lengthText)||96);
  const addWall=()=>{
    const wall=createWallSegment({x:120,y:120},{x:120+length,y:120},{name:'Wall'});
    apply({...project,objects:[...project.objects,wall],selectedId:wall.id,updatedAt:new Date().toISOString()});
  };
  const continueAt=(turn:number)=>wall&&apply(continueWall(project,wall.id,length,turn));
  const editEnd=()=>{
    if(!wall||!endpoints)return;
    const x=Number(endXText),y=Number(endYText);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    apply(moveWallEnd(project,wall.id,{x,y}));
  };
  return <View>
    <Text style={s.title}>Connected Walls</Text>
    <Text style={s.help}>Draw real wall segments. Continue starts at the selected wall endpoint and preserves height, thickness, paint and attached openings.</Text>
    <View style={s.field}><Text style={s.label}>New Wall Length</Text><TextInput accessibilityLabel="Wall length in inches" keyboardType="decimal-pad" value={lengthText} onChangeText={setLengthText} style={s.input}/><Text style={s.unit}>inches</Text></View>
    <Button label="Add Wall" onPress={addWall}/>
    <Text style={s.section}>Continue Selected Wall</Text>
    <View style={s.wrap}><Button label="Straight" disabled={!wall} onPress={()=>continueAt(0)}/><Button label="Turn Left 90°" disabled={!wall} onPress={()=>continueAt(-90)}/><Button label="Turn Right 90°" disabled={!wall} onPress={()=>continueAt(90)}/></View>
    {wall&&endpoints&&<View style={s.selectedCard}>
      <Text style={s.selectedTitle}>{wall.name}</Text>
      <Text style={s.meta}>Length {Math.round(wall.widthIn*10)/10} in · Angle {Math.round(wall.rotation*10)/10}° · {Math.round(wall.depthIn*10)/10} in thick</Text>
      <Text style={s.meta}>Start {Math.round(endpoints.start.x*10)/10}, {Math.round(endpoints.start.y*10)/10} · End {Math.round(endpoints.end.x*10)/10}, {Math.round(endpoints.end.y*10)/10}</Text>
      <Text style={s.section}>Move End Point</Text>
      <View style={s.coordinates}><TextInput accessibilityLabel="Wall end X" keyboardType="decimal-pad" value={endXText} onChangeText={setEndXText} placeholder={`${Math.round(endpoints.end.x*10)/10}`} style={[s.input,s.coordinate]}/><TextInput accessibilityLabel="Wall end Y" keyboardType="decimal-pad" value={endYText} onChangeText={setEndYText} placeholder={`${Math.round(endpoints.end.y*10)/10}`} style={[s.input,s.coordinate]}/></View>
      <Button label="Apply End Point" onPress={editEnd}/>
    </View>}
  </View>;
}

const s=StyleSheet.create({title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:12},field:{marginBottom:8},label:{fontSize:12,fontWeight:'800',color:'#43524D',marginBottom:4},input:{minHeight:44,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:10,backgroundColor:'#FFFFFF',fontSize:14,fontWeight:'700',color:'#24332E'},unit:{fontSize:10,color:'#65736E',marginTop:3},button:{minHeight:44,borderWidth:1,borderColor:'#9DB2AB',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:11,alignItems:'center',justifyContent:'center',marginRight:5,marginBottom:5},buttonText:{fontSize:12,fontWeight:'800',color:'#21483D',textAlign:'center'},disabled:{opacity:.35},section:{fontSize:11,fontWeight:'900',color:'#53635D',textTransform:'uppercase',marginTop:12,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap'},selectedCard:{borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#F9FBFA',padding:11,marginTop:10},selectedTitle:{fontSize:15,fontWeight:'900',color:'#22312C'},meta:{fontSize:11,lineHeight:17,color:'#5B6A65',marginTop:3},coordinates:{flexDirection:'row',gap:6},coordinate:{flex:1}});
