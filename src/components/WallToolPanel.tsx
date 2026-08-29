import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorObject, EditorProject, updateObject } from '../domain/editor';
import { addWall, closeWallLoop, connectedWallIds, continueWall, deleteWall } from '../domain/walls';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject,record?:boolean)=>void};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.buttonActive,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function Field({label,value,onChange,min=1,max=999,suffix=' in'}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number;suffix?:string}){
  const commit=(text:string)=>{const value=Number(text);if(Number.isFinite(value))onChange(Math.max(min,Math.min(max,value)));};
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.fieldRow}><Button label="−" onPress={()=>onChange(Math.max(min,Math.round((value-1)*10)/10))}/><TextInput accessibilityLabel={label} keyboardType="decimal-pad" defaultValue={String(Math.round(value*10)/10)} onEndEditing={event=>commit(event.nativeEvent.text)} style={s.input}/><Text style={s.suffix}>{suffix}</Text><Button label="+" onPress={()=>onChange(Math.min(max,Math.round((value+1)*10)/10))}/></View></View>;
}

export function WallToolPanel({project,selected,apply}:Props){
  const wall=selected?.kind==='wall'?selected:undefined;
  const connected=wall?connectedWallIds(project).has(wall.id):false;
  const patch=(next:Partial<EditorObject>)=>wall&&apply(updateObject(project,wall.id,next));
  return <View>
    <Text style={s.title}>Walls</Text>
    <Text style={s.help}>Create connected wall runs from exact endpoints. Select a wall, then continue straight or turn 90°.</Text>
    <View style={s.actions}><Button label="Add Wall" onPress={()=>apply(addWall(project))}/><Button label="Continue Straight" disabled={!wall} onPress={()=>apply(continueWall(project,wall?.id,0))}/><Button label="Turn Left 90°" disabled={!wall} onPress={()=>apply(continueWall(project,wall?.id,-90))}/><Button label="Turn Right 90°" disabled={!wall} onPress={()=>apply(continueWall(project,wall?.id,90))}/><Button label="Close Room" disabled={!wall} onPress={()=>apply(closeWallLoop(project,wall?.id))}/></View>
    {wall?<View style={s.card}>
      <View style={s.statusRow}><Text style={s.selectedName}>{wall.name}</Text><Text style={[s.status,connected&&s.statusConnected]}>{connected?'Connected':'Open End'}</Text></View>
      <Field label="Length" value={wall.widthIn} min={12} max={1200} onChange={widthIn=>patch({widthIn})}/>
      <Field label="Height" value={wall.heightIn} min={48} max={240} onChange={heightIn=>patch({heightIn})}/>
      <Field label="Thickness" value={wall.depthIn} min={2} max={18} onChange={depthIn=>patch({depthIn})}/>
      <Field label="Rotation" value={wall.rotation} min={-360} max={360} suffix="°" onChange={rotation=>patch({rotation:((rotation%360)+360)%360})}/>
      <View style={s.actions}><Button label={project.view2d.snap?'Snap On':'Snap Off'} active={project.view2d.snap} onPress={()=>apply({...project,view2d:{...project.view2d,snap:!project.view2d.snap}},false)}/><Button label="Delete Wall" onPress={()=>Alert.alert('Delete wall?',`Delete ${wall.name} and its attached doors/windows?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>apply(deleteWall(project,wall.id,'delete'))}])}/></View>
      <Text style={s.note}>Deleting a wall also removes its attached openings. Undo restores the wall and openings together.</Text>
    </View>:<View style={s.empty}><Text style={s.emptyTitle}>Select a wall</Text><Text style={s.help}>Wall length, height, thickness, rotation and chain actions appear here.</Text></View>}
  </View>;
}

const s=StyleSheet.create({title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},actions:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:8},button:{minHeight:43,borderWidth:1,borderColor:'#AFC0BA',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},card:{borderWidth:1,borderColor:'#CBD5D1',borderRadius:11,backgroundColor:'#FFFFFF',padding:11,marginTop:4},statusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7,marginBottom:10},selectedName:{flex:1,fontSize:15,fontWeight:'900',color:'#24342E'},status:{overflow:'hidden',borderRadius:6,backgroundColor:'#EFE8D6',color:'#735B24',fontSize:9,fontWeight:'900',paddingHorizontal:7,paddingVertical:4,textTransform:'uppercase'},statusConnected:{backgroundColor:'#DDEDE7',color:'#245A49'},field:{gap:4,marginBottom:8},fieldLabel:{fontSize:11,fontWeight:'800',color:'#4A5B55'},fieldRow:{flexDirection:'row',alignItems:'center',gap:4},input:{width:74,minHeight:42,borderWidth:1,borderColor:'#B9C7C2',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:8,textAlign:'center',fontSize:13,fontWeight:'900',color:'#263530'},suffix:{fontSize:11,fontWeight:'800',color:'#60706A',minWidth:18},note:{fontSize:10,lineHeight:15,color:'#697670'},empty:{borderWidth:1,borderStyle:'dashed',borderColor:'#B9C7C2',borderRadius:10,padding:12},emptyTitle:{fontSize:14,fontWeight:'900',color:'#34443E',marginBottom:3}});
