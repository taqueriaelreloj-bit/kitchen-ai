import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorObject, EditorProject } from '../domain/editor';
import {
  closeWallLoop, continueWall, deleteWallAndOpenings, resizeWallPreservingOpenings,
  setWallHeightAndThickness,
} from '../domain/wallDrawing';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.buttonActive,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function NumberField({label,value,onChange,suffix=' in',min=1,max=600}:{label:string;value:number;onChange:(value:number)=>void;suffix?:string;min?:number;max?:number}){
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.fieldRow}><Button label="−" onPress={()=>onChange(Math.max(min,value-1))}/><TextInput accessibilityLabel={label} keyboardType="decimal-pad" value={String(Math.round(value*10)/10)} onChangeText={text=>{const next=Number(text);if(Number.isFinite(next))onChange(Math.max(min,Math.min(max,next)));}} style={s.input}/><Text style={s.suffix}>{suffix}</Text><Button label="+" onPress={()=>onChange(Math.min(max,value+1))}/></View></View>;
}

export function WallDrawingPanel({project,selected,apply}:Props){
  const walls=useMemo(()=>project.objects.filter(object=>object.kind==='wall'),[project.objects]);
  const active=selected?.kind==='wall'?selected:undefined;
  const[length,setLength]=useState(96),[turn,setTurn]=useState(90),[firstWallId,setFirstWallId]=useState<string|undefined>(walls[0]?.id);
  const continueSelected=()=>{if(!active)return;apply(continueWall(project,active.id,length,turn).project);};
  return <View style={s.container}>
    <Text style={s.title}>Walls</Text>
    <Text style={s.help}>Select a wall, enter the next length and choose a turn. The new wall begins exactly at the current wall endpoint and snaps to nearby endpoints.</Text>
    <View style={s.activeCard}><Text style={s.activeLabel}>Selected wall</Text><Text style={s.activeName}>{active?.name??'No wall selected'}</Text>{active&&<Text style={s.activeMeta}>{Math.round(active.widthIn*10)/10} in · {Math.round(active.heightIn)} in high · {active.depthIn} in thick · {Math.round(active.rotation)}°</Text>}</View>
    <NumberField label="New Wall Length" value={length} onChange={setLength} min={1} max={600}/>
    <Text style={s.fieldLabel}>Turn from selected wall</Text><View style={s.wrap}>{[-90,-45,0,45,90].map(value=><Button key={value} label={`${value>0?'+':''}${value}°`} active={turn===value} onPress={()=>setTurn(value)}/>)}</View>
    <Button label="Continue Wall" disabled={!active} onPress={continueSelected}/>

    {active&&<View style={s.section}>
      <Text style={s.sectionTitle}>Selected Wall Properties</Text>
      <NumberField label="Length" value={active.widthIn} onChange={value=>apply(resizeWallPreservingOpenings(project,active.id,value))}/>
      <NumberField label="Height" value={active.heightIn} onChange={value=>apply(setWallHeightAndThickness(project,active.id,value,active.depthIn))}/>
      <NumberField label="Thickness" value={active.depthIn} onChange={value=>apply(setWallHeightAndThickness(project,active.id,active.heightIn,value))} min={2} max={12}/>
      <Text style={s.help}>Changing wall length automatically clamps attached doors and windows so they remain on the wall.</Text>
    </View>}

    {walls.length>=2&&<View style={s.section}><Text style={s.sectionTitle}>Close Room</Text><Text style={s.help}>Connect the selected last wall back to the chosen first wall.</Text><View style={s.wallChoices}>{walls.map(wall=><Button key={wall.id} label={wall.name} active={firstWallId===wall.id} onPress={()=>setFirstWallId(wall.id)}/>)}</View><Button label="Close Wall Loop" disabled={!active||!firstWallId||active.id===firstWallId} onPress={()=>{if(!active||!firstWallId)return;const result=closeWallLoop(project,firstWallId,active.id);if(result)apply(result.project);}}/></View>}
    <Button label="Delete Wall + Openings" disabled={!active} onPress={()=>{if(active)apply(deleteWallAndOpenings(project,active.id));}}/>
    <Text style={s.note}>Wall dimensions remain real project dimensions. Zoom, pan and display scale never change wall length.</Text>
  </View>;
}

const s=StyleSheet.create({container:{paddingBottom:20},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:12,lineHeight:18,color:'#5C6B66',marginBottom:8},button:{minHeight:42,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginRight:3,marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},activeCard:{borderWidth:1,borderColor:'#AFC0BA',borderRadius:9,backgroundColor:'#EEF4F2',padding:10,marginBottom:9},activeLabel:{fontSize:9,fontWeight:'900',color:'#61716B',textTransform:'uppercase'},activeName:{fontSize:15,fontWeight:'900',color:'#21493E',marginTop:2},activeMeta:{fontSize:10,color:'#60706A',marginTop:3},field:{marginBottom:8},fieldLabel:{fontSize:11,fontWeight:'900',color:'#475650',marginBottom:4},fieldRow:{flexDirection:'row',alignItems:'center'},input:{flex:1,minHeight:42,borderWidth:1,borderColor:'#B9C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:8,textAlign:'center',fontSize:13,fontWeight:'900',color:'#273630'},suffix:{width:35,fontSize:10,fontWeight:'800',color:'#66736E',textAlign:'center'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:3,marginBottom:5},section:{borderTopWidth:1,borderTopColor:'#D3DBD8',paddingTop:10,marginTop:8},sectionTitle:{fontSize:12,fontWeight:'900',color:'#33443E',textTransform:'uppercase',marginBottom:7},wallChoices:{flexDirection:'row',flexWrap:'wrap',gap:3},note:{fontSize:10,lineHeight:16,color:'#707B77',marginTop:6}});
