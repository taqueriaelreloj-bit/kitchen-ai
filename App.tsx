import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EditorPriceScreen } from './src/components/EditorPriceScreen';
import { EditorShell } from './src/components/EditorShell';
import { Choice, colors, PrimaryButton, Screen, StepHeader } from './src/components/UI';
import { generateDesigns } from './src/domain/design';
import { createEditorProject, EditorProject, migrateProject } from './src/domain/editor';
import { createLuisTenByElevenKitchen } from './src/domain/luisKitchenDemo';
import { createBlankManualProject, ManualRoomInput } from './src/domain/starterProjects';
import { REQUIRED_SCAN_ANGLES, roomArea, updateRoomDimensions } from './src/domain/room';
import { CabinetColor, Countertop, KitchenDesign, RoomModel, ScanPhoto } from './src/domain/types';
import { reconstructWithBestProvider } from './src/services/reconstruction';

type Stage='home'|'manual'|'scan'|'reconstruct'|'room'|'designs'|'customize'|'editor'|'price';
const STORAGE_KEY='kitchen-ai-project-v2';
const LEGACY_STORAGE_KEY='kitchen-ai-project-v1';

function Preview({design,large=false}:{design:KitchenDesign;large?:boolean}){
  const cabinet={cream:'#E9DFC9',white:'#F9F9F6',navy:'#334B62',wood:'#A66D43'}[design.cabinetColor];
  const counter={quartz:'#F3F0E8',granite:'#777974',laminate:'#C7B28F'}[design.countertop];
  return <View style={[s.preview,large&&s.previewLarge,{backgroundColor:design.accent}]}>
    <View style={s.window}><View style={s.windowLine}/></View>
    <View style={[s.wallCabinet,{backgroundColor:cabinet}]}/><View style={[s.wallCabinet,s.wallCabinet2,{backgroundColor:cabinet}]}/>
    <View style={[s.counter,{backgroundColor:counter}]}/><View style={[s.baseCabinet,{backgroundColor:cabinet}]}/><View style={[s.baseCabinet,s.baseCabinet2,{backgroundColor:cabinet}]}/>
    {design.includesIsland&&<View style={[s.island,{backgroundColor:cabinet,borderTopColor:counter}]}/>} 
  </View>;
}

function SecondaryButton({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.secondaryButton}><Text style={s.secondaryButtonText}>{label}</Text></Pressable>;
}

function Home({saved,scan,manual,demo,resume}:{saved:boolean;scan:()=>void;manual:()=>void;demo:()=>void;resume:()=>void}){
  return <Screen><ScrollView contentContainerStyle={s.home}>
    <View style={s.brand}><Text style={s.brandMark}>K</Text><View><Text style={s.brandText}>Kitchen AI</Text><Text style={s.version}>Versión corregida · Cámara opcional</Text></View></View>
    <Text style={s.hero}>Diseñe su cocina sin depender de una cámara.</Text>
    <Text style={s.lead}>Ingrese las medidas del cuarto, abra una cocina limpia de ejemplo o escanee con un teléfono cuando lo necesite.</Text>
    <View style={s.flow}>{['1  Ingrese medidas o escanee','2  Agregue gabinetes y electrodomésticos','3  Revise el plano en 2D y 3D'].map(item=><Text key={item} style={s.flowItem}>{item}</Text>)}</View>
    <PrimaryButton label="Diseñar sin cámara" onPress={manual}/>
    <View style={s.homeActions}><SecondaryButton label="Abrir cocina de ejemplo limpia" onPress={demo}/><SecondaryButton label="Escanear con cámara" onPress={scan}/></View>
    {saved&&<Pressable onPress={resume} style={s.resume}><Text style={s.resumeText}>Abrir mi proyecto guardado</Text></Pressable>}
    <Text style={s.privacy}>La cámara es opcional. En computadora puede crear el plano escribiendo ancho, largo y altura.</Text>
  </ScrollView></Screen>;
}

