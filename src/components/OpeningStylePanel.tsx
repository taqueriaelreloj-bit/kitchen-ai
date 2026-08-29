import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EditorObject, EditorProject } from '../domain/editor';
import { openingData, setDoorSwing, setWindowSillHeight, SwingDirection } from '../domain/openings';
import {
  applyOpeningStyle,
  DOOR_STYLES,
  DoorStyle,
  isOpening,
  OPENING_TRIM_STYLES,
  OpeningTrimStyle,
  openingStyleData,
  updateOpeningStyle,
  WINDOW_STYLES,
  WindowStyle,
} from '../domain/openingStyles';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void;compact?:boolean};
const SWINGS:SwingDirection[]=['Left In','Right In','Left Out','Right Out'];

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.active,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.activeText]}>{label}</Text></Pressable>;
}
function Stepper({label,value,min,max,step=.25,suffix=' in',onChange}:{label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(value:number)=>void}){
  const next=(direction:number)=>Math.max(min,Math.min(max,Math.round((value+direction*step)*100)/100));
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}><Button label="−" onPress={()=>onChange(next(-1))}/><Text style={s.value}>{Math.round(value*100)/100}{suffix}</Text><Button label="+" onPress={()=>onChange(next(1))}/></View></View>;
}

export function OpeningStylePanel({project,selected,apply,compact=false}:Props){
  const[applyAll,setApplyAll]=useState(false),[frameColor,setFrameColor]=useState(''),[panelColor,setPanelColor]=useState(''),[glassColor,setGlassColor]=useState('');
  const opening=selected&&isOpening(selected)?selected:undefined,spec=opening?openingStyleData(opening):undefined,data=opening?openingData(opening):undefined;
  const patch=(next:Parameters<typeof updateOpeningStyle>[2])=>{
    if(!opening)return;
    apply(applyAll?applyOpeningStyle(project,opening.kind,next):updateOpeningStyle(project,opening.id,next));
  };
  const content=<>
    <Text style={s.title}>Doors & Windows</Text>
    <Text style={s.help}>Select an attached opening to change its style, swing, trim, sill, frame and glass. Style changes preserve the wall relationship and save with the project.</Text>
    <View style={s.wrap}><Button label="Selected Opening" active={!applyAll} onPress={()=>setApplyAll(false)}/><Button label={opening?`All ${opening.kind==='door'?'Doors':'Windows'}`:'Apply to All'} active={applyAll} disabled={!opening} onPress={()=>setApplyAll(true)}/></View>
    {opening&&spec?<>
      <Text style={s.selectedTitle}>{opening.name}</Text><Text style={s.meta}>Attached wall: {data?.parentWallId??'None'} · Offset {Math.round(data?.wallOffsetIn??0)} in</Text>
      {opening.kind==='door'?<>
        <Text style={s.section}>Door Style</Text>
        <View style={s.cards}>{DOOR_STYLES.map(style=><Pressable key={style} accessibilityRole="button" accessibilityState={{selected:spec.doorStyle===style}} onPress={()=>patch({doorStyle:style as DoorStyle})} style={[s.card,spec.doorStyle===style&&s.cardActive]}><View style={[s.doorPreview,style.includes('Glass')&&s.glassPreview,style==='Double Door'&&s.doublePreview]}>{style==='Shaker Door'&&<View style={s.shakerPanel}/>} {style==='Barn Door'&&<View style={s.track}/>}</View><Text style={s.cardName}>{style}</Text></Pressable>)}</View>
        <Text style={s.section}>Swing Direction</Text><View style={s.wrap}>{SWINGS.map(swing=><Button key={swing} label={swing} active={data?.swingDirection===swing} onPress={()=>apply(setDoorSwing(project,opening.id,swing))}/>)}</View>
      </>:<>
        <Text style={s.section}>Window Style</Text>
        <View style={s.cards}>{WINDOW_STYLES.map(style=><Pressable key={style} accessibilityRole="button" accessibilityState={{selected:spec.windowStyle===style}} onPress={()=>patch({windowStyle:style as WindowStyle})} style={[s.card,spec.windowStyle===style&&s.cardActive]}><View style={s.windowPreview}>{(style==='Single Hung'||style==='Double Hung')&&<View style={s.horizontalMullion}/>} {style==='Slider'&&<View style={s.verticalMullion}/>} {style==='Casement'&&<View style={[s.verticalMullion,{left:'68%'}]}/>}</View><Text style={s.cardName}>{style}</Text></Pressable>)}</View>
        <Text style={s.section}>Sill & Grid</Text><Stepper label="Sill Height" value={data?.sillHeightIn??opening.elevationIn??36} min={0} max={84} step={1} onChange={value=>apply(setWindowSillHeight(project,opening.id,value))}/><Stepper label="Muntins" value={spec.muntins} min={0} max={12} step={1} suffix="" onChange={value=>patch({muntins:Math.round(value)})}/>
      </>}
      <Text style={s.section}>Trim</Text><View style={s.wrap}>{OPENING_TRIM_STYLES.map(style=><Button key={style} label={style} active={spec.trimStyle===style} onPress={()=>patch({trimStyle:style as OpeningTrimStyle})}/>)}</View>{spec.trimStyle!=='None'&&<Stepper label="Trim Width" value={spec.trimWidthIn} min={0} max={8} onChange={value=>patch({trimWidthIn:value})}/>}<Stepper label="Frame Depth" value={spec.frameDepthIn} min={.25} max={6} onChange={value=>patch({frameDepthIn:value})}/>
      <Text style={s.section}>Digital Colors</Text>
      <ColorInput label="Frame" current={spec.frameColor} value={frameColor} setValue={setFrameColor} applyColor={color=>patch({frameColor:color})}/>
      {opening.kind==='door'&&<ColorInput label="Door Panel" current={spec.panelColor} value={panelColor} setValue={setPanelColor} applyColor={color=>patch({panelColor:color})}/>} 
      <ColorInput label="Glass" current={spec.glassColor} value={glassColor} setValue={setGlassColor} applyColor={color=>patch({glassColor:color})}/>
    </>:<Text style={s.note}>Select a door or window to edit its contextual properties.</Text>}
    <Text style={s.note}>Digital colors are visual approximations. Confirm physical finish samples before ordering.</Text>
  </>;
  return compact?<View style={s.compact}>{content}</View>:<ScrollView contentContainerStyle={s.content}>{content}</ScrollView>;
}

