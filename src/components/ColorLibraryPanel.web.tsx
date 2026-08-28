import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CABINET_FINISHES, WALL_PAINTS } from '../domain/catalogs';
import {
  applyCabinetFinish,
  applyCustomCabinetColor,
  applyCustomWallColor,
  applyWallPaint,
  CabinetScope,
  EditorObject,
  EditorProject,
  saveCustomColor,
  toggleCabinetFinishFavorite,
  toggleCompareWallPaint,
  toggleWallPaintFavorite,
} from '../domain/editor';

function Action({ label, onPress, active = false, disabled = false }: { label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ selected: active, disabled }} onPress={onPress} style={[s.action, active && s.actionActive, disabled && s.disabled]}><Text style={s.actionText}>{label}</Text></Pressable>;
}

function ColorTile({ color, name, favorite, compared, selected, onApply, onFavorite, onCompare }: { color: string; name: string; favorite?: boolean; compared?: boolean; selected?: boolean; onApply: () => void; onFavorite?: () => void; onCompare?: () => void }) {
  return <View style={[s.tile, selected && s.tileSelected]}><Pressable accessibilityRole="button" onPress={onApply} style={s.tileApply}><View style={[s.color, { backgroundColor: color }]} /><Text numberOfLines={2} style={s.name}>{name}</Text></Pressable><View style={s.tileActions}>{onFavorite && <Pressable accessibilityLabel={favorite ? 'Remove favorite' : 'Add favorite'} onPress={onFavorite} style={s.iconButton}><Text style={s.icon}>{favorite ? '★' : '☆'}</Text></Pressable>}{onCompare && <Pressable accessibilityLabel="Compare color" onPress={onCompare} style={[s.compareButton, compared && s.compareActive]}><Text style={s.compareText}>Compare</Text></Pressable>}</View></View>;
}

function ScopePicker({ value, change }: { value: CabinetScope; change: (value: CabinetScope) => void }) {
  return <View style={s.row}>{(['selected', 'base', 'wall', 'island', 'all'] as CabinetScope[]).map(item => <Action key={item} label={item} active={value === item} onPress={() => change(item)} />)}</View>;
}

