import { StyleSheet, Text, View } from 'react-native';
import { EditorProject } from '../domain/editor';
import { resolveProjectMeasurements } from '../domain/measurements';

type Props={project:EditorProject;pixelsPerInch?:number};
const AnyView=View as any;
const PIXELS_PER_INCH=.45;

export function MeasurementOverlay2D({project,pixelsPerInch=PIXELS_PER_INCH}:Props){
  const measurements=resolveProjectMeasurements(project).filter(item=>item.valid);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {measurements.map(item=>{
      const dx=item.lineEnd.x-item.lineStart.x,dy=item.lineEnd.y-item.lineStart.y,length=Math.max(1,Math.hypot(dx,dy)*pixelsPerInch),centerX=(item.lineStart.x+item.lineEnd.x)/2*pixelsPerInch,centerY=(item.lineStart.y+item.lineEnd.y)/2*pixelsPerInch,angle=Math.atan2(dy,dx)*180/Math.PI;
      const startExtensionLength=Math.hypot(item.lineStart.x-item.start.x,item.lineStart.y-item.start.y)*pixelsPerInch,endExtensionLength=Math.hypot(item.lineEnd.x-item.end.x,item.lineEnd.y-item.end.y)*pixelsPerInch;
      const startExtensionAngle=Math.atan2(item.lineStart.y-item.start.y,item.lineStart.x-item.start.x)*180/Math.PI,endExtensionAngle=Math.atan2(item.lineEnd.y-item.end.y,item.lineEnd.x-item.end.x)*180/Math.PI;
      return <View key={item.id}>
        {startExtensionLength>1&&<AnyView style={[s.extension,{left:item.start.x*pixelsPerInch,top:item.start.y*pixelsPerInch,width:startExtensionLength,transform:[{rotate:`${startExtensionAngle}deg`}]}]}/>} 
        {endExtensionLength>1&&<AnyView style={[s.extension,{left:item.end.x*pixelsPerInch,top:item.end.y*pixelsPerInch,width:endExtensionLength,transform:[{rotate:`${endExtensionAngle}deg`}]}]}/>} 
        <AnyView style={[s.line,{left:centerX-length/2,top:centerY-.75,width:length,transform:[{rotate:`${angle}deg`}]}]}>
          <View style={s.tickStart}/><View style={s.tickEnd}/>
        </AnyView>
        <View style={[s.labelWrap,{left:centerX-55,top:centerY-22}]}><Text numberOfLines={1} style={s.label}>{item.name}: {item.label}</Text></View>
      </View>;
    })}
  </View>;
}

const s=StyleSheet.create({extension:{position:'absolute',height:1,borderTopWidth:1,borderTopColor:'#2F7663',borderStyle:'dashed',transformOrigin:'0 50%' as any},line:{position:'absolute',height:1.5,backgroundColor:'#175D4B',transformOrigin:'50% 50%' as any},tickStart:{position:'absolute',left:0,top:-4,width:1.5,height:9,backgroundColor:'#175D4B'},tickEnd:{position:'absolute',right:0,top:-4,width:1.5,height:9,backgroundColor:'#175D4B'},labelWrap:{position:'absolute',width:110,minHeight:18,borderRadius:4,backgroundColor:'#F7FBF9EE',borderWidth:1,borderColor:'#94B7AA',paddingHorizontal:3,paddingVertical:2},label:{fontSize:7,fontWeight:'900',color:'#174F41',textAlign:'center'}});