function ColorInput({label,current,value,setValue,applyColor}:{label:string;current:string;value:string;setValue:(value:string)=>void;applyColor:(color:string)=>void}){
  const valid=/^#[0-9a-fA-F]{6}$/.test(value);
  return <View style={s.colorBlock}><View style={s.colorHeader}><Text style={s.label}>{label}</Text><View style={[s.swatch,{backgroundColor:current}]}/><Text style={s.colorCode}>{current}</Text></View><View style={s.colorInputRow}><TextInput autoCapitalize="characters" value={value} onChangeText={setValue} placeholder="#RRGGBB" style={s.input}/><Button label="Apply" disabled={!valid} onPress={()=>{applyColor(value.toUpperCase());setValue('');}}/></View></View>;
}

const s=StyleSheet.create({content:{paddingBottom:24},compact:{paddingBottom:12},title:{fontSize:16,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase',marginBottom:6},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},selectedTitle:{fontSize:17,fontWeight:'900',color:'#22312D',marginTop:10},meta:{fontSize:10,lineHeight:15,color:'#65736E',marginTop:2},section:{fontSize:11,fontWeight:'900',color:'#4D5E58',textTransform:'uppercase',marginTop:13,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},row:{flexDirection:'row',alignItems:'center',gap:5},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginBottom:4},active:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530',textAlign:'center'},activeText:{color:'#0E4939'},disabled:{opacity:.35},cards:{flexDirection:'row',flexWrap:'wrap',gap:7},card:{width:'47%',minHeight:100,borderWidth:1,borderColor:'#C7D2CE',borderRadius:10,backgroundColor:'#FFFFFF',padding:8,alignItems:'center'},cardActive:{borderWidth:2,borderColor:'#315F55',backgroundColor:'#E6F1ED'},cardName:{fontSize:10,fontWeight:'800',color:'#2C3A35',textAlign:'center',marginTop:6},doorPreview:{width:43,height:60,backgroundColor:'#92694C',borderWidth:3,borderColor:'#E9E7E0',position:'relative'},glassPreview:{backgroundColor:'#9FC8D5'},doublePreview:{borderLeftWidth:2,borderRightWidth:2,borderColor:'#E9E7E0'},shakerPanel:{position:'absolute',left:7,right:7,top:8,bottom:8,borderWidth:3,borderColor:'#6C4E39'},track:{position:'absolute',left:-8,right:-8,top:-6,height:3,backgroundColor:'#333A39'},windowPreview:{width:62,height:48,backgroundColor:'#9FC8D5',borderWidth:4,borderColor:'#E9E7E0',position:'relative'},horizontalMullion:{position:'absolute',left:0,right:0,top:'50%',height:3,backgroundColor:'#E9E7E0'},verticalMullion:{position:'absolute',top:0,bottom:0,left:'50%',width:3,backgroundColor:'#E9E7E0'},field:{gap:4,marginBottom:7},label:{fontSize:11,fontWeight:'800',color:'#46564F'},value:{minWidth:68,textAlign:'center',fontSize:12,fontWeight:'900',color:'#263530'},colorBlock:{marginBottom:9},colorHeader:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:4},swatch:{width:32,height:26,borderRadius:5,borderWidth:1,borderColor:'#A9B3AF'},colorCode:{fontSize:10,fontWeight:'800',color:'#61706A'},colorInputRow:{flexDirection:'row',alignItems:'center',gap:5},input:{flex:1,minHeight:40,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:9,backgroundColor:'#FFFFFF',fontSize:12,fontWeight:'700',color:'#24332E'},note:{fontSize:12,lineHeight:18,color:'#68766F',marginTop:11}});
