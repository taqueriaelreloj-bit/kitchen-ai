import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EditorObject, EditorProject } from '../domain/editor';
import {
  createCatalogOpening, isCatalogOpening, OpeningCategory, openingCatalogSpec,
  openingModel, openingsByCategory, TrimStyle, updateOpeningAppearance,
} from '../domain/openingCatalog';
import { openingData, setDoorSwing, setWindowSillHeight, SwingDirection } from '../domain/openings';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};
const TRIMS:TrimStyle[]=['No Trim','Modern Square','Traditional Casing','Craftsman'];
const SWINGS:SwingDirection[]=['Left In','Right In','Left Out','Right Out'];
const COLORS=[{id:'white',name:'White',value:'#F0EEE8'},{id:'black',name:'Black',value:'#202424'},{id:'bronze',name:'Bronze',value:'#554438'},{id:'wood',name:'Wood',value:'#8A664B'}];

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.buttonActive,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

function Thumbnail({category,style}:{category:OpeningCategory;style:string}){
  if(category==='Doors')return <View style={s.doorThumb}><View style={s.doorInset}/>{style.includes('Glass')&&<View style={s.doorGlass}/>}<View style={s.handle}/></View>;
  return <View style={s.windowThumb}><View style={s.windowGlass}/>{(style.includes('Double')||style==='Slider')&&<View style={s.mullion}/>}<View style={s.sill}/></View>;
}

