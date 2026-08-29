import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { arrangeCabinetRun, attachCabinetToWall, cabinetPlacementData, cabinetsOnWall, detachCabinet, moveAttachedCabinet, nearestWallForCabinet, snapCabinetBesideCabinet } from '../domain/cabinetPlacement';
import { applyToeKick, deleteObject, duplicateObject, EditorObject, EditorProject, isBaseLikeKind, isCabinetKind, ObjectKind, objectDefaults, updateObject } from '../domain/editor';

type Props={project:EditorProject;selected?:EditorObject;apply:(project:EditorProject,record?:boolean)=>void};
const LIBRARY:{label:string;kind:ObjectKind;description:string}[]=[
  {label:'Base',kind:'base-cabinet',description:'Standard base'},
  {label:'Sink Base',kind:'sink-base',description:'Sink cabinet'},
  {label:'Drawer Base',kind:'drawer-base',description:'Drawer stack'},
  {label:'Corner',kind:'corner-cabinet',description:'Corner base'},
  {label:'Wall',kind:'wall-cabinet',description:'Upper cabinet'},
  {label:'Glass Upper',kind:'glass-upper',description:'Glass doors'},
  {label:'Tall',kind:'tall-cabinet',description:'Full height'},
  {label:'Pantry',kind:'pantry-cabinet',description:'Pantry storage'},
  {label:'Oven',kind:'oven-cabinet',description:'Built-in oven'},
  {label:'Refrigerator',kind:'refrigerator-cabinet',description:'Fridge surround'},
];

function Button({label,onPress,active=false,disabled=false}:{label:string;onPress:()=>void;active?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress} style={[s.button,active&&s.buttonActive,disabled&&s.disabled]}><Text style={[s.buttonText,active&&s.buttonTextActive]}>{label}</Text></Pressable>;
}
function NumberField({label,value,onChange,min=0,max=1200,suffix=' in'}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number;suffix?:string}){
  const commit=(text:string)=>{const parsed=Number(text);if(Number.isFinite(parsed))onChange(Math.max(min,Math.min(max,parsed)));};
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.fieldRow}><Button label="−" onPress={()=>onChange(Math.max(min,Math.round((value-1)*10)/10))}/><TextInput accessibilityLabel={label} keyboardType="decimal-pad" defaultValue={String(Math.round(value*10)/10)} onEndEditing={event=>commit(event.nativeEvent.text)} style={s.input}/><Text style={s.suffix}>{suffix}</Text><Button label="+" onPress={()=>onChange(Math.min(max,Math.round((value+1)*10)/10))}/></View></View>;
}

