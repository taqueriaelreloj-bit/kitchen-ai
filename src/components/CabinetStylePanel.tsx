import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  applyCabinetStyle,
  CABINET_DOOR_STYLES,
  CABINET_OVERLAYS,
  cabinetStyleData,
  CabinetDoorStyle,
  CabinetOverlay,
  DRAWER_FRONT_STYLES,
  DrawerFrontStyle,
} from '../domain/cabinetStyles';
import { CabinetScope, EditorObject, EditorProject, isCabinetKind } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}
function Stepper({label,value,suffix=' in',min,max,step=.25,onChange}:{label:string;value:number;suffix?:string;min:number;max:number;step?:number;onChange:(value:number)=>void}){
  const next=(direction:number)=>Math.max(min,Math.min(max,Math.round((value+direction*step)*100)/100));
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}><Button label="−" onPress={()=>onChange(next(-1))}/><Text style={s.value}>{Math.round(value*100)/100}{suffix}</Text><Button label="+" onPress={()=>onChange(next(1))}/></View></View>;
}

export function CabinetStylePanel({project,selected,apply,compact=false}:Props){
  const[scope,setScope]=useState<CabinetScope>('selected');
  const cabinet=selected&&isCabinetKind(selected.kind)?selected:undefined;
  const spec=cabinet?cabinetStyleData(cabinet):undefined;
  const patch=(next:Parameters<typeof applyCabinetStyle>[1])=>apply(applyCabinetStyle(project,next,scope));
  const scopeLabel=(value:CabinetScope)=>value==='selected'?'Selected':value==='base'?'Base & Tall':value==='wall'?'Wall Cabinets':value==='island'?'Island':'All Cabinets';
  const content=<>
    <Text style={s.title}>Cabinet Door Style</Text>
    <Text style={s.help}>Choose the front construction and apply it to one cabinet or a complete cabinet group. The style is saved with the project and changes the 3D front geometry.</Text>
    <Text style={s.section}>Application</Text>
    <View style={s.wrap}>{(['selected','base','wall','island','all'] as CabinetScope[]).map(value=><Button key={value} label={scopeLabel(value)} active={scope===value} onPress={()=>setScope(value)}/>)}</View>
    <Text style={s.section}>Door Style</Text>
    <View style={s.cards}>{CABINET_DOOR_STYLES.map(style=><Pressable key={style} accessibilityRole="button" accessibilityState={{selected:spec?.doorStyle===style}} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({doorStyle:style as CabinetDoorStyle})} style={[s.styleCard,spec?.doorStyle===style&&s.styleCardActive,!cabinet&&scope==='selected'&&s.disabled]}><View style={[s.preview,style==='Slab'&&s.slabPreview]}>{style!=='Slab'&&<><View style={s.previewTop}/><View style={s.previewBottom}/><View style={s.previewLeft}/><View style={s.previewRight}/><View style={[s.previewPanel,style==='Glass Frame'&&s.glassPanel]}/></>}</View><Text style={s.styleName}>{style}</Text></Pressable>)}</View>
    <Text style={s.section}>Overlay</Text>
    <View style={s.wrap}>{CABINET_OVERLAYS.map(value=><Button key={value} label={value} active={spec?.overlay===value} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({overlay:value as CabinetOverlay})}/>)}</View>
    <Text style={s.section}>Drawer Front</Text>
    <View style={s.wrap}>{DRAWER_FRONT_STYLES.map(value=><Button key={value} label={value} active={spec?.drawerFrontStyle===value} disabled={scope==='selected'&&!cabinet} onPress={()=>patch({drawerFrontStyle:value as DrawerFrontStyle})}/>)}</View>
    {cabinet&&spec&&<View style={s.customize}>
      <Text style={s.section}>Selected Style Dimensions</Text>
      <Stepper label="Rail Width" value={spec.railIn} min={.75} max={6} onChange={value=>patch({railIn:value})}/>
      <Stepper label="Stile Width" value={spec.stileIn} min={.75} max={6} onChange={value=>patch({stileIn:value})}/>
      <Stepper label="Reveal" value={spec.revealIn} min={0} max={1.5} step={.125} onChange={value=>patch({revealIn:value})}/>
      <Stepper label="Panel Depth" value={spec.panelDepthIn} min={.05} max={1.5} step={.05} onChange={value=>patch({panelDepthIn:value})}/>
      {spec.doorStyle==='Glass Frame'&&<Stepper label="Glass Opacity" value={Math.round(spec.glassOpacity*100)} min={5} max={95} step={5} suffix="%" onChange={value=>patch({glassOpacity:value/100})}/>} 
    </View>}
    {!cabinet&&<Text style={s.note}>Select a cabinet to edit custom dimensions, or choose a group above to apply a standard style.</Text>}
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},row:{flexDirection:'row',alignItems:'center',gap:5},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},cards:{flexDirection:'row',flexWrap:'wrap',gap:7},styleCard:{width:'47%',minHeight:102,borderWidth:1,borderColor:'#C6D1CD',borderRadius:10,backgroundColor:'#FFFFFF',padding:8,alignItems:'center'},styleCardActive:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#E6F1ED'},preview:{width:60,height:55,borderWidth:4,borderColor:'#64746E',backgroundColor:'#D7D1C6',position:'relative'},slabPreview:{borderWidth:1,backgroundColor:'#CFC8BA'},previewTop:{position:'absolute',left:0,right:0,top:0,height:7,backgroundColor:'#64746E'},previewBottom:{position:'absolute',left:0,right:0,bottom:0,height:7,backgroundColor:'#64746E'},previewLeft:{position:'absolute',left:0,top:0,bottom:0,width:7,backgroundColor:'#64746E'},previewRight:{position:'absolute',right:0,top:0,bottom:0,width:7,backgroundColor:'#64746E'},previewPanel:{position:'absolute',left:8,right:8,top:8,bottom:8,backgroundColor:'#B6AEA0'},glassPanel:{backgroundColor:'#A9CBD5'},styleName:{fontSize:10,fontWeight:'800',color:'#2C3A35',textAlign:'center',marginTop:6},customize:{marginTop:3},field:{gap:4,marginBottom:7},label:{fontSize:11,fontWeight:'800',color:'#46564F'},value:{minWidth:68,textAlign:'center',fontSize:12,fontWeight:'900',color:'#263530'},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:12}});
