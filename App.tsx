import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Choice, colors, PrimaryButton, Screen, StepHeader } from './src/components/UI';
import { generateDesigns } from './src/domain/design';
import { estimatePrice } from './src/domain/pricing';
import { REQUIRED_SCAN_ANGLES, roomArea, updateRoomDimensions } from './src/domain/room';
import { CabinetColor, Countertop, KitchenDesign, RoomModel, ScanPhoto } from './src/domain/types';
import { reconstructWithBestProvider } from './src/services/reconstruction';

type Stage = 'home' | 'scan' | 'reconstruct' | 'room' | 'designs' | 'customize' | 'price';
const STORAGE_KEY = 'kitchen-ai-project-v1';

function Preview({ design, large = false }: { design: KitchenDesign; large?: boolean }) {
  const cabinet = { cream: '#E9DFC9', white: '#F9F9F6', navy: '#334B62', wood: '#A66D43' }[design.cabinetColor];
  const counter = { quartz: '#F3F0E8', granite: '#777974', laminate: '#C7B28F' }[design.countertop];
  return <View style={[s.preview, large && s.previewLarge, { backgroundColor: design.accent }]}>
    <View style={s.window}><View style={s.windowLine} /></View>
    <View style={[s.wallCabinet, { backgroundColor: cabinet }]} /><View style={[s.wallCabinet, s.wallCabinet2, { backgroundColor: cabinet }]} />
    <View style={[s.counter, { backgroundColor: counter }]} /><View style={[s.baseCabinet, { backgroundColor: cabinet }]} /><View style={[s.baseCabinet, s.baseCabinet2, { backgroundColor: cabinet }]} />
    {design.includesIsland && <View style={[s.island, { backgroundColor: cabinet, borderTopColor: counter }]} />}
  </View>;
}

function Home({ saved, start, resume }: { saved: boolean; start: () => void; resume: () => void }) {
  return <Screen><ScrollView contentContainerStyle={s.home}>
    <View style={s.brand}><Text style={s.brandMark}>K</Text><Text style={s.brandText}>Kitchen AI</Text></View>
    <Text style={s.hero}>Vea su nueva cocina antes de remodelarla.</Text>
    <Text style={s.lead}>Solo mueva el teléfono alrededor del cuarto. Nosotros hacemos el resto.</Text>
    <View style={s.flow}>{['1  Escanee su cocina', '2  Elija un diseño', '3  Vea el precio'].map(x => <Text key={x} style={s.flowItem}>{x}</Text>)}</View>
    <PrimaryButton label="Escanear mi cocina" onPress={start} />
    {saved && <Pressable onPress={resume} style={s.resume}><Text style={s.resumeText}>Continuar mi proyecto guardado</Text></Pressable>}
    <Text style={s.privacy}>🔒 Sus fotos permanecen privadas en este dispositivo durante el MVP.</Text>
  </ScrollView></Screen>;
}

