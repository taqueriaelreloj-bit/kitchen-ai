import { Pressable, StyleSheet, Text, View } from 'react-native';
import { applyToeKick, EditorObject, EditorProject, isBaseLikeKind } from '../domain/editor';
import {
  duplicateSelectedObject,
  moveSelectedObjectTo,
  nudgeSelectedObject,
  rotateSelectedObject,
} from '../domain/selectionCommands';

function ControlButton({label,onPress,wide=false}:{label:string;onPress:()=>void;wide?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[s.button,wide&&s.wideButton]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}

function CoordinateControl({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){
  return <View style={s.coordinate}>
    <Text style={s.coordinateLabel}>{label}</Text>
    <View style={s.coordinateRow}>
      <ControlButton label={`${label} minus 1 inch`} onPress={()=>onChange(Math.round((value-1)*10)/10)}/>
      <Text accessibilityLabel={`${label} position ${Math.round(value*10)/10} inches`} style={s.coordinateValue}>{Math.round(value*10)/10} in</Text>
      <ControlButton label={`${label} plus 1 inch`} onPress={()=>onChange(Math.round((value+1)*10)/10)}/>
    </View>
  </View>;
}

export function SelectionTransformPanel({project,selected,apply}:{project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void}){
  if(!selected)return null;
  const move=(x:number,y:number)=>apply(moveSelectedObjectTo(project,x,y));
  const nudge=(x:number,y:number)=>apply(nudgeSelectedObject(project,x,y));
  const toeKick=selected.toeKick;
  return <View accessibilityLabel={`Quick transform for ${selected.name}`} style={s.panel}>
    <View style={s.header}>
      <View style={s.headerCopy}><Text style={s.eyebrow}>QUICK TRANSFORM</Text><Text numberOfLines={1} style={s.title}>{selected.name}</Text></View>
      <Text style={s.rotation}>{Math.round(selected.rotation)}°</Text>
    </View>
    <View style={s.coordinates}>
      <CoordinateControl label="X" value={selected.x} onChange={x=>move(x,selected.y)}/>
      <CoordinateControl label="Y" value={selected.y} onChange={y=>move(selected.x,y)}/>
    </View>
    <View style={s.nudgeGrid}>
      <View style={s.gridSpacer}/><ControlButton label="Move up 1 inch" onPress={()=>nudge(0,-1)}/><View style={s.gridSpacer}/>
      <ControlButton label="Move left 1 inch" onPress={()=>nudge(-1,0)}/><ControlButton label="Snap position to 5 inch grid" onPress={()=>move(Math.round(selected.x/5)*5,Math.round(selected.y/5)*5)}/><ControlButton label="Move right 1 inch" onPress={()=>nudge(1,0)}/>
      <View style={s.gridSpacer}/><ControlButton label="Move down 1 inch" onPress={()=>nudge(0,1)}/><View style={s.gridSpacer}/>
    </View>
    <View style={s.actions}>
      <ControlButton wide label="Rotate 90 degrees" onPress={()=>apply(rotateSelectedObject(project,90))}/>
      <ControlButton wide label="Duplicate object" onPress={()=>apply(duplicateSelectedObject(project))}/>
    </View>
    {isBaseLikeKind(selected.kind)&&toeKick&&<View style={s.toeKick}>
      <View style={s.toeKickHeader}><Text style={s.toeKickTitle}>TOE KICK</Text><ControlButton label={toeKick.enabled?'Disable toe kick':'Enable toe kick'} onPress={()=>apply(applyToeKick(project,{enabled:!toeKick.enabled},false))}/></View>
      {toeKick.enabled&&<View style={s.coordinates}>
        <CoordinateControl label="Height" value={toeKick.heightIn} onChange={heightIn=>apply(applyToeKick(project,{heightIn:Math.max(1,Math.min(10,heightIn))},false))}/>
        <CoordinateControl label="Recess" value={toeKick.recessIn} onChange={recessIn=>apply(applyToeKick(project,{recessIn:Math.max(0,Math.min(12,recessIn))},false))}/>
      </View>}
    </View>}
    <Text style={s.help}>Arrow keys move 1 in · Shift + Arrow moves 5 in</Text>
  </View>;
}

const s=StyleSheet.create({
  panel:{width:286,maxWidth:'100%',backgroundColor:'rgba(247,250,249,.98)',borderWidth:1,borderColor:'#BFCBC7',borderRadius:12,padding:10,shadowColor:'#000',shadowOpacity:.16,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:6},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},headerCopy:{flex:1,minWidth:0},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:.8,color:'#4F6860'},title:{fontSize:15,fontWeight:'900',color:'#1D2A27'},rotation:{fontSize:13,fontWeight:'900',color:'#245346',backgroundColor:'#DDEEE8',paddingHorizontal:8,paddingVertical:5,borderRadius:7},
  coordinates:{flexDirection:'row',gap:7},coordinate:{flex:1,minWidth:0},coordinateLabel:{fontSize:10,fontWeight:'900',color:'#53635E',marginBottom:3},coordinateRow:{flexDirection:'row',alignItems:'center'},coordinateValue:{flex:1,minWidth:58,textAlign:'center',fontSize:11,fontWeight:'900',color:'#24332F'},
  button:{minWidth:36,minHeight:36,borderWidth:1,borderColor:'#AFC0BA',borderRadius:8,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',paddingHorizontal:7,margin:1},wideButton:{flex:1},buttonText:{fontSize:10,fontWeight:'900',color:'#263B35',textAlign:'center'},
  nudgeGrid:{alignSelf:'center',width:126,flexDirection:'row',flexWrap:'wrap',marginVertical:7},gridSpacer:{width:42,height:38},actions:{flexDirection:'row',gap:5},
  toeKick:{borderTopWidth:1,borderTopColor:'#D4DDDA',marginTop:8,paddingTop:8},toeKickHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:5},toeKickTitle:{fontSize:10,fontWeight:'900',letterSpacing:.7,color:'#4F6860'},
  help:{fontSize:9,lineHeight:13,color:'#64746F',textAlign:'center',marginTop:7},
});