export function OpeningCatalogPanel({project,selected,apply}:Props){
  const[category,setCategory]=useState<OpeningCategory>('Doors');
  const models=useMemo(()=>openingsByCategory(category),[category]);
  const walls=project.objects.filter(object=>object.kind==='wall');
  const selectedSpec=selected&&isCatalogOpening(selected)?openingCatalogSpec(selected):undefined;
  const selectedModel=selectedSpec?openingModel(selectedSpec.modelId):undefined;
  const selectedWall=selected?.kind==='wall'?selected:walls[0];
  const add=(modelId:string)=>apply(createCatalogOpening(project,modelId,selectedWall?.id,24));

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Doors & Windows</Text>
    <Text style={s.help}>Select a wall, then add a real opening with market-standard dimensions. Openings cut the wall in 3D and remain attached when moved or resized.</Text>
    <View style={s.tabs}><Button label="Doors" active={category==='Doors'} onPress={()=>setCategory('Doors')}/><Button label="Windows" active={category==='Windows'} onPress={()=>setCategory('Windows')}/></View>
    <Text style={s.wallNotice}>{selectedWall?`Adding to ${selectedWall.name}`:'Add a wall before inserting an opening.'}</Text>
    {models.map(model=><View key={model.id} style={s.card}><View style={s.thumb}><Thumbnail category={model.category} style={model.style}/></View><View style={s.cardCopy}><Text style={s.name}>{model.displayName}</Text><Text style={s.dimensions}>{model.widthIn} × {model.heightIn} in{model.category==='Windows'?` · ${model.sillHeightIn} in sill`:''}</Text><Text style={s.description}>{model.description}</Text><View style={s.tags}><Text style={s.tag}>{model.style}</Text><Text style={s.tag}>{model.trimStyle}</Text></View><Button label="Add to Wall" disabled={!selectedWall} onPress={()=>add(model.id)}/></View></View>)}

    {selected&&selectedModel&&selectedSpec&&<View style={s.selectedSection}>
      <Text style={s.sectionTitle}>Selected Opening</Text><Text style={s.selectedName}>{selectedModel.displayName}</Text>
      <Text style={s.meta}>Wall {openingData(selected).parentWallId??'Unattached'} · Offset {Math.round(openingData(selected).wallOffsetIn??0)} in</Text>
      {selected.kind==='window'&&<View style={s.stepRow}><Button label="Sill −" onPress={()=>apply(setWindowSillHeight(project,selected.id,Math.max(0,(openingData(selected).sillHeightIn??selected.elevationIn??36)-1)))}/><Text style={s.stepValue}>{Math.round(openingData(selected).sillHeightIn??selected.elevationIn??36)} in sill</Text><Button label="Sill +" onPress={()=>apply(setWindowSillHeight(project,selected.id,(openingData(selected).sillHeightIn??selected.elevationIn??36)+1))}/></View>}
      {selected.kind==='door'&&selectedModel.style!=='Pocket Door'&&<><Text style={s.label}>Swing</Text><View style={s.wrap}>{SWINGS.map(swing=><Button key={swing} label={swing} active={openingData(selected).swingDirection===swing} onPress={()=>apply(setDoorSwing(project,selected.id,swing))}/>)}</View></>}
      <Text style={s.label}>Trim</Text><View style={s.wrap}>{TRIMS.map(trim=><Button key={trim} label={trim} active={selectedSpec.trimStyle===trim} onPress={()=>apply(updateOpeningAppearance(project,selected.id,{trimStyle:trim}))}/>)}</View>
      <Text style={s.label}>Frame Color</Text><View style={s.swatches}>{COLORS.map(color=><Pressable accessibilityRole="button" accessibilityState={{selected:selectedSpec.frameColor===color.value}} key={color.id} onPress={()=>apply(updateOpeningAppearance(project,selected.id,{frameColor:color.value,panelColor:selected.kind==='door'?color.value:selectedSpec.panelColor}))} style={[s.swatchWrap,selectedSpec.frameColor===color.value&&s.swatchSelected]}><View style={[s.swatch,{backgroundColor:color.value}]}/><Text style={s.swatchName}>{color.name}</Text></Pressable>)}</View>
    </View>}
    <Text style={s.note}>Final openings must be field-verified for rough-opening size, header requirements, flashing, swing clearance and local code.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:22},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:12,lineHeight:18,color:'#5C6B66',marginBottom:8},tabs:{flexDirection:'row',gap:4},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginRight:3,marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},wallNotice:{fontSize:10,fontWeight:'800',color:'#4D665E',backgroundColor:'#EAF3F0',borderRadius:7,padding:7,marginVertical:7},card:{borderWidth:1,borderColor:'#C7D1CD',borderRadius:11,backgroundColor:'#FFFFFF',padding:9,marginBottom:9,flexDirection:'row',gap:9},thumb:{width:82,minHeight:112,borderRadius:8,backgroundColor:'#E5EAE8',alignItems:'center',justifyContent:'center'},doorThumb:{width:44,height:88,borderWidth:2,borderColor:'#7D7062',backgroundColor:'#9A7557',position:'relative'},doorInset:{position:'absolute',left:6,right:6,top:8,bottom:8,borderWidth:1,borderColor:'#74533D'},doorGlass:{position:'absolute',left:7,right:7,top:7,height:48,backgroundColor:'#9EC9D8',opacity:.75},handle:{position:'absolute',right:5,top:43,width:3,height:3,borderRadius:2,backgroundColor:'#D8D1C0'},windowThumb:{width:62,height:56,borderWidth:4,borderColor:'#ECEAE4',backgroundColor:'#91C7DC',position:'relative'},windowGlass:{position:'absolute',left:2,right:2,top:2,bottom:2,backgroundColor:'#9ECBDD'},mullion:{position:'absolute',left:'49%',top:0,bottom:0,width:3,backgroundColor:'#ECEAE4'},sill:{position:'absolute',left:-5,right:-5,bottom:-7,height:4,backgroundColor:'#ECEAE4'},cardCopy:{flex:1},name:{fontSize:13,fontWeight:'900',color:'#23312D'},dimensions:{fontSize:10,fontWeight:'800',color:'#315F55',marginTop:2},description:{fontSize:10,lineHeight:15,color:'#64716C',marginVertical:4},tags:{flexDirection:'row',flexWrap:'wrap',gap:3,marginBottom:5},tag:{overflow:'hidden',borderRadius:4,backgroundColor:'#E9EFED',paddingHorizontal:4,paddingVertical:2,fontSize:8,fontWeight:'800',color:'#4B5C56'},selectedSection:{borderTopWidth:1,borderTopColor:'#CFD7D4',paddingTop:11,marginTop:6},sectionTitle:{fontSize:12,fontWeight:'900',color:'#33443E',textTransform:'uppercase'},selectedName:{fontSize:15,fontWeight:'900',color:'#315F55',marginTop:3},meta:{fontSize:10,color:'#64716C',marginTop:3,marginBottom:7},label:{fontSize:10,fontWeight:'900',color:'#4D5C57',textTransform:'uppercase',marginTop:6,marginBottom:4},wrap:{flexDirection:'row',flexWrap:'wrap',gap:3},stepRow:{flexDirection:'row',alignItems:'center'},stepValue:{minWidth:90,textAlign:'center',fontSize:11,fontWeight:'900',color:'#263530'},swatches:{flexDirection:'row',flexWrap:'wrap'},swatchWrap:{width:'23%',margin:'1%',padding:3,borderWidth:2,borderColor:'transparent',borderRadius:7},swatchSelected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},swatch:{height:34,borderRadius:5,borderWidth:1,borderColor:'#BFC8C5'},swatchName:{fontSize:8,fontWeight:'700',color:'#2B3935',marginTop:2,textAlign:'center'},note:{fontSize:10,lineHeight:16,color:'#707B77',marginTop:8}});