function Scan({ done, back }: { done: (p: ScanPhoto[]) => void; back: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);
  async function capture() {
    const angle = REQUIRED_SCAN_ANGLES[photos.length];
    if (!camera.current || busy || angle === undefined) return;
    setBusy(true);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.55, skipProcessing: true });
      if (!shot?.uri) throw new Error();
      const next = [...photos, { uri: shot.uri, angle, capturedAt: new Date().toISOString() }];
      setPhotos(next); if (next.length === 4) done(next);
    } catch { Alert.alert('No se pudo tomar la foto', 'Mantenga el teléfono quieto e inténtelo nuevamente.'); }
    finally { setBusy(false); }
  }
  if (!permission) return <Screen><ActivityIndicator style={s.center} size="large" color={colors.green} /></Screen>;
  if (!permission.granted) return <Screen><StepHeader step="Paso 1 de 5" title="Permita usar la cámara" onBack={back} /><View style={s.permission}><Text style={s.permissionIcon}>📷</Text><Text style={s.body}>La cámara es necesaria para ver las paredes y la forma de su cocina. No grabamos audio.</Text><PrimaryButton label="Permitir cámara" onPress={requestPermission} />{!permission.canAskAgain && <Pressable onPress={() => Linking.openSettings()}><Text style={s.link}>Abrir configuración</Text></Pressable>}</View></Screen>;
  return <View style={s.cameraPage}><CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" />
    <SafeAreaView style={s.cameraOverlay}><Pressable onPress={back} style={s.cameraBack}><Text style={s.cameraBackText}>‹ Salir</Text></Pressable>
      <View style={s.scanInstruction}><Text style={s.scanCount}>{photos.length + 1} de 4</Text><Text style={s.scanTitle}>{photos.length === 0 ? 'Apunte al frente' : 'Gire lentamente a la derecha'}</Text><Text style={s.scanHint}>Mantenga el teléfono derecho y capture la pared completa.</Text></View>
      <View style={s.guide}><View style={s.guideCorner} /></View>
      <View style={s.captureArea}><View style={s.dots}>{REQUIRED_SCAN_ANGLES.map((a, i) => <View key={a} style={[s.dot, i <= photos.length && s.dotActive]} />)}</View><Pressable accessibilityLabel="Capturar pared" onPress={capture} style={s.shutter}>{busy ? <ActivityIndicator color={colors.green} /> : <View style={s.shutterInner} />}</Pressable><Text style={s.captureLabel}>Toque para capturar esta pared</Text></View>
    </SafeAreaView></View>;
}

function Reconstruct({ photos, done }: { photos: ScanPhoto[]; done: (r: RoomModel) => void }) {
  useEffect(() => { let active = true; const id = setTimeout(() => reconstructWithBestProvider(photos).then(room => { if (active) done(room); }).catch(error => Alert.alert('Revise el escaneo', error.message)), 1400); return () => { active = false; clearTimeout(id); }; }, [photos, done]);
  return <Screen><View style={s.loading}><ActivityIndicator size="large" color={colors.green} /><Text style={s.loadingTitle}>Creando el modelo de su cocina…</Text><Text style={s.body}>Buscando paredes, puertas y ventanas.</Text></View></Screen>;
}

function Measure({ label, value, change }: { label: string; value: number; change: (value: number) => void }) {
  return <View style={s.measure}><Text style={s.measureLabel}>{label}</Text><View style={s.measureControls}><Pressable accessibilityLabel={`Reducir ${label}`} onPress={() => change(Math.max(1, Math.round((value - 0.1) * 10) / 10))} style={s.measureButton}><Text style={s.measureButtonText}>−</Text></Pressable><Text style={s.measureValue}>{value.toFixed(1)} m</Text><Pressable accessibilityLabel={`Aumentar ${label}`} onPress={() => change(Math.min(20, Math.round((value + 0.1) * 10) / 10))} style={s.measureButton}><Text style={s.measureButtonText}>+</Text></Pressable></View></View>;
}

function RoomReview({ room, back, next }: { room: RoomModel; back: () => void; next: (room: RoomModel) => void }) {
  const [dimensions, setDimensions] = useState({ widthM: room.widthM, lengthM: room.lengthM, heightM: room.heightM });
  const corrected = updateRoomDimensions(room, dimensions);
  return <Screen><StepHeader step="Paso 2 de 5" title="Revise su cocina" onBack={back} /><ScrollView contentContainerStyle={s.content}>
    <View style={s.floorPlan}><View style={s.planInner}><Text style={s.planLabel}>{dimensions.widthM.toFixed(1)} m</Text><View style={s.planWindow} /><Text style={s.planArea}>{roomArea(corrected)} m²</Text><Text style={s.planLength}>{dimensions.lengthM.toFixed(1)} m</Text></View></View>
    <View style={s.card}><Text style={s.cardTitle}>Confirme las medidas</Text><Measure label="Ancho" value={dimensions.widthM} change={widthM => setDimensions({ ...dimensions, widthM })} /><Measure label="Largo" value={dimensions.lengthM} change={lengthM => setDimensions({ ...dimensions, lengthM })} /><Measure label="Altura" value={dimensions.heightM} change={heightM => setDimensions({ ...dimensions, heightM })} /><Text style={s.confidence}>✓ Escaneo completo · 4 paredes</Text></View>
    <Text style={s.note}>Mida una pared con cinta si desea mayor precisión. Confirme siempre antes de comprar materiales.</Text><PrimaryButton label="Las medidas están bien" onPress={() => next(corrected)} />
  </ScrollView></Screen>;
}