export function CabinetToolPanel({project,selected,apply}:Props){
  const cabinet=selected&&isCabinetKind(selected.kind)?selected:undefined;
  const placement=cabinet?cabinetPlacementData(cabinet):undefined;
  const wall=placement?.parentWallId?project.objects.find(object=>object.id===placement.parentWallId&&object.kind==='wall'):undefined;
  const walls=project.objects.filter(object=>object.kind==='wall');
  const nearest=cabinet?nearestWallForCabinet(project,cabinet):undefined;
  const add=(kind:ObjectKind)=>{
    const object=objectDefaults(kind,{x:155+project.objects.length*7,y:125+project.objects.length*6});
    apply({...project,objects:[...project.objects,object],selectedId:object.id,updatedAt:new Date().toISOString()});
  };
  const patch=(next:Partial<EditorObject>)=>cabinet&&apply(updateObject(project,cabinet.id,next));
  const arrangeCurrentRun=()=>{
    if(!cabinet||!wall)return;
    const run=cabinetsOnWall(project,wall.id);
    const ids=run.some(object=>object.id===cabinet.id)?run.map(object=>object.id):[...run.map(object=>object.id),cabinet.id];
    apply(arrangeCabinetRun(project,wall.id,ids,0,0));
  };

  return <ScrollView contentContainerStyle={s.container}>
    <Text style={s.title}>Cabinets</Text>
    <Text style={s.help}>Add a cabinet, attach it to a wall, then build a continuous run. Placement updates the same object used by 2D, 3D, Undo and Save.</Text>
    <View style={s.catalog}>{LIBRARY.map(item=><Pressable accessibilityRole="button" key={item.kind} onPress={()=>add(item.kind)} style={s.catalogItem}><Text style={s.catalogIcon}>▦</Text><Text style={s.catalogTitle}>{item.label}</Text><Text style={s.catalogDescription}>{item.description}</Text></Pressable>)}</View>

    {cabinet?<>
      <View style={s.card}>
        <View style={s.headerRow}><View style={s.headerText}><Text style={s.selectedName}>{cabinet.name}</Text><Text style={s.kind}>{cabinet.kind.replace(/-/g,' ')}</Text></View><Text style={[s.status,placement?.attached&&s.statusAttached]}>{placement?.attached?'Wall Attached':'Free'}</Text></View>
        <View style={s.actions}><Button label="Duplicate" onPress={()=>apply(duplicateObject(project,cabinet.id))}/><Button label="Rotate 90°" onPress={()=>patch({rotation:(cabinet.rotation+90)%360})}/><Button label="Delete" onPress={()=>Alert.alert('Delete cabinet?',`Delete ${cabinet.name}?`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>apply(deleteObject(project,cabinet.id))}])}/></View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Wall Placement</Text>
        <Text style={s.smallHelp}>{wall?`Attached to ${wall.name}. The cabinet stays aligned and faces the room.`:nearest?`Nearest wall: ${nearest.wall.name}, about ${Math.round(nearest.distance)} in away.`:'No wall is close enough for automatic attachment.'}</Text>
        <View style={s.actions}><Button label="Attach to Nearest Wall" disabled={!nearest} onPress={()=>apply(attachCabinetToWall(project,cabinet.id))}/><Button label="Detach" disabled={!placement?.attached} onPress={()=>apply(detachCabinet(project,cabinet.id))}/></View>
        <View style={s.wallList}>{walls.map(item=><Button key={item.id} label={item.name} active={wall?.id===item.id} onPress={()=>apply(attachCabinetToWall(project,cabinet.id,item.id))}/>)}</View>
        {wall&&<><NumberField label="Position Along Wall" value={placement?.wallOffsetIn??0} onChange={value=>apply(moveAttachedCabinet(project,cabinet.id,value))}/><View style={s.actions}><Button label="− 5 in" onPress={()=>apply(moveAttachedCabinet(project,cabinet.id,(placement?.wallOffsetIn??0)-5))}/><Button label="+ 5 in" onPress={()=>apply(moveAttachedCabinet(project,cabinet.id,(placement?.wallOffsetIn??0)+5))}/><Button label="Arrange Attached Run" onPress={arrangeCurrentRun}/></View></>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Snap Beside Cabinet</Text>
        <Text style={s.smallHelp}>Choose another cabinet to place this cabinet directly before or after it without a visual gap.</Text>
        {project.objects.filter(object=>isCabinetKind(object.kind)&&object.id!==cabinet.id).slice(0,12).map(target=><View key={target.id} style={s.targetRow}><Text numberOfLines={1} style={s.targetName}>{target.name}</Text><Button label="Before" onPress={()=>apply(snapCabinetBesideCabinet(project,cabinet.id,target.id,'before'))}/><Button label="After" onPress={()=>apply(snapCabinetBesideCabinet(project,cabinet.id,target.id,'after'))}/></View>)}
      </View>

      {isBaseLikeKind(cabinet.kind)&&<View style={s.card}>
        <Text style={s.sectionTitle}>Toe Kick</Text>
        <View style={s.actions}><Button label={cabinet.toeKick?.enabled?'Selected On':'Selected Off'} active={cabinet.toeKick?.enabled} onPress={()=>apply(applyToeKick(project,{enabled:!(cabinet.toeKick?.enabled??true)},false))}/><Button label="All Base On" onPress={()=>apply(applyToeKick(project,{enabled:true},true))}/><Button label="All Base Off" onPress={()=>apply(applyToeKick(project,{enabled:false},true))}/></View>
        {cabinet.toeKick?.enabled&&<><NumberField label="Height" value={cabinet.toeKick.heightIn} min={1} max={12} onChange={heightIn=>apply(applyToeKick(project,{heightIn},false))}/><NumberField label="Recess" value={cabinet.toeKick.recessIn} min={0} max={12} onChange={recessIn=>apply(applyToeKick(project,{recessIn},false))}/></>}
      </View>}
    </>:<View style={s.empty}><Text style={s.emptyTitle}>Select a cabinet</Text><Text style={s.help}>Wall attachment, run arrangement, duplication, rotation and toe kick controls appear here.</Text></View>}
  </ScrollView>;
}