export function ColorLibraryPanel({ project, selected, apply }: { project: EditorProject; selected?: EditorObject; apply: (project: EditorProject) => void }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<CabinetScope>('selected');
  const [wallCategory, setWallCategory] = useState('All');
  const [cabinetCategory, setCabinetCategory] = useState('All');
  const [customHex, setCustomHex] = useState('#D9C7B8');
  const [customName, setCustomName] = useState('Custom Color');
  const q = query.trim().toLowerCase();
  const state = project.catalogState;
  const wallCategories = useMemo(() => ['All', ...Array.from(new Set(WALL_PAINTS.map(item => item.category)))], []);
  const cabinetCategories = ['All', 'Painted', 'Wood'];
  const wallPaints = useMemo(() => WALL_PAINTS.filter(item => (!q || item.displayName.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)) && (wallCategory === 'All' || item.category === wallCategory)), [q, wallCategory]);
  const cabinetFinishes = useMemo(() => CABINET_FINISHES.filter(item => (!q || item.displayName.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.finishType.toLowerCase().includes(q)) && (cabinetCategory === 'All' || item.category === cabinetCategory.toLowerCase())), [q, cabinetCategory]);
  const favoriteWalls = WALL_PAINTS.filter(item => state.favoriteWallPaintIds.includes(item.id));
  const recentWalls = state.recentWallPaintIds.map(id => WALL_PAINTS.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const favoriteCabinets = CABINET_FINISHES.filter(item => state.favoriteCabinetFinishIds.includes(item.id));
  const recentCabinets = state.recentCabinetFinishIds.map(id => CABINET_FINISHES.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const compared = state.compareWallPaintIds.map(id => WALL_PAINTS.find(item => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const wallCustom = state.customColors.filter(item => item.target === 'wall');
  const cabinetCustom = state.customColors.filter(item => item.target === 'cabinet');

  const addAndApplyCustom = (target: 'wall' | 'cabinet') => {
    let next = saveCustomColor(project, customHex, target, customName.trim() || 'Custom Color');
    const id = next.catalogState.customColors.find(item => item.target === target && item.hex.toUpperCase() === (customHex.startsWith('#') ? customHex : `#${customHex}`).toUpperCase())?.id;
    if (!id) { apply(next); return; }
    next = target === 'wall' ? applyCustomWallColor(next, id, false) : applyCustomCabinetColor(next, id, scope);
    apply(next);
  };

  return <ScrollView contentContainerStyle={s.panel} keyboardShouldPersistTaps="handled">
    <TextInput value={query} onChangeText={setQuery} placeholder="Search colors or categories" style={s.input} />

    <View style={s.section}><Text style={s.title}>Custom Color Picker</Text><View style={s.customRow}><input aria-label="Custom color picker" type="color" value={/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : '#D9C7B8'} onChange={event => setCustomHex(event.currentTarget.value.toUpperCase())} style={{ width: 54, height: 44, border: 0, padding: 0, background: 'transparent' }} /><TextInput value={customHex} autoCapitalize="characters" onChangeText={setCustomHex} maxLength={7} style={[s.input, s.hexInput]} /><TextInput value={customName} onChangeText={setCustomName} placeholder="Color name" style={[s.input, s.nameInput]} /></View><View style={s.row}><Action label="Apply to Selected Wall" disabled={selected?.kind !== 'wall'} onPress={() => addAndApplyCustom('wall')} /><Action label={`Apply to ${scope} Cabinets`} onPress={() => addAndApplyCustom('cabinet')} /></View><ScopePicker value={scope} change={setScope} /><Text style={s.note}>Digital color is an approximate visual preview and is not a guaranteed physical paint match.</Text></View>

    {(favoriteWalls.length > 0 || favoriteCabinets.length > 0) && <View style={s.section}><Text style={s.title}>Favorites</Text>{favoriteWalls.length > 0 && <><Text style={s.subtitle}>Wall Paint</Text><View style={s.grid}>{favoriteWalls.map(item => <ColorTile key={item.id} color={item.approximateHex} name={item.displayName} favorite onApply={() => selected?.kind === 'wall' && apply(applyWallPaint(project, item.id, false))} onFavorite={() => apply(toggleWallPaintFavorite(project, item.id))} onCompare={() => apply(toggleCompareWallPaint(project, item.id))} compared={state.compareWallPaintIds.includes(item.id)} />)}</View></>}{favoriteCabinets.length > 0 && <><Text style={s.subtitle}>Cabinet Finishes</Text><View style={s.grid}>{favoriteCabinets.map(item => <ColorTile key={item.id} color={item.baseColor} name={item.displayName} favorite onApply={() => apply(applyCabinetFinish(project, item.id, scope))} onFavorite={() => apply(toggleCabinetFinishFavorite(project, item.id))} />)}</View></>}</View>}

    {(recentWalls.length > 0 || recentCabinets.length > 0) && <View style={s.section}><Text style={s.title}>Recent Colors</Text>{recentWalls.length > 0 && <View style={s.grid}>{recentWalls.map(item => <ColorTile key={item.id} color={item.approximateHex} name={item.displayName} favorite={state.favoriteWallPaintIds.includes(item.id)} onApply={() => selected?.kind === 'wall' && apply(applyWallPaint(project, item.id, false))} onFavorite={() => apply(toggleWallPaintFavorite(project, item.id))} onCompare={() => apply(toggleCompareWallPaint(project, item.id))} compared={state.compareWallPaintIds.includes(item.id)} />)}</View>}{recentCabinets.length > 0 && <View style={s.grid}>{recentCabinets.map(item => <ColorTile key={item.id} color={item.baseColor} name={item.displayName} favorite={state.favoriteCabinetFinishIds.includes(item.id)} onApply={() => apply(applyCabinetFinish(project, item.id, scope))} onFavorite={() => apply(toggleCabinetFinishFavorite(project, item.id))} />)}</View>}</View>}

    {compared.length > 0 && <View style={s.section}><Text style={s.title}>Compare Wall Paint</Text><View style={s.compareGrid}>{compared.map(item => <Pressable key={item.id} onPress={() => selected?.kind === 'wall' && apply(applyWallPaint(project, item.id, false))} style={[s.compareCard, { backgroundColor: item.approximateHex }]}><Text style={s.compareName}>{item.displayName}</Text><Text style={s.compareCode}>{item.approximateHex} · digital approximation</Text></Pressable>)}</View><Action label="Clear Comparison" onPress={() => { let next = project; for (const id of [...next.catalogState.compareWallPaintIds]) next = toggleCompareWallPaint(next, id); apply(next); }} /></View>}

    {wallCustom.length > 0 && <View style={s.section}><Text style={s.title}>Custom Wall Colors</Text><View style={s.grid}>{wallCustom.map(item => <ColorTile key={item.id} color={item.hex} name={item.name} onApply={() => selected?.kind === 'wall' && apply(applyCustomWallColor(project, item.id, false))} />)}</View></View>}
    {cabinetCustom.length > 0 && <View style={s.section}><Text style={s.title}>Custom Cabinet Colors</Text><View style={s.grid}>{cabinetCustom.map(item => <ColorTile key={item.id} color={item.hex} name={item.name} onApply={() => apply(applyCustomCabinetColor(project, item.id, scope))} />)}</View></View>}

    <View style={s.section}><Text style={s.title}>Wall Paint</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>{wallCategories.map(category => <Action key={category} label={category} active={wallCategory === category} onPress={() => setWallCategory(category)} />)}</ScrollView><View style={s.row}><Action label="Apply Current to All Walls" disabled={selected?.kind !== 'wall'} onPress={() => selected?.wallPaintId && apply(applyWallPaint(project, selected.wallPaintId, true))} /></View><View style={s.grid}>{wallPaints.map(item => <ColorTile key={item.id} color={item.approximateHex} name={item.displayName} selected={selected?.wallPaintId === item.id} favorite={state.favoriteWallPaintIds.includes(item.id)} compared={state.compareWallPaintIds.includes(item.id)} onApply={() => selected?.kind === 'wall' && apply(applyWallPaint(project, item.id, false))} onFavorite={() => apply(toggleWallPaintFavorite(project, item.id))} onCompare={() => apply(toggleCompareWallPaint(project, item.id))} />)}</View></View>

    <View style={s.section}><Text style={s.title}>Cabinet Colors & Finishes</Text><ScopePicker value={scope} change={setScope} /><View style={s.row}>{cabinetCategories.map(category => <Action key={category} label={category} active={cabinetCategory === category} onPress={() => setCabinetCategory(category)} />)}</View><View style={s.grid}>{cabinetFinishes.map(item => <ColorTile key={item.id} color={item.baseColor} name={`${item.displayName} · ${item.finishType}`} selected={selected?.finishId === item.id} favorite={state.favoriteCabinetFinishIds.includes(item.id)} onApply={() => apply(applyCabinetFinish(project, item.id, scope))} onFavorite={() => apply(toggleCabinetFinishFavorite(project, item.id))} />)}</View></View>
  </ScrollView>;
}

const s = StyleSheet.create({
  panel:{paddingBottom:24},input:{minHeight:42,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:10,backgroundColor:'#fff',marginBottom:8},section:{gap:8,marginBottom:18},title:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},subtitle:{fontSize:12,fontWeight:'800',color:'#50605A'},row:{flexDirection:'row',flexWrap:'wrap',gap:4},filterRow:{gap:4,paddingRight:8},action:{minHeight:38,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#fff',paddingHorizontal:9,alignItems:'center',justifyContent:'center',marginBottom:4},actionActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},actionText:{fontSize:11,fontWeight:'800',color:'#263530'},disabled:{opacity:.35},customRow:{flexDirection:'row',alignItems:'center',gap:7},hexInput:{width:94,marginBottom:0},nameInput:{flex:1,marginBottom:0},note:{fontSize:11,lineHeight:16,color:'#66756F'},grid:{flexDirection:'row',flexWrap:'wrap',gap:5},tile:{width:'31.5%',minHeight:102,borderWidth:2,borderColor:'transparent',borderRadius:9,backgroundColor:'#fff',padding:4},tileSelected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},tileApply:{flex:1},color:{height:43,borderRadius:6,borderWidth:1,borderColor:'#C9D0CD'},name:{fontSize:9,fontWeight:'700',color:'#2B3935',marginTop:4},tileActions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:3},iconButton:{minWidth:27,minHeight:25,alignItems:'center',justifyContent:'center'},icon:{fontSize:17,color:'#8A6A24'},compareButton:{minHeight:24,paddingHorizontal:5,borderWidth:1,borderColor:'#BCC7C3',borderRadius:5,justifyContent:'center'},compareActive:{backgroundColor:'#DDEEE8',borderColor:'#315F55'},compareText:{fontSize:8,fontWeight:'800',color:'#33423D'},compareGrid:{flexDirection:'row',gap:8},compareCard:{flex:1,minHeight:115,borderRadius:10,padding:10,justifyContent:'flex-end',borderWidth:1,borderColor:'#8B9692'},compareName:{fontSize:13,fontWeight:'900',color:'#17211F',backgroundColor:'#FFFFFFB8',padding:3,borderRadius:4},compareCode:{fontSize:9,fontWeight:'700',color:'#17211F',backgroundColor:'#FFFFFFB8',padding:3,marginTop:3,borderRadius:4},
});