function ManualSetup({back,create}:{back:()=>void;create:(input:ManualRoomInput)=>void}){
  const[widthFt,setWidthFt]=useState('10');
  const[lengthFt,setLengthFt]=useState('11');
  const[heightFt,setHeightFt]=useState('8');
  const[layout,setLayout]=useState<RoomModel['layout']>('L');
  const parse=(value:string,fallback:number)=>{const number=Number(value.replace(',','.'));return Number.isFinite(number)?number:fallback;};
  const input:ManualRoomInput={widthFt:parse(widthFt,10),lengthFt:parse(lengthFt,11),heightFt:parse(heightFt,8),layout};
  const valid=input.widthFt>=5&&input.widthFt<=60&&input.lengthFt>=5&&input.lengthFt<=60&&input.heightFt>=7&&input.heightFt<=20;
  const layouts:[RoomModel['layout'],string][]=[['L','Forma L'],['U','Forma U'],['galley','Galley / dos líneas'],['single-wall','Una pared']];
  return <Screen><StepHeader step="Inicio sin cámara" title="Ingrese las medidas del cuarto" onBack={back}/><ScrollView contentContainerStyle={s.manualContent}>
    <View style={s.manualNotice}><Text style={s.manualNoticeTitle}>No necesita cámara</Text><Text style={s.body}>Kitchen AI creará un cuarto vacío y ordenado. Después podrá agregar paredes, puertas, gabinetes, estufa, refrigerador e isla desde el editor.</Text></View>
    <View style={s.card}><Text style={s.cardTitle}>Medidas en pies</Text>
      <View style={s.manualGrid}>
        <View style={s.manualField}><Text style={s.measureLabel}>Ancho</Text><TextInput accessibilityLabel="Ancho del cuarto en pies" value={widthFt} onChangeText={setWidthFt} keyboardType="decimal-pad" selectTextOnFocus style={s.manualInput}/><Text style={s.manualSuffix}>ft</Text></View>
        <View style={s.manualField}><Text style={s.measureLabel}>Largo</Text><TextInput accessibilityLabel="Largo del cuarto en pies" value={lengthFt} onChangeText={setLengthFt} keyboardType="decimal-pad" selectTextOnFocus style={s.manualInput}/><Text style={s.manualSuffix}>ft</Text></View>
        <View style={s.manualField}><Text style={s.measureLabel}>Altura</Text><TextInput accessibilityLabel="Altura del cuarto en pies" value={heightFt} onChangeText={setHeightFt} keyboardType="decimal-pad" selectTextOnFocus style={s.manualInput}/><Text style={s.manualSuffix}>ft</Text></View>
      </View>
      <Text style={s.sectionTitle}>Distribución inicial</Text><View style={s.choiceGrid}>{layouts.map(([value,label])=><Choice key={value} label={label} selected={layout===value} onPress={()=>setLayout(value)}/>)}</View>
    </View>
    {!valid&&<Text style={s.manualError}>Use medidas entre 5 y 60 pies; altura entre 7 y 20 pies.</Text>}
    <PrimaryButton label="Crear plano vacío" disabled={!valid} onPress={()=>create(input)}/>
    <SecondaryButton label="Usar medidas 10 × 11" onPress={()=>create({widthFt:10,lengthFt:11,heightFt:8,layout:'single-wall'})}/>
  </ScrollView></Screen>;
}

function Scan({done,back,manual}:{done:(photos:ScanPhoto[])=>void;back:()=>void;manual:()=>void}){
  const[permission,requestPermission]=useCameraPermissions();
  const[photos,setPhotos]=useState<ScanPhoto[]>([]);
  const[busy,setBusy]=useState(false);
  const camera=useRef<CameraView>(null);
  async function capture(){
    const angle=REQUIRED_SCAN_ANGLES[photos.length];
    if(!camera.current||busy||angle===undefined)return;
    setBusy(true);
    try{
      const shot=await camera.current.takePictureAsync({quality:.55,skipProcessing:true});
      if(!shot?.uri)throw new Error();
      const next=[...photos,{uri:shot.uri,angle,capturedAt:new Date().toISOString()}];
      setPhotos(next);
      if(next.length===4)done(next);
    }catch{Alert.alert('No se pudo tomar la foto','Mantenga el teléfono quieto e inténtelo nuevamente.');}
    finally{setBusy(false);}
  }
  if(!permission)return <Screen><ActivityIndicator style={s.center} size="large" color={colors.green}/></Screen>;
  if(!permission.granted)return <Screen><StepHeader step="Cámara opcional" title="Permita usar la cámara" onBack={back}/><View style={s.permission}><Text style={s.permissionIcon}>📷</Text><Text style={s.body}>Puede escanear con una cámara, pero no es obligatorio. En una computadora sin cámara use el modo de medidas manuales.</Text><PrimaryButton label="Permitir cámara" onPress={()=>requestPermission().catch(()=>undefined)}/><SecondaryButton label="Continuar sin cámara" onPress={manual}/>{!permission.canAskAgain&&<Pressable onPress={()=>Linking.openSettings()}><Text style={s.link}>Abrir configuración</Text></Pressable>}</View></Screen>;
  return <View style={s.cameraPage}><CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture"/>
    <SafeAreaView style={s.cameraOverlay}><Pressable onPress={back} style={s.cameraBack}><Text style={s.cameraBackText}>‹ Salir</Text></Pressable>
      <View style={s.scanInstruction}><Text style={s.scanCount}>{photos.length+1} de 4</Text><Text style={s.scanTitle}>{photos.length===0?'Apunte al frente':'Gire lentamente a la derecha'}</Text><Text style={s.scanHint}>Mantenga el teléfono derecho y capture la pared completa.</Text></View>
      <View style={s.guide}><View style={s.guideCorner}/></View>
      <View style={s.captureArea}><View style={s.dots}>{REQUIRED_SCAN_ANGLES.map((angle,index)=><View key={angle} style={[s.dot,index<=photos.length&&s.dotActive]}/>)}</View><Pressable accessibilityLabel="Capturar pared" onPress={capture} style={s.shutter}>{busy?<ActivityIndicator color={colors.green}/>:<View style={s.shutterInner}/>}</Pressable><Text style={s.captureLabel}>Toque para capturar esta pared</Text></View>
    </SafeAreaView>
  </View>;
}

