import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addCatalogAppliance,
  APPLIANCE_CATALOG,
  APPLIANCE_CATEGORIES,
  APPLIANCE_FINISHES,
  ApplianceCategory,
  applianceCatalogItem,
  applianceData,
  replaceApplianceModel,
  updateApplianceFinish,
} from '../domain/applianceCatalog';
import { deleteObject, duplicateObject, EditorObject, EditorProject, updateObject } from '../domain/editor';
import { isLighting } from '../domain/lighting';

type Props={
  project:EditorProject;
  selected?:EditorObject;
  apply:(project:EditorProject,record?:boolean)=>void;
};

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.buttonActive,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function NumberField({label,value,onChange,min=0,max=240,suffix=' in'}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number;suffix?:string}){
  const commit=(text:string)=>{const parsed=Number(text);if(Number.isFinite(parsed))onChange(Math.max(min,Math.min(max,parsed)));};
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.fieldRow}><Button label="−" onPress={()=>onChange(Math.max(min,Math.round((value-1)*10)/10))}/><TextInput accessibilityLabel={label} keyboardType="decimal-pad" defaultValue={String(Math.round(value*10)/10)} onEndEditing={event=>commit(event.nativeEvent.text)} style={s.input}/><Text style={s.suffix}>{suffix}</Text><Button label="+" onPress={()=>onChange(Math.min(max,Math.round((value+1)*10)/10))}/></View></View>;
}
function FinishSwatch({id,name,color,selected,onPress}:{id:string;name:string;color:string;selected:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityLabel={name} accessibilityState={{selected}} onPress={onPress} style={[s.swatchWrap,selected&&s.swatchSelected]}><View style={[s.swatch,{backgroundColor:color}]}><View style={s.swatchHighlight}/></View><Text numberOfLines={2} style={s.swatchName}>{name}</Text><Text style={s.swatchCode}>{id}</Text></Pressable>;
}

export function ApplianceToolPanel({project,selected,apply}:Props){
  const[category,setCategory]=useState<ApplianceCategory>('Gas Ranges');
  const[query,setQuery]=useState('');
  const appliance=selected?.kind==='appliance'&&!isLighting(selected)?selected:undefined;
  const spec=appliance?applianceData(appliance):undefined;
  const catalogItem=spec?applianceCatalogItem(spec.catalogId):undefined;
  const items=useMemo(()=>{
    const search=query.trim().toLowerCase();
    return APPLIANCE_CATALOG.filter(item=>item.category===category&&(!search||item.displayName.toLowerCase().includes(search)||item.description.toLowerCase().includes(search)||item.installation?.toLowerCase().includes(search)));
  },[category,query]);
  const patch=(next:Partial<EditorObject>)=>appliance&&apply(updateObject(project,appliance.id,next));

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Appliances</Text>
    <Text style={s.help}>Choose a real appliance type and size. Stainless steel is selected by default. Every appliance remains movable, rotatable, duplicable, selectable and saved with the project.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>{APPLIANCE_CATEGORIES.map(item=><Button key={item} label={item} active={category===item} onPress={()=>setCategory(item)}/>)}</ScrollView>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search appliances" accessibilityLabel="Search appliances" style={s.search}/>

    <View style={s.catalog}>{items.map(item=><Pressable accessibilityRole="button" key={item.id} onPress={()=>apply(addCatalogAppliance(project,item.id))} style={s.catalogItem}>
      <View style={s.appliancePreview}>
        <View style={[s.applianceBody,{width:item.widthIn>=36?48:42,height:Math.max(36,Math.min(68,item.heightIn*.72))}]}/>
        {item.category==='Gas Ranges'&&<><View style={s.rangeTop}/><View style={s.rangeWindow}/><View style={s.rangeHandle}/></>}
        {item.category==='Refrigerators'&&<><View style={s.fridgeDivider}/><View style={s.fridgeHandleLeft}/><View style={s.fridgeHandleRight}/></>}
      </View>
      <Text style={s.catalogName}>{item.displayName}</Text>
      <Text style={s.catalogMeta}>{item.widthIn}" W · {item.installation??'Standard'}</Text>
      {item.category==='Gas Ranges'&&<Text style={s.catalogFeature}>{item.burners} burners · Gas</Text>}
      <Text numberOfLines={2} style={s.catalogDescription}>{item.description}</Text>
      <View style={s.addBadge}><Text style={s.addBadgeText}>Add</Text></View>
    </Pressable>)}</View>

    {appliance?<>
      <View style={s.card}>
        <View style={s.headerRow}><View style={s.headerText}><Text style={s.selectedName}>{appliance.name}</Text><Text style={s.selectedMeta}>{catalogItem?.displayName??'Custom appliance'} · {spec?.category}</Text></View><Text style={s.status}>Selected</Text></View>
        {spec?.fuel&&<Text style={s.feature}>{spec.fuel}{spec.burners?` · ${spec.burners} burners`:''}{spec.installation?` · ${spec.installation}`:''}</Text>}
        <View style={s.actions}><Button label="Duplicate" onPress={()=>apply(duplicateObject(project,appliance.id))}/><Button label="Rotate 90°" onPress={()=>patch({rotation:(appliance.rotation+90)%360})}/><Button label="Delete" onPress={()=>Alert.alert('Delete appliance?',`Delete ${appliance.name}?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>apply(deleteObject(project,appliance.id))}])}/></View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Model</Text>
        <Text style={s.smallHelp}>Replace the selected appliance without creating a second object. Position, rotation, selection and finish remain connected to the same project history.</Text>
        <View style={s.modelList}>{APPLIANCE_CATALOG.filter(item=>item.category===spec?.category).map(item=><Button key={item.id} label={item.displayName} active={spec?.catalogId===item.id} onPress={()=>apply(replaceApplianceModel(project,appliance.id,item.id))}/>)}</View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Color & Finish</Text>
        <View style={s.finishes}>{APPLIANCE_FINISHES.map(finish=><FinishSwatch key={finish.id} id={finish.id} name={finish.displayName} color={finish.baseColor} selected={spec?.finishId===finish.id} onPress={()=>apply(updateApplianceFinish(project,appliance.id,finish.id))}/>)}</View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Dimensions & Position</Text>
        <NumberField label="Width" value={appliance.widthIn} min={12} max={72} onChange={widthIn=>patch({widthIn})}/>
        <NumberField label="Height" value={appliance.heightIn} min={4} max={96} onChange={heightIn=>patch({heightIn})}/>
        <NumberField label="Depth" value={appliance.depthIn} min={4} max={48} onChange={depthIn=>patch({depthIn})}/>
        <NumberField label="Elevation" value={appliance.elevationIn??0} min={0} max={120} onChange={elevationIn=>patch({elevationIn})}/>
        <NumberField label="Rotation" value={appliance.rotation} min={-360} max={360} suffix="°" onChange={rotation=>patch({rotation:((rotation%360)+360)%360})}/>
      </View>
    </>:<View style={s.empty}><Text style={s.emptyTitle}>Select an appliance</Text><Text style={s.help}>Model, finish, dimensions, rotation, duplication and delete controls appear here.</Text></View>}

    <Text style={s.note}>Dimensions are representative catalog sizes for design planning. Confirm exact manufacturer specifications, gas/electrical requirements and clearances before construction.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:24},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},categories:{gap:4,paddingBottom:4},search:{minHeight:44,borderWidth:1,borderColor:'#BBC7C3',borderRadius:9,paddingHorizontal:10,backgroundColor:'#FFFFFF',marginBottom:10},button:{minHeight:42,borderWidth:1,borderColor:'#AFC0BA',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530',textAlign:'center'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},catalog:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},catalogItem:{position:'relative',width:'48%',minHeight:190,borderWidth:1,borderColor:'#C5D0CC',borderRadius:11,backgroundColor:'#FFFFFF',alignItems:'center',padding:9,paddingBottom:31},appliancePreview:{height:72,width:'100%',alignItems:'center',justifyContent:'flex-end',position:'relative'},applianceBody:{backgroundColor:'#A7ADAE',borderWidth:1,borderColor:'#667173',borderRadius:3},rangeTop:{position:'absolute',bottom:51,width:44,height:5,borderRadius:2,backgroundColor:'#333737'},rangeWindow:{position:'absolute',bottom:10,width:31,height:22,borderRadius:2,backgroundColor:'#303637'},rangeHandle:{position:'absolute',bottom:36,width:34,height:3,borderRadius:2,backgroundColor:'#4A4F50'},fridgeDivider:{position:'absolute',bottom:18,width:46,height:1,backgroundColor:'#646B6D'},fridgeHandleLeft:{position:'absolute',bottom:31,left:'42%',width:2,height:26,backgroundColor:'#555D5F'},fridgeHandleRight:{position:'absolute',bottom:31,right:'42%',width:2,height:26,backgroundColor:'#555D5F'},catalogName:{fontSize:11,fontWeight:'900',textAlign:'center',color:'#263530',marginTop:5},catalogMeta:{fontSize:9,fontWeight:'800',color:'#60706A',marginTop:3,textAlign:'center'},catalogFeature:{fontSize:9,fontWeight:'800',color:'#3A6558',marginTop:2},catalogDescription:{fontSize:9,lineHeight:13,color:'#6A7772',marginTop:4,textAlign:'center'},addBadge:{position:'absolute',left:0,right:0,bottom:0,minHeight:27,borderBottomLeftRadius:10,borderBottomRightRadius:10,backgroundColor:'#DDEEE8',alignItems:'center',justifyContent:'center'},addBadgeText:{fontSize:10,fontWeight:'900',color:'#235544'},card:{borderWidth:1,borderColor:'#CBD5D1',borderRadius:11,backgroundColor:'#FFFFFF',padding:11,marginBottom:10},headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},headerText:{flex:1},selectedName:{fontSize:15,fontWeight:'900',color:'#24342E'},selectedMeta:{fontSize:10,fontWeight:'700',color:'#61716B',marginTop:2},status:{overflow:'hidden',borderRadius:6,backgroundColor:'#DDEDE7',color:'#245A49',fontSize:9,fontWeight:'900',paddingHorizontal:7,paddingVertical:4,textTransform:'uppercase'},feature:{fontSize:11,fontWeight:'800',color:'#3C5C52',marginTop:7,marginBottom:5},actions:{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:7},sectionTitle:{fontSize:12,fontWeight:'900',color:'#30423B',textTransform:'uppercase',marginBottom:5},smallHelp:{fontSize:11,lineHeight:16,color:'#68756F',marginBottom:8},modelList:{gap:2},finishes:{flexDirection:'row',flexWrap:'wrap'},swatchWrap:{width:'31%',margin:'1%',padding:4,borderWidth:2,borderColor:'transparent',borderRadius:8,minHeight:88},swatchSelected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},swatch:{height:43,borderRadius:6,borderWidth:1,borderColor:'#C9D0CD',overflow:'hidden'},swatchHighlight:{height:7,backgroundColor:'#FFFFFF44'},swatchName:{fontSize:9,fontWeight:'800',color:'#2B3935',marginTop:3},swatchCode:{fontSize:7,color:'#74817C',marginTop:1},field:{gap:4,marginBottom:8},fieldLabel:{fontSize:11,fontWeight:'800',color:'#4A5B55'},fieldRow:{flexDirection:'row',alignItems:'center',gap:4},input:{width:75,minHeight:42,borderWidth:1,borderColor:'#B9C7C2',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:8,textAlign:'center',fontSize:13,fontWeight:'900',color:'#263530'},suffix:{fontSize:10,fontWeight:'800',color:'#60706A'},empty:{borderWidth:1,borderStyle:'dashed',borderColor:'#B9C7C2',borderRadius:10,padding:12},emptyTitle:{fontSize:14,fontWeight:'900',color:'#34443E',marginBottom:3},note:{fontSize:10,lineHeight:15,color:'#697670',marginTop:5}});
