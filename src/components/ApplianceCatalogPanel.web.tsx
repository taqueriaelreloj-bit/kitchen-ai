import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  APPLIANCE_COLORS, ApplianceCategory, applianceModel, applianceSpec, appliancesByCategory,
  createCatalogAppliance, isCatalogAppliance, updateApplianceColor,
} from '../domain/applianceCatalog';
import { EditorObject, EditorProject } from '../domain/editor';

const CATEGORIES:ApplianceCategory[]=['Gas Ranges','Refrigerators','Dishwashers'];

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject)=>void};

function Button({label,onPress,active=false}:{label:string;onPress:()=>void;active?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}

export function ApplianceCatalogPanel({project,selected,apply}:Props){
  const[category,setCategory]=useState<ApplianceCategory>('Gas Ranges');
  const models=useMemo(()=>appliancesByCategory(category),[category]);
  const selectedSpec=selected&&isCatalogAppliance(selected)?applianceSpec(selected):undefined;
  const selectedModel=selectedSpec?applianceModel(selectedSpec.modelId):undefined;

  const add=(modelId:string)=>{
    const object=createCatalogAppliance(modelId,{x:155+project.objects.length*8,y:125+project.objects.length*6});
    apply({...project,objects:[...project.objects,object],selectedId:object.id,updatedAt:new Date().toISOString()});
  };

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Appliances</Text>
    <Text style={s.help}>Real editable appliance objects with market-standard dimensions. Stainless steel is selected by default.</Text>
    <View style={s.tabs}>{CATEGORIES.map(item=><Button key={item} label={item} active={category===item} onPress={()=>setCategory(item)}/>)}</View>
    {models.map(model=><View key={model.id} style={s.card}>
      <View style={s.thumbnail} accessibilityLabel={`${model.displayName} 3D catalog thumbnail`}>
        <View style={[s.applianceBody,{width:Math.max(54,Math.min(96,model.widthIn*1.8)),height:Math.max(74,Math.min(126,model.heightIn*1.35))}]}>
          {model.category==='Gas Ranges'?<><View style={s.rangeTop}/><View style={s.controlPanel}/><View style={s.ovenWindow}/></>:model.category==='Refrigerators'?<><View style={s.fridgeSplit}/><View style={s.freezerDrawer}/></>:<><View style={s.dishwasherPanel}/><View style={s.dishwasherHandle}/></>}
        </View>
      </View>
      <View style={s.cardCopy}><Text style={s.name}>{model.displayName}</Text><Text style={s.dimensions}>{model.widthIn} × {model.depthIn} × {model.heightIn} in</Text><Text style={s.description}>{model.description}</Text><View style={s.tags}>{model.burnerCount&&<Text style={s.tag}>{model.burnerCount} burners</Text>}{model.ovenCount&&<Text style={s.tag}>{model.ovenCount} oven{model.ovenCount>1?'s':''}</Text>}<Text style={s.tag}>{model.installation}</Text></View><Button label="Add to Kitchen" onPress={()=>add(model.id)}/></View>
    </View>)}
    {selectedModel&&selectedSpec&&<View style={s.selectedCard}>
      <Text style={s.sectionTitle}>Selected Appliance</Text>
      <Text style={s.selectedName}>{selectedModel.displayName}</Text>
      <Text style={s.help}>Choose an available digital finish. It is preserved when the project is saved and loaded.</Text>
      <View style={s.swatches}>{selectedModel.availableColorIds.map(colorId=>{const finish=APPLIANCE_COLORS.find(item=>item.id===colorId)!;return <Pressable key={finish.id} accessibilityRole="button" accessibilityState={{selected:selectedSpec.colorId===finish.id}} onPress={()=>apply(updateApplianceColor(project,selected!.id,finish.id))} style={[s.swatchWrap,selectedSpec.colorId===finish.id&&s.swatchSelected]}><View style={[s.swatch,{backgroundColor:finish.color}]}/><Text style={s.swatchName}>{finish.name}</Text></Pressable>;})}</View>
    </View>}
  </ScrollView>;
}

const s=StyleSheet.create({
  container:{paddingBottom:24},title:{fontSize:19,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},tabs:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:10},button:{minHeight:42,borderWidth:1,borderColor:'#B8C5C1',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginRight:3,marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},card:{borderWidth:1,borderColor:'#C7D1CD',borderRadius:12,backgroundColor:'#FFFFFF',padding:10,marginBottom:10,flexDirection:'row',gap:10},thumbnail:{width:108,minHeight:142,borderRadius:9,backgroundColor:'#E5EAE8',alignItems:'center',justifyContent:'flex-end',padding:8},applianceBody:{borderWidth:1,borderColor:'#707A78',borderRadius:4,backgroundColor:'#A9B0B1',overflow:'hidden',justifyContent:'flex-start'},rangeTop:{height:13,backgroundColor:'#252929',borderBottomWidth:2,borderBottomColor:'#777F7F'},controlPanel:{height:16,margin:4,borderRadius:2,backgroundColor:'#4B5050'},ovenWindow:{flex:1,marginHorizontal:7,marginBottom:8,borderWidth:2,borderColor:'#737A7A',backgroundColor:'#252929'},fridgeSplit:{position:'absolute',top:0,bottom:27,left:'50%',width:1,backgroundColor:'#747C7C'},freezerDrawer:{position:'absolute',height:27,left:0,right:0,bottom:0,borderTopWidth:2,borderTopColor:'#747C7C'},dishwasherPanel:{height:18,backgroundColor:'#454A4A'},dishwasherHandle:{height:3,marginHorizontal:9,marginTop:7,backgroundColor:'#303434'},cardCopy:{flex:1,minWidth:0},name:{fontSize:14,fontWeight:'900',color:'#23312D'},dimensions:{fontSize:11,fontWeight:'800',color:'#3E5D53',marginTop:3},description:{fontSize:11,lineHeight:16,color:'#61706B',marginVertical:5},tags:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:6},tag:{overflow:'hidden',borderRadius:5,backgroundColor:'#E9EFED',paddingHorizontal:5,paddingVertical:3,fontSize:9,fontWeight:'800',color:'#42544E'},selectedCard:{borderTopWidth:1,borderTopColor:'#C6D0CC',paddingTop:13,marginTop:5},sectionTitle:{fontSize:13,fontWeight:'900',textTransform:'uppercase',color:'#263530'},selectedName:{fontSize:15,fontWeight:'900',color:'#315F55',marginTop:4,marginBottom:3},swatches:{flexDirection:'row',flexWrap:'wrap'},swatchWrap:{width:'31%',margin:'1%',padding:4,borderWidth:2,borderColor:'transparent',borderRadius:8,minHeight:76},swatchSelected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},swatch:{height:40,borderRadius:6,borderWidth:1,borderColor:'#BFC8C5'},swatchName:{fontSize:9,fontWeight:'700',color:'#2B3935',marginTop:3},
});