function Reconstruct({photos,done}:{photos:ScanPhoto[];done:(room:RoomModel)=>void}){
  useEffect(()=>{
    let active=true;
    const id=setTimeout(()=>reconstructWithBestProvider(photos).then(room=>{if(active)done(room);}).catch(error=>Alert.alert('Revise el escaneo',error.message)),1400);
    return()=>{active=false;clearTimeout(id);};
  },[photos,done]);
  return <Screen><View style={s.loading}><ActivityIndicator size="large" color={colors.green}/><Text style={s.loadingTitle}>Creando el modelo de su cocina…</Text><Text style={s.body}>Buscando paredes, puertas y ventanas.</Text></View></Screen>;
}

function Measure({label,value,change}:{label:string;value:number;change:(value:number)=>void}){
  return <View style={s.measure}><Text style={s.measureLabel}>{label}</Text><View style={s.measureControls}><Pressable accessibilityLabel={`Reducir ${label}`} onPress={()=>change(Math.max(1,Math.round((value-.1)*10)/10))} style={s.measureButton}><Text style={s.measureButtonText}>−</Text></Pressable><Text style={s.measureValue}>{value.toFixed(1)} m</Text><Pressable accessibilityLabel={`Aumentar ${label}`} onPress={()=>change(Math.min(20,Math.round((value+.1)*10)/10))} style={s.measureButton}><Text style={s.measureButtonText}>+</Text></Pressable></View></View>;
}

function RoomReview({room,back,next}:{room:RoomModel;back:()=>void;next:(room:RoomModel)=>void}){
  const[dimensions,setDimensions]=useState({widthM:room.widthM,lengthM:room.lengthM,heightM:room.heightM});
  const corrected=updateRoomDimensions(room,dimensions);
  return <Screen><StepHeader step="Paso 2 de 5" title="Revise su cocina" onBack={back}/><ScrollView contentContainerStyle={s.content}>
    <View style={s.floorPlan}><View style={s.planInner}><Text style={s.planLabel}>{dimensions.widthM.toFixed(1)} m</Text><View style={s.planWindow}/><Text style={s.planArea}>{roomArea(corrected)} m²</Text><Text style={s.planLength}>{dimensions.lengthM.toFixed(1)} m</Text></View></View>
    <View style={s.card}><Text style={s.cardTitle}>Confirme las medidas</Text><Measure label="Ancho" value={dimensions.widthM} change={widthM=>setDimensions({...dimensions,widthM})}/><Measure label="Largo" value={dimensions.lengthM} change={lengthM=>setDimensions({...dimensions,lengthM})}/><Measure label="Altura" value={dimensions.heightM} change={heightM=>setDimensions({...dimensions,heightM})}/><Text style={s.confidence}>✓ Escaneo completo · 4 paredes</Text></View>
    <Text style={s.note}>Mida una pared con cinta si desea mayor precisión. Confirme siempre antes de comprar materiales.</Text><PrimaryButton label="Las medidas están bien" onPress={()=>next(corrected)}/>
  </ScrollView></Screen>;
}

