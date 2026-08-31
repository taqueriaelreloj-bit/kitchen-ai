import { StyleSheet, Text, View } from 'react-native';
import { doorPlanLeafStyle, doorSwingGeometry } from '../domain/doorSwing';
import { EditorObject } from '../domain/editor';

export function DoorPlanSymbol({door,scale=.45,showLabel=false}:{door:EditorObject;scale?:number;showLabel?:boolean}){
  const geometry=doorSwingGeometry(door),visual=doorPlanLeafStyle(door,scale),width=Math.max(10,door.widthIn*scale),normal=geometry.leafCenterNormalIn*scale;
  const hingeX=geometry.hinge==='left'?0:width;
  const arcSize=width*2;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[s.hinge,{left:hingeX-2,top:-2}]}/>
    <View style={[s.leaf,{width:visual.width,left:visual.left,top:normal-1,transform:[{rotate:`${visual.rotation}deg`}]}]}/>
    <View style={[s.arc,{width:arcSize,height:arcSize,left:geometry.hinge==='left'?0:width-arcSize,top:geometry.direction==='in'?0:-arcSize,borderColor:geometry.direction==='in'?'#2F705E':'#8B5F36'}]}/>
    {showLabel&&<Text style={[s.label,{top:geometry.direction==='in'?width+3:-17}]}>{geometry.swing}</Text>}
  </View>;
}

const s=StyleSheet.create({
  hinge:{position:'absolute',width:5,height:5,borderRadius:3,backgroundColor:'#263C35',zIndex:4},
  leaf:{position:'absolute',height:2,backgroundColor:'#5A3F2E',transformOrigin:'center' as any,zIndex:3},
  arc:{position:'absolute',borderWidth:1,borderLeftColor:'transparent',borderBottomColor:'transparent',borderRadius:999,opacity:.72,zIndex:2},
  label:{position:'absolute',left:0,minWidth:90,fontSize:7,fontWeight:'800',color:'#456159'},
});
