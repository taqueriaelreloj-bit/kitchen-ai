import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  ApplianceCatalogItem,
  GAS_RANGE_CATALOG,
  GAS_RANGE_FINISHES,
  GasRangeFinishId,
  GasRangeModelId,
  REFRIGERATOR_CATALOG,
  RefrigeratorModelId,
  createCatalogGasRange,
  createCatalogRefrigerator,
  gasRangeFinishPatch,
  isGasRangeObject,
} from '../domain/applianceCatalog';
import {
  MICROWAVE_CATALOG,
  MicrowaveCatalogItem,
  MicrowaveModelId,
  createCatalogMicrowave,
} from '../domain/microwaveCatalog';
import { EditorObject, EditorProject, updateObject } from '../domain/editor';

type Apply = (project: EditorProject, record?: boolean) => void;
type CatalogItem = ApplianceCatalogItem | MicrowaveCatalogItem;
type ThumbnailProps = { item: CatalogItem };

function RangeThumbnail({ item }: ThumbnailProps) {
  if (item.category !== 'gas-range') return null;
  const griddle = item.hasCenterGriddle;
  const doubleOven = item.ovenDoorCount === 2;
  const burnerPositions: ViewStyle[] = griddle
    ? [{ left: '12%', top: '10%' }, { left: '12%', top: '40%' }, { left: '72%', top: '10%' }, { left: '72%', top: '40%' }]
    : [{ left: '20%', top: '10%' }, { left: '20%', top: '40%' }, { left: '65%', top: '10%' }, { left: '65%', top: '40%' }];
  return <View style={styles.rangeThumb}>
    <View style={styles.rangeTop}>
      {burnerPositions.map((position, index) => <View key={index} style={[styles.thumbBurner, position]}><View style={styles.thumbBurnerCore}/></View>)}
      {griddle && <View style={styles.thumbGriddle}><View style={styles.thumbGriddleHandle}/></View>}
    </View>
    <View style={styles.thumbControls}>{Array.from({ length: item.knobCount ?? 4 }, (_, index) => <View key={index} style={styles.thumbKnob}/>)}</View>
    <View style={styles.thumbOvenRow}>{Array.from({ length: doubleOven ? 2 : 1 }, (_, index) => <View key={index} style={styles.thumbOven}><View style={styles.thumbHandle}/><View style={styles.thumbGlass}/></View>)}</View>
  </View>;
}

function RefrigeratorThumbnail({ item }: ThumbnailProps) {
  const dark = item.id === 'refrigerator-smart-black';
  return <View style={[styles.fridgeThumb, { backgroundColor: item.color }]}>
    <View style={styles.fridgeDoorRow}><View style={[styles.fridgeDoor, dark && styles.darkGlass]}/><View style={[styles.fridgeDoor, dark && styles.darkGlass]}/></View>
    <View style={styles.fridgeCenterLine}/>
    <View style={[styles.fridgeDrawer, dark && styles.darkGlass]}/>
    <View style={styles.fridgeHandleLeft}/><View style={styles.fridgeHandleRight}/>
  </View>;
}

function MicrowaveThumbnail({ item }: { item: MicrowaveCatalogItem }) {
  const overRange = item.installation === 'over-the-range';
  return <View style={[styles.microwaveThumb, { backgroundColor: item.color }]}>
    {overRange && <View style={styles.microwaveTopVent}>{Array.from({ length: 7 }, (_, index) => <View key={index} style={styles.microwaveVentSlat}/>)}</View>}
    <View style={styles.microwaveFront}>
      <View style={styles.microwaveDoor}><View style={styles.microwaveMesh}/></View>
      <View style={styles.microwaveHandle}/>
      <View style={styles.microwavePanel}><View style={styles.microwaveDisplay}/>{Array.from({ length: 9 }, (_, index) => <View key={index} style={styles.microwaveKey}/>)}</View>
    </View>
    {overRange
      ? <View style={styles.microwaveUnderside}><View style={styles.microwaveFilter}/><View style={styles.microwaveLight}/><View style={styles.microwaveFilter}/></View>
      : <View style={styles.microwaveFeet}><View style={styles.microwaveFoot}/><View style={styles.microwaveFoot}/></View>}
  </View>;
}