function Designs({items,back,choose}:{items:KitchenDesign[];back:()=>void;choose:(design:KitchenDesign)=>void}){
  return <Screen><StepHeader step="Paso 3 de 5" title="Elija su favorita" onBack={back}/><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={s.designList}>{items.map((item,index)=><View style={s.designCard} key={item.id}><Text style={s.option}>Opción {index+1}</Text><Preview design={item} large/><Text style={s.designName}>{item.name}</Text><Text style={s.body}>{item.description}</Text><View style={s.cardButton}><PrimaryButton label="Elegir este diseño" onPress={()=>choose(item)}/></View></View>)}</ScrollView></Screen>;
}

function Customize({design,back,change,next}:{design:KitchenDesign;back:()=>void;change:(design:KitchenDesign)=>void;next:()=>void}){
  const cabinets:[CabinetColor,string][]=[['cream','Crema'],['white','Blanco'],['navy','Azul'],['wood','Madera']];
  const counters:[Countertop,string][]=[['quartz','Cuarzo'],['granite','Granito'],['laminate','Laminado']];
  return <Screen><StepHeader step="Paso 4 de 5" title="Hágala suya" onBack={back}/><ScrollView contentContainerStyle={s.content}><Preview design={design}/>
    <Text style={s.sectionTitle}>Color de gabinetes</Text><View style={s.choiceGrid}>{cabinets.map(([value,label])=><Choice key={value} label={label} selected={design.cabinetColor===value} onPress={()=>change({...design,cabinetColor:value})}/>)}</View>
    <Text style={s.sectionTitle}>Cubierta</Text><View style={s.choiceGrid}>{counters.map(([value,label])=><Choice key={value} label={label} selected={design.countertop===value} onPress={()=>change({...design,countertop:value})}/>)}</View>
    <Choice label="Agregar isla" selected={design.includesIsland} onPress={()=>change({...design,includesIsland:!design.includesIsland})}/><PrimaryButton label="Abrir editor profesional" onPress={next}/>
  </ScrollView></Screen>;
}

function KitchenApp(){
  const[stage,setStage]=useState<Stage>('home');
  const[photos,setPhotos]=useState<ScanPhoto[]>([]);
  const[room,setRoom]=useState<RoomModel>();
  const[designs,setDesigns]=useState<KitchenDesign[]>([]);
  const[design,setDesign]=useState<KitchenDesign>();
  const[editorProject,setEditorProject]=useState<EditorProject>();
  const[saved,setSaved]=useState(false);

  useEffect(()=>{Promise.all([AsyncStorage.getItem(STORAGE_KEY),AsyncStorage.getItem(LEGACY_STORAGE_KEY)]).then(([current,legacy])=>setSaved(Boolean(current||legacy))).catch(()=>undefined);},[]);
  useEffect(()=>{if(editorProject)AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(editorProject)).then(()=>setSaved(true)).catch(()=>undefined);},[editorProject]);

  function openProject(project:EditorProject){
    setEditorProject(project);
    setRoom(project.room);
    setDesign(project.design);
    setStage('editor');
  }

  function openManual(input:ManualRoomInput){
    openProject(createBlankManualProject(input));
  }

  function openCleanDemo(){
    openProject(createLuisTenByElevenKitchen());
  }

  async function resume(){
    try{
      const raw=await AsyncStorage.getItem(STORAGE_KEY)??await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if(!raw)return;
      const project=migrateProject(JSON.parse(raw));
      if(!project)throw new Error('Invalid project');
      const next=/Luis|10 × 11|10x11/i.test(project.name)?createLuisTenByElevenKitchen():project;
      openProject(next);
    }catch{Alert.alert('No pudimos abrir el proyecto','Comience un nuevo escaneo.');}
  }

  function openEditor(){
    if(!room||!design)return;
    const project=createEditorProject(room,design);
    setEditorProject(project);setStage('editor');
  }

  function updateEditorProject(project:EditorProject){
    setEditorProject(project);
    setRoom(project.room);
    setDesign(project.design);
  }

  if(stage==='editor'&&editorProject)return <SafeAreaView style={s.editorSafe} edges={['top','bottom']}><EditorShell initialProject={editorProject} onProjectChange={updateEditorProject} onExit={()=>setStage('price')}/></SafeAreaView>;
  return <SafeAreaView style={s.safe} edges={stage==='scan'?[]:['top','bottom']}>
    {stage==='home'&&<Home saved={saved} scan={()=>{setEditorProject(undefined);setStage('scan');}} manual={()=>{setEditorProject(undefined);setStage('manual');}} demo={openCleanDemo} resume={resume}/>} 
    {stage==='manual'&&<ManualSetup back={()=>setStage('home')} create={openManual}/>} 
    {stage==='scan'&&<Scan back={()=>setStage('home')} manual={()=>setStage('manual')} done={captured=>{setPhotos(captured);setStage('reconstruct');}}/>}
    {stage==='reconstruct'&&<Reconstruct photos={photos} done={reconstructed=>{setRoom(reconstructed);setStage('room');}}/>}
    {stage==='room'&&room&&<RoomReview room={room} back={()=>setStage('scan')} next={corrected=>{setRoom(corrected);setDesigns(generateDesigns(corrected));setStage('designs');}}/>}
    {stage==='designs'&&<Designs items={designs} back={()=>setStage('room')} choose={chosen=>{setDesign(chosen);setStage('customize');}}/>}
    {stage==='customize'&&design&&<Customize design={design} back={()=>setStage('designs')} change={setDesign} next={openEditor}/>} 
    {stage==='price'&&room&&design&&<EditorPriceScreen room={room} design={design} project={editorProject} back={()=>setStage(editorProject?'editor':'customize')} home={()=>setStage('home')}/>} 
  </SafeAreaView>;
}