const s=StyleSheet.create({container:{paddingBottom:24},title:{fontSize:18,fontWeight:'900',color:'#1D2A27',marginBottom:5},help:{fontSize:13,lineHeight:19,color:'#5C6B66',marginBottom:10},catalog:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:12},catalogItem:{width:'48%',minHeight:84,borderWidth:1,borderColor:'#C5D0CC',borderRadius:10,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',padding:8},catalogIcon:{fontSize:23,color:'#315F55'},catalogTitle:{fontSize:11,fontWeight:'900',textAlign:'center',color:'#263530',marginTop:2},catalogDescription:{fontSize:9,color:'#6A7772',marginTop:2,textAlign:'center'},card:{borderWidth:1,borderColor:'#CBD5D1',borderRadius:11,backgroundColor:'#FFFFFF',padding:11,marginBottom:10},headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:8},headerText:{flex:1},selectedName:{fontSize:15,fontWeight:'900',color:'#24342E'},kind:{fontSize:9,fontWeight:'800',color:'#61716B',textTransform:'uppercase',marginTop:2},status:{overflow:'hidden',borderRadius:6,backgroundColor:'#ECEFEE',color:'#60706A',fontSize:9,fontWeight:'900',paddingHorizontal:7,paddingVertical:4,textTransform:'uppercase'},statusAttached:{backgroundColor:'#DDEDE7',color:'#245A49'},sectionTitle:{fontSize:12,fontWeight:'900',color:'#30423B',textTransform:'uppercase',marginBottom:5},smallHelp:{fontSize:11,lineHeight:16,color:'#68756F',marginBottom:8},actions:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:5},wallList:{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:6},button:{minHeight:42,borderWidth:1,borderColor:'#AFC0BA',borderRadius:9,backgroundColor:'#FFFFFF',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:11,fontWeight:'800',color:'#263530',textAlign:'center'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},field:{gap:4,marginBottom:8},fieldLabel:{fontSize:11,fontWeight:'800',color:'#4A5B55'},fieldRow:{flexDirection:'row',alignItems:'center',gap:4},input:{width:75,minHeight:42,borderWidth:1,borderColor:'#B9C7C2',borderRadius:8,backgroundColor:'#FFFFFF',paddingHorizontal:8,textAlign:'center',fontSize:13,fontWeight:'900',color:'#263530'},suffix:{fontSize:10,fontWeight:'800',color:'#60706A'},targetRow:{flexDirection:'row',alignItems:'center',gap:4,borderTopWidth:1,borderTopColor:'#E2E7E5',paddingTop:6,marginTop:3},targetName:{flex:1,fontSize:11,fontWeight:'800',color:'#3D4E48'},empty:{borderWidth:1,borderStyle:'dashed',borderColor:'#B9C7C2',borderRadius:10,padding:12},emptyTitle:{fontSize:14,fontWeight:'900',color:'#34443E',marginBottom:3}});