function Designs({ items, back, choose }: { items: KitchenDesign[]; back: () => void; choose: (d: KitchenDesign) => void }) {
  return <Screen><StepHeader step="Paso 3 de 5" title="Elija su favorita" onBack={back} /><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={s.designList}>{items.map((d, i) => <View style={s.designCard} key={d.id}><Text style={s.option}>Opción {i + 1}</Text><Preview design={d} large /><Text style={s.designName}>{d.name}</Text><Text style={s.body}>{d.description}</Text><View style={s.cardButton}><PrimaryButton label="Elegir este diseño" onPress={() => choose(d)} /></View></View>)}</ScrollView></Screen>;
}

function Customize({ design, back, change, next }: { design: KitchenDesign; back: () => void; change: (d: KitchenDesign) => void; next: () => void }) {
  const cabinets: [CabinetColor, string][] = [['cream', 'Crema'], ['white', 'Blanco'], ['navy', 'Azul'], ['wood', 'Madera']];
  const counters: [Countertop, string][] = [['quartz', 'Cuarzo'], ['granite', 'Granito'], ['laminate', 'Laminado']];
  return <Screen><StepHeader step="Paso 4 de 5" title="Hágala suya" onBack={back} /><ScrollView contentContainerStyle={s.content}><Preview design={design} />
    <Text style={s.sectionTitle}>Color de gabinetes</Text><View style={s.choiceGrid}>{cabinets.map(([v, l]) => <Choice key={v} label={l} selected={design.cabinetColor === v} onPress={() => change({ ...design, cabinetColor: v })} />)}</View>
    <Text style={s.sectionTitle}>Cubierta</Text><View style={s.choiceGrid}>{counters.map(([v, l]) => <Choice key={v} label={l} selected={design.countertop === v} onPress={() => change({ ...design, countertop: v })} />)}</View>
    <Choice label="Agregar isla" selected={design.includesIsland} onPress={() => change({ ...design, includesIsland: !design.includesIsland })} /><PrimaryButton label="Ver mi precio" onPress={next} />
  </ScrollView></Screen>;
}

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
function Price({ room, design, back, home }: { room: RoomModel; design: KitchenDesign; back: () => void; home: () => void }) {
  const price = estimatePrice(room, design);
  return <Screen><StepHeader step="Paso 5 de 5" title="Precio estimado" onBack={back} /><ScrollView contentContainerStyle={s.content}><Preview design={design} />
    <View style={s.priceCard}><Text style={s.priceRange}>{money(price.low)} – {money(price.high)}</Text><Text style={s.priceCaption}>Estimado para su cocina</Text>{[['Gabinetes', price.cabinets], ['Cubiertas', price.countertops], ['Accesorios', price.fixtures], ['Instalación', price.installation]].map(([label, value]) => <View style={s.priceRow} key={String(label)}><Text style={s.rowText}>{label}</Text><Text style={s.priceValue}>{money(Number(value))}</Text></View>)}</View>
    <Text style={s.note}>Estimación inicial, no es una cotización. No incluye electrodomésticos, permisos ni impuestos.</Text><PrimaryButton label="Guardar y terminar" onPress={home} />
  </ScrollView></Screen>;
}