function CatalogThumbnail({ item }: ThumbnailProps) {
  if (item.category === 'gas-range') return <RangeThumbnail item={item}/>;
  if (item.category === 'microwave') return <MicrowaveThumbnail item={item}/>;
  return <RefrigeratorThumbnail item={item}/>;
}

function CatalogCard({ item, onPress }: { item: CatalogItem; onPress: () => void }) {
  const details = item.category === 'gas-range'
    ? `${item.widthIn}\" · Gas · ${item.burnerCount} burners${item.hasCenterGriddle ? ' · Griddle' : ''}`
    : item.category === 'microwave'
      ? `${item.widthIn}\" × ${item.heightIn}\" · ${item.hasExtractor ? 'Extractor integrated' : 'Countertop'}`
      : `${item.widthIn}\" × ${item.heightIn}\" · ${item.style}`;
  const finishLabel = item.category === 'gas-range' || item.category === 'microwave'
    ? 'Stainless Steel default'
    : item.finish;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Add ${item.name}`}
    accessibilityHint="Adds this appliance to the kitchen plan"
    onPress={onPress}
    style={({ pressed }: { pressed: boolean }) => [styles.card, pressed && styles.cardPressed]}
  >
    <View style={styles.thumbnailStage}><CatalogThumbnail item={item}/></View>
    <Text numberOfLines={2} style={styles.cardTitle}>{item.shortName}</Text>
    <Text numberOfLines={2} style={styles.cardMeta}>{details}</Text>
    <View style={styles.defaultFinishRow}><View style={[styles.defaultFinishDot, { backgroundColor: item.color }]}/><Text style={styles.defaultFinishText}>{finishLabel}</Text></View>
  </Pressable>;
}

export function ApplianceCatalogPanel({ project, apply }: { project: EditorProject; apply: Apply }) {
  const place = (object: EditorObject) => {
    const offset = project.objects.length * 7;
    const placed = { ...object, x: 145 + offset, y: 112 + offset };
    apply({ ...project, objects: [...project.objects, placed], selectedId: placed.id, updatedAt: new Date().toISOString() });
  };
  const addRange = (id: GasRangeModelId) => place(createCatalogGasRange(id));
  const addRefrigerator = (id: RefrigeratorModelId) => place(createCatalogRefrigerator(id));
  const addMicrowave = (id: MicrowaveModelId) => place(createCatalogMicrowave(id));
  return <ScrollView contentContainerStyle={styles.panel}>
    <View style={styles.headingRow}><View><Text style={styles.heading}>Appliances</Text><Text style={styles.subheading}>Drag-ready catalog objects with real dimensions</Text></View><View style={styles.liveBadge}><Text style={styles.liveBadgeText}>2D + 3D</Text></View></View>
    <Text style={styles.category}>Gas Ranges / Estufas de gas</Text>
    <View style={styles.grid}>{GAS_RANGE_CATALOG.map(item => <CatalogCard key={item.id} item={item} onPress={() => addRange(item.id as GasRangeModelId)}/>)}</View>
    <Text style={styles.category}>Microwaves / Microondas</Text>
    <View style={styles.grid}>{MICROWAVE_CATALOG.map(item => <CatalogCard key={item.id} item={item} onPress={() => addMicrowave(item.id)}/>)}</View>
    <Text style={styles.category}>Refrigerators</Text>
    <View style={styles.grid}>{REFRIGERATOR_CATALOG.map(item => <CatalogCard key={item.id} item={item} onPress={() => addRefrigerator(item.id as RefrigeratorModelId)}/>)}</View>
  </ScrollView>;
}

export function GasRangeFinishPanel({ project, selected, apply }: { project: EditorProject; selected?: EditorObject; apply: (project: EditorProject) => void }) {
  if (!isGasRangeObject(selected)) return null;
  const active = (selected.finishId ?? 'stainless-steel') as GasRangeFinishId;
  const choose = (finishId: GasRangeFinishId) => apply(updateObject(project, selected.id, gasRangeFinishPatch(finishId)));
  return <View style={styles.finishPanel}>
    <View style={styles.finishHeadingRow}><View><Text style={styles.finishTitle}>Range Finish</Text><Text style={styles.finishHelp}>Body panels change; glass, grates, burners and trim stay authentic.</Text></View><Text style={styles.lockBadge}>LOCKED SIZE</Text></View>
    <View style={styles.finishGrid}>{GAS_RANGE_FINISHES.map(finish => {
      const selectedFinish = active === finish.id;
      return <Pressable
        key={finish.id}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedFinish }}
        accessibilityLabel={`${finish.name}${selectedFinish ? ', selected' : ''}`}
        onPress={() => choose(finish.id)}
        style={[styles.finishChoice, selectedFinish && styles.finishChoiceSelected]}
      >
        <View style={[styles.finishSwatch, { backgroundColor: finish.color }]}>{selectedFinish && <Text style={styles.check}>✓</Text>}</View>
        <Text numberOfLines={2} style={styles.finishName}>{finish.name}</Text>
      </Pressable>;
    })}</View>
    <Text style={styles.specLine}>{selected.widthIn}\" W × {selected.depthIn}\" D × {selected.heightIn}\" H · {selected.burnerCount ?? 4} burners · {selected.hasCenterGriddle ? 'Center griddle · 5 controls' : '4 controls'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  panel: { paddingBottom: 18, gap: 10 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  heading: { fontSize: 17, fontWeight: '900', color: '#1D2A27' },
  subheading: { fontSize: 11, color: '#64736E', marginTop: 2 },
  liveBadge: { borderRadius: 999, backgroundColor: '#DDEEE8', paddingHorizontal: 8, paddingVertical: 5 },
  liveBadgeText: { fontSize: 9, fontWeight: '900', color: '#155543' },
  category: { marginTop: 8, fontSize: 12, fontWeight: '900', color: '#27463D', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', minHeight: 174, borderRadius: 12, borderWidth: 1, borderColor: '#C6D1CD', backgroundColor: '#FFFFFF', padding: 8 },
  cardPressed: { borderColor: '#39806B', backgroundColor: '#EEF7F4' },
  thumbnailStage: { height: 88, borderRadius: 8, backgroundColor: '#EEF1F0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardTitle: { minHeight: 30, marginTop: 6, fontSize: 11, lineHeight: 14, fontWeight: '900', color: '#23332E' },
  cardMeta: { minHeight: 26, fontSize: 9, lineHeight: 12, color: '#64736E' },
  defaultFinishRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  defaultFinishDot: { width: 11, height: 11, borderRadius: 3, borderWidth: 1, borderColor: '#82908B' },
  defaultFinishText: { flex: 1, fontSize: 8, fontWeight: '800', color: '#50605B' },
  rangeThumb: { width: '82%', height: '82%', borderRadius: 4, backgroundColor: '#ADB4B6', borderWidth: 1, borderColor: '#697274', overflow: 'hidden' },
  rangeTop: { height: '30%', margin: 3, borderRadius: 2, backgroundColor: '#2B2F30', overflow: 'hidden' },
  thumbBurner: { position: 'absolute', width: 13, height: 13, borderRadius: 99, borderWidth: 2, borderColor: '#111415', backgroundColor: '#555B5C', alignItems: 'center', justifyContent: 'center' },
  thumbBurnerCore: { width: 5, height: 5, borderRadius: 99, backgroundColor: '#B08B48' },
  thumbGriddle: { position: 'absolute', left: '38%', top: '6%', width: '24%', height: '82%', borderRadius: 2, backgroundColor: '#484D4E', borderWidth: 1, borderColor: '#151819' },
  thumbGriddleHandle: { position: 'absolute', left: '18%', right: '18%', bottom: 1, height: 2, backgroundColor: '#D7DBDC' },
  thumbControls: { height: '16%', marginHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  thumbKnob: { width: 6, height: 6, borderRadius: 99, backgroundColor: '#E5E7E7', borderWidth: 1, borderColor: '#5F6668' },
  thumbOvenRow: { flex: 1, flexDirection: 'row', gap: 2, marginHorizontal: 4, marginBottom: 4 },
  thumbOven: { flex: 1, borderRadius: 2, backgroundColor: '#C1C6C7', padding: 3 },
  thumbHandle: { height: 2, borderRadius: 2, backgroundColor: '#686F71', marginBottom: 3 },
  thumbGlass: { flex: 1, borderRadius: 2, backgroundColor: '#202526', borderWidth: 1, borderColor: '#6E7576' },
  fridgeThumb: { width: '48%', height: '84%', borderRadius: 7, borderWidth: 1, borderColor: '#6E7778', padding: 3, overflow: 'hidden' },
  fridgeDoorRow: { flex: 1, flexDirection: 'row', gap: 1 },
  fridgeDoor: { flex: 1, backgroundColor: '#D6DBDC66', borderWidth: 1, borderColor: '#788082' },
  darkGlass: { backgroundColor: '#111516' },
  fridgeCenterLine: { height: 2, backgroundColor: '#4A5152', marginVertical: 2 },
  fridgeDrawer: { height: '24%', borderWidth: 1, borderColor: '#788082', backgroundColor: '#D6DBDC66' },
  fridgeHandleLeft: { position: 'absolute', top: '20%', left: '41%', width: 2, height: '38%', backgroundColor: '#5C6466' },
  fridgeHandleRight: { position: 'absolute', top: '20%', right: '41%', width: 2, height: '38%', backgroundColor: '#5C6466' },
  microwaveThumb: { width: '82%', minHeight: '62%', borderRadius: 5, borderWidth: 1, borderColor: '#697274', padding: 4, justifyContent: 'center' },
  microwaveTopVent: { height: 7, backgroundColor: '#181C1D', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 2 },
  microwaveVentSlat: { width: 5, height: 2, backgroundColor: '#737B7D' },
  microwaveFront: { height: 50, flexDirection: 'row', position: 'relative' },
  microwaveDoor: { flex: 1, backgroundColor: '#111416', borderWidth: 2, borderColor: '#343A3C', padding: 6 },
  microwaveMesh: { flex: 1, backgroundColor: '#3A4143', opacity: .78 },
  microwaveHandle: { position: 'absolute', right: 20, top: 5, width: 4, height: 40, borderRadius: 3, backgroundColor: '#D7DCDE', zIndex: 2 },
  microwavePanel: { width: 18, backgroundColor: '#101415', padding: 2, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 1 },
  microwaveDisplay: { width: 14, height: 5, backgroundColor: '#8ED7E8', marginBottom: 2 },
  microwaveKey: { width: 3, height: 3, borderRadius: 1, backgroundColor: '#737B7D' },
  microwaveUnderside: { height: 8, backgroundColor: '#282E2F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  microwaveFilter: { width: '37%', height: 4, backgroundColor: '#596264' },
  microwaveLight: { width: 10, height: 4, backgroundColor: '#F7E7B0' },
  microwaveFeet: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  microwaveFoot: { width: 9, height: 3, backgroundColor: '#303638' },
  finishPanel: { marginTop: 8, marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: '#BFCBC7', backgroundColor: '#F7FAF9', padding: 10 },
  finishHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  finishTitle: { fontSize: 13, fontWeight: '900', color: '#1D2A27', textTransform: 'uppercase' },
  finishHelp: { maxWidth: 210, fontSize: 10, lineHeight: 14, color: '#61706B', marginTop: 2 },
  lockBadge: { fontSize: 8, fontWeight: '900', color: '#225E4C', backgroundColor: '#DDEEE8', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  finishGrid: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  finishChoice: { width: '30%', minHeight: 64, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', padding: 3, alignItems: 'center' },
  finishChoiceSelected: { borderColor: '#315F55', backgroundColor: '#E4F0EC' },
  finishSwatch: { width: '100%', height: 35, borderRadius: 6, borderWidth: 1, borderColor: '#AEB8B4', alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', textShadowColor: '#17211F', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  finishName: { marginTop: 3, fontSize: 8, fontWeight: '800', textAlign: 'center', color: '#33423D' },
  specLine: { marginTop: 7, fontSize: 10, lineHeight: 14, fontWeight: '800', color: '#41514C' },
});