export default function App(){return <SafeAreaProvider><StatusBar style="dark"/><KitchenApp/></SafeAreaProvider>;}

const s=StyleSheet.create({
  editorSafe:{flex:1,backgroundColor:'#17211F'},safe:{flex:1,backgroundColor:colors.cream},center:{flex:1},home:{flexGrow:1,padding:26,paddingTop:40,justifyContent:'center',gap:20,maxWidth:1180,width:'100%',alignSelf:'center'},brand:{flexDirection:'row',alignItems:'center',gap:10},brandMark:{backgroundColor:colors.green,color:colors.white,fontSize:22,fontWeight:'900',width:42,height:42,borderRadius:13,textAlign:'center',textAlignVertical:'center'},brandText:{fontSize:22,fontWeight:'800',color:colors.ink},version:{fontSize:13,fontWeight:'700',color:colors.muted,marginTop:2},hero:{color:colors.ink,fontSize:40,lineHeight:46,fontWeight:'900'},lead:{color:colors.muted,fontSize:20,lineHeight:29},flow:{gap:10,backgroundColor:colors.white,borderRadius:20,padding:20},flowItem:{color:colors.ink,fontSize:18,fontWeight:'700'},homeActions:{flexDirection:'row',flexWrap:'wrap',gap:12},secondaryButton:{minHeight:54,flexGrow:1,minWidth:240,borderWidth:2,borderColor:colors.green,borderRadius:16,alignItems:'center',justifyContent:'center',paddingHorizontal:18,backgroundColor:colors.white},secondaryButtonText:{fontSize:17,fontWeight:'900',color:colors.green,textAlign:'center'},privacy:{color:colors.muted,fontSize:14,lineHeight:20,textAlign:'center'},resume:{minHeight:48,justifyContent:'center'},resumeText:{color:colors.green,textAlign:'center',fontWeight:'800',fontSize:17,textDecorationLine:'underline'},manualContent:{padding:24,paddingTop:6,gap:18,paddingBottom:44,maxWidth:900,width:'100%',alignSelf:'center'},manualNotice:{backgroundColor:'#E8F1EE',borderRadius:18,padding:18,gap:6},manualNoticeTitle:{fontSize:20,fontWeight:'900',color:colors.green},manualGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},manualField:{minWidth:180,flexGrow:1,position:'relative',gap:7},manualInput:{height:58,borderWidth:2,borderColor:colors.border,borderRadius:14,backgroundColor:colors.white,paddingHorizontal:16,paddingRight:48,fontSize:22,fontWeight:'900',color:colors.ink},manualSuffix:{position:'absolute',right:16,bottom:18,fontSize:16,fontWeight:'800',color:colors.muted},manualError:{color:'#A33A32',fontSize:15,fontWeight:'800'},
  permission:{flex:1,padding:26,justifyContent:'center',gap:24},permissionIcon:{fontSize:58,textAlign:'center'},body:{color:colors.muted,fontSize:17,lineHeight:25},link:{textAlign:'center',color:colors.green,fontSize:17,fontWeight:'800',padding:12},cameraPage:{flex:1,backgroundColor:'#111'},cameraOverlay:{flex:1,justifyContent:'space-between'},cameraBack:{alignSelf:'flex-start',margin:18,padding:10,backgroundColor:'#0009',borderRadius:20},cameraBackText:{color:colors.white,fontSize:18,fontWeight:'800'},scanInstruction:{marginHorizontal:22,backgroundColor:'#000A',borderRadius:18,padding:17},scanCount:{color:'#BDE6DA',fontWeight:'900',fontSize:15},scanTitle:{color:colors.white,fontSize:25,fontWeight:'900',marginTop:3},scanHint:{color:colors.white,fontSize:16,marginTop:5},guide:{flex:1,margin:42,borderWidth:3,borderColor:'#FFFFFFAA',borderRadius:20},guideCorner:{width:55,height:55,borderLeftWidth:6,borderTopWidth:6,borderColor:colors.gold,borderTopLeftRadius:18},captureArea:{alignItems:'center',paddingBottom:22,gap:8,backgroundColor:'#0007'},dots:{flexDirection:'row',gap:8,marginTop:10},dot:{width:10,height:10,borderRadius:5,backgroundColor:'#FFFFFF66'},dotActive:{backgroundColor:colors.gold},shutter:{width:70,height:70,borderRadius:35,backgroundColor:colors.white,alignItems:'center',justifyContent:'center'},shutterInner:{width:50,height:50,borderRadius:25,backgroundColor:colors.green},captureLabel:{color:colors.white,fontSize:15,fontWeight:'700'},
  loading:{flex:1,alignItems:'center',justifyContent:'center',padding:35,gap:20},loadingTitle:{fontSize:27,color:colors.ink,fontWeight:'900',textAlign:'center'},content:{padding:24,paddingTop:6,gap:20,paddingBottom:40},floorPlan:{height:230,backgroundColor:'#DDE9E4',padding:28,borderRadius:22},planInner:{flex:1,borderWidth:8,borderColor:colors.green,borderRightWidth:0,alignItems:'center',justifyContent:'center'},planLabel:{position:'absolute',top:-25,color:colors.green,fontWeight:'800'},planLength:{position:'absolute',left:-32,color:colors.green,fontWeight:'800',transform:[{rotate:'-90deg'}]},planArea:{fontSize:28,fontWeight:'900',color:colors.ink},planWindow:{position:'absolute',top:-8,width:60,height:8,backgroundColor:'#67A5BE'},card:{backgroundColor:colors.white,borderRadius:18,padding:20,gap:12},cardTitle:{color:colors.ink,fontSize:21,fontWeight:'900'},confidence:{color:colors.green,fontSize:16,fontWeight:'800',marginTop:7},note:{color:colors.muted,fontSize:14,lineHeight:20},measure:{gap:7,paddingVertical:4},measureLabel:{color:colors.ink,fontSize:17,fontWeight:'800'},measureControls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},measureButton:{width:50,height:50,borderRadius:15,backgroundColor:'#E8F1EE',alignItems:'center',justifyContent:'center'},measureButtonText:{color:colors.green,fontSize:30,fontWeight:'700'},measureValue:{color:colors.ink,fontSize:21,fontWeight:'900',minWidth:100,textAlign:'center'},
  designList:{paddingHorizontal:18,paddingBottom:30,gap:14},designCard:{width:350,maxWidth:'88%',backgroundColor:colors.white,padding:16,borderRadius:24,alignSelf:'stretch'},option:{color:colors.green,fontSize:15,fontWeight:'900',textTransform:'uppercase',marginBottom:10},designName:{color:colors.ink,fontSize:25,fontWeight:'900',marginTop:16,marginBottom:6},cardButton:{marginTop:'auto',paddingTop:15},preview:{height:210,borderRadius:20,overflow:'hidden',position:'relative'},previewLarge:{height:280},window:{position:'absolute',width:72,height:76,backgroundColor:'#B8D9E2',top:22,left:22,borderWidth:5,borderColor:'#F4EEE1'},windowLine:{left:31,width:4,height:'100%',backgroundColor:'#F4EEE1'},wallCabinet:{position:'absolute',width:74,height:68,right:16,top:23,borderWidth:1,borderColor:'#0002'},wallCabinet2:{right:94},counter:{position:'absolute',left:0,right:0,height:12,bottom:74},baseCabinet:{position:'absolute',width:104,height:72,bottom:0,right:16,borderWidth:1,borderColor:'#0002'},baseCabinet2:{right:122},island:{position:'absolute',width:155,height:48,left:30,bottom:14,borderTopWidth:10},sectionTitle:{color:colors.ink,fontSize:20,fontWeight:'900',marginTop:5},choiceGrid:{gap:10},
});