function KitchenApp() {
  const [stage, setStage] = useState<Stage>('home'); const [photos, setPhotos] = useState<ScanPhoto[]>([]); const [room, setRoom] = useState<RoomModel>(); const [designs, setDesigns] = useState<KitchenDesign[]>([]); const [design, setDesign] = useState<KitchenDesign>(); const [saved, setSaved] = useState(false);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(x => setSaved(Boolean(x))).catch(() => undefined); }, []);
  useEffect(() => { if (room && design) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ room, design })).then(() => setSaved(true)).catch(() => undefined); }, [room, design]);
  async function resume() { try { const raw = await AsyncStorage.getItem(STORAGE_KEY); if (!raw) return; const project = JSON.parse(raw); setRoom(project.room); setDesign(project.design); setStage('price'); } catch { Alert.alert('No pudimos abrir el proyecto', 'Comience un nuevo escaneo.'); } }
  return <SafeAreaView style={s.safe} edges={stage === 'scan' ? [] : ['top', 'bottom']}>
    {stage === 'home' && <Home saved={saved} start={() => setStage('scan')} resume={resume} />}
    {stage === 'scan' && <Scan back={() => setStage('home')} done={p => { setPhotos(p); setStage('reconstruct'); }} />}
    {stage === 'reconstruct' && <Reconstruct photos={photos} done={r => { setRoom(r); setStage('room'); }} />}
    {stage === 'room' && room && <RoomReview room={room} back={() => setStage('scan')} next={corrected => { setRoom(corrected); setDesigns(generateDesigns(corrected)); setStage('designs'); }} />}
    {stage === 'designs' && <Designs items={designs} back={() => setStage('room')} choose={d => { setDesign(d); setStage('customize'); }} />}
    {stage === 'customize' && design && <Customize design={design} back={() => setStage('designs')} change={setDesign} next={() => setStage('price')} />}
    {stage === 'price' && room && design && <Price room={room} design={design} back={() => setStage('customize')} home={() => setStage('home')} />}
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><StatusBar style="dark" /><KitchenApp /></SafeAreaProvider>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream }, center: { flex: 1 }, home: { flexGrow: 1, padding: 26, paddingTop: 40, justifyContent: 'center', gap: 22 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandMark: { backgroundColor: colors.green, color: colors.white, fontSize: 22, fontWeight: '900', width: 42, height: 42, borderRadius: 13, textAlign: 'center', textAlignVertical: 'center' }, brandText: { fontSize: 22, fontWeight: '800', color: colors.ink }, hero: { color: colors.ink, fontSize: 40, lineHeight: 46, fontWeight: '900' }, lead: { color: colors.muted, fontSize: 20, lineHeight: 29 }, flow: { gap: 10, backgroundColor: colors.white, borderRadius: 20, padding: 20 }, flowItem: { color: colors.ink, fontSize: 18, fontWeight: '700' }, privacy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' }, resume: { minHeight: 48, justifyContent: 'center' }, resumeText: { color: colors.green, textAlign: 'center', fontWeight: '800', fontSize: 17, textDecorationLine: 'underline' },
  permission: { flex: 1, padding: 26, justifyContent: 'center', gap: 24 }, permissionIcon: { fontSize: 58, textAlign: 'center' }, body: { color: colors.muted, fontSize: 17, lineHeight: 25 }, link: { textAlign: 'center', color: colors.green, fontSize: 17, fontWeight: '800', padding: 12 }, cameraPage: { flex: 1, backgroundColor: '#111' }, cameraOverlay: { flex: 1, justifyContent: 'space-between' }, cameraBack: { alignSelf: 'flex-start', margin: 18, padding: 10, backgroundColor: '#0009', borderRadius: 20 }, cameraBackText: { color: colors.white, fontSize: 18, fontWeight: '800' }, scanInstruction: { marginHorizontal: 22, backgroundColor: '#000A', borderRadius: 18, padding: 17 }, scanCount: { color: '#BDE6DA', fontWeight: '900', fontSize: 15 }, scanTitle: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 3 }, scanHint: { color: colors.white, fontSize: 16, marginTop: 5 }, guide: { flex: 1, margin: 42, borderWidth: 3, borderColor: '#FFFFFFAA', borderRadius: 20 }, guideCorner: { width: 55, height: 55, borderLeftWidth: 6, borderTopWidth: 6, borderColor: colors.gold, borderTopLeftRadius: 18 }, captureArea: { alignItems: 'center', paddingBottom: 22, gap: 8, backgroundColor: '#0007' }, dots: { flexDirection: 'row', gap: 8, marginTop: 10 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF66' }, dotActive: { backgroundColor: colors.gold }, shutter: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.green }, captureLabel: { color: colors.white, fontSize: 15, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35, gap: 20 }, loadingTitle: { fontSize: 27, color: colors.ink, fontWeight: '900', textAlign: 'center' }, content: { padding: 24, paddingTop: 6, gap: 20, paddingBottom: 40 }, floorPlan: { height: 230, backgroundColor: '#DDE9E4', padding: 28, borderRadius: 22 }, planInner: { flex: 1, borderWidth: 8, borderColor: colors.green, borderRightWidth: 0, alignItems: 'center', justifyContent: 'center' }, planLabel: { position: 'absolute', top: -25, color: colors.green, fontWeight: '800' }, planLength: { position: 'absolute', left: -32, color: colors.green, fontWeight: '800', transform: [{ rotate: '-90deg' }] }, planArea: { fontSize: 28, fontWeight: '900', color: colors.ink }, planWindow: { position: 'absolute', top: -8, width: 60, height: 8, backgroundColor: '#67A5BE' }, card: { backgroundColor: colors.white, borderRadius: 18, padding: 20, gap: 12 }, cardTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' }, rowText: { color: colors.ink, fontSize: 16 }, confidence: { color: colors.green, fontSize: 16, fontWeight: '800', marginTop: 7 }, note: { color: colors.muted, fontSize: 14, lineHeight: 20 }, measure: { gap: 7, paddingVertical: 4 }, measureLabel: { color: colors.ink, fontSize: 17, fontWeight: '800' }, measureControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, measureButton: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#E8F1EE', alignItems: 'center', justifyContent: 'center' }, measureButtonText: { color: colors.green, fontSize: 30, fontWeight: '700' }, measureValue: { color: colors.ink, fontSize: 21, fontWeight: '900', minWidth: 100, textAlign: 'center' },
  designList: { paddingHorizontal: 18, paddingBottom: 30, gap: 14 }, designCard: { width: 350, maxWidth: '88%', backgroundColor: colors.white, padding: 16, borderRadius: 24, alignSelf: 'stretch' }, option: { color: colors.green, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10 }, designName: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 16, marginBottom: 6 }, cardButton: { marginTop: 'auto', paddingTop: 15 }, preview: { height: 210, borderRadius: 20, overflow: 'hidden', position: 'relative' }, previewLarge: { height: 280 }, window: { position: 'absolute', width: 72, height: 76, backgroundColor: '#B8D9E2', top: 22, left: 22, borderWidth: 5, borderColor: '#F4EEE1' }, windowLine: { left: 31, width: 4, height: '100%', backgroundColor: '#F4EEE1' }, wallCabinet: { position: 'absolute', width: 74, height: 68, right: 16, top: 23, borderWidth: 1, borderColor: '#0002' }, wallCabinet2: { right: 94 }, counter: { position: 'absolute', left: 0, right: 0, height: 12, bottom: 74 }, baseCabinet: { position: 'absolute', width: 104, height: 72, bottom: 0, right: 16, borderWidth: 1, borderColor: '#0002' }, baseCabinet2: { right: 122 }, island: { position: 'absolute', width: 155, height: 48, left: 30, bottom: 14, borderTopWidth: 10 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 5 }, choiceGrid: { gap: 10 }, priceCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20 }, priceRange: { color: colors.ink, fontSize: 27, fontWeight: '900', textAlign: 'center' }, priceCaption: { color: colors.muted, textAlign: 'center', fontSize: 15, marginBottom: 18 }, priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border }, priceValue: { color: colors.ink, fontSize: 16, fontWeight: '800' },
});
