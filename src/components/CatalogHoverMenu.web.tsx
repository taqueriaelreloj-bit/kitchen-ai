import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DRAG_CATALOG_CATEGORIES,
  DragCatalogCategoryId,
  DragCatalogItem,
  KITCHEN_CATALOG_DRAG_MIME,
  addDragCatalogItemNearCenter,
  serializeDragCatalogItem,
} from '../domain/dragCatalog';
import { EditorProject } from '../domain/editor';

const AnyView = View as any;
const AnyPressable = Pressable as any;
type Apply = (project: EditorProject, record?: boolean) => void;

type Props = {
  project: EditorProject;
  apply: Apply;
  preview: (project: EditorProject) => void;
};

function CabinetPreview({ item }: { item: DragCatalogItem }) {
  const drawers = item.objectKind === 'drawer-base';
  const glass = item.objectKind === 'glass-upper';
  const corner = item.objectKind === 'corner-cabinet';
  const tall = item.categoryId === 'tall';
  const doors = item.widthIn >= 27 ? 2 : 1;
  return <View style={[styles.cabinetPreview, tall && styles.tallPreview, corner && styles.cornerPreview, { backgroundColor: item.previewColor }]}>
    {drawers
      ? <>{[0, 1, 2].map(index => <View key={index} style={styles.drawerFace}/>)}</>
      : <View style={styles.doorRow}>{Array.from({ length: doors }, (_, index) => <View key={index} style={[styles.cabinetDoor, glass && styles.glassDoor]}><View style={styles.doorInset}/></View>)}</View>}
    <View style={styles.cabinetToe}/>
  </View>;
}

function RefrigeratorPreview({ item }: { item: DragCatalogItem }) {
  const dark = item.id === 'refrigerator-smart-black';
  const retro = item.id === 'refrigerator-retro-blue';
  if (retro) return <View style={[styles.retroPreview, { backgroundColor: item.previewColor }]}><View style={styles.retroFreezer}/><View style={styles.retroSeparator}/><View style={styles.retroDoor}/><View style={styles.retroHandleTop}/><View style={styles.retroHandleBottom}/></View>;
  return <View style={[styles.fridgePreview, { backgroundColor: item.previewColor }]}>
    <View style={styles.fridgeDoorRow}><View style={[styles.fridgeDoor, dark && styles.darkDoor]}/><View style={[styles.fridgeDoor, dark && styles.darkDoor]}/></View>
    <View style={styles.fridgeDivider}/><View style={[styles.fridgeDrawer, dark && styles.darkDoor]}/>
    <View style={styles.fridgeHandleLeft}/><View style={styles.fridgeHandleRight}/>
  </View>;
}

function RangePreview({ item }: { item: DragCatalogItem }) {
  const griddle = item.id.includes('griddle');
  return <View style={[styles.rangePreview, { backgroundColor: item.previewColor }]}>
    <View style={styles.rangeCooktop}>{[0, 1, 2, 3].map(index => <View key={index} style={[styles.rangeBurner, index % 2 ? styles.burnerRight : styles.burnerLeft, index > 1 && styles.burnerBottom]}/>) }{griddle && <View style={styles.rangeGriddle}/>}</View>
    <View style={styles.rangeControls}>{Array.from({ length: griddle ? 5 : 4 }, (_, index) => <View key={index} style={styles.rangeKnob}/>)}</View>
    <View style={styles.rangeOven}><View style={styles.rangeHandle}/><View style={styles.rangeGlass}/></View>
  </View>;
}

function ItemPreview({ item }: { item: DragCatalogItem }) {
  if (item.kind === 'cabinet') return <CabinetPreview item={item}/>;
  if (item.categoryId === 'refrigerators') return <RefrigeratorPreview item={item}/>;
  return <RangePreview item={item}/>;
}

export function CatalogHoverMenu({ project, apply, preview }: Props) {
  const [activeCategory, setActiveCategory] = useState<DragCatalogCategoryId>();
  const [draggingId, setDraggingId] = useState<string>();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragging = useRef(false);
  const suppressClick = useRef(false);

  const open = (categoryId: DragCatalogCategoryId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveCategory(categoryId);
  };
  const scheduleClose = () => {
    if (dragging.current) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveCategory(undefined), 180);
  };
  const clickItem = (item: DragCatalogItem) => {
    if (suppressClick.current) return;
    apply(addDragCatalogItemNearCenter(project, item.id));
    setActiveCategory(undefined);
  };
  const beginDrag = (event: any, item: DragCatalogItem) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const serialized = serializeDragCatalogItem(item.id);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(KITCHEN_CATALOG_DRAG_MIME, serialized);
    event.dataTransfer.setData('text/plain', serialized);
    dragging.current = true;
    suppressClick.current = true;
    setDraggingId(item.id);
    if (project.viewMode !== '2d') preview({ ...project, viewMode: '2d' });
  };
  const endDrag = () => {
    dragging.current = false;
    setDraggingId(undefined);
    setActiveCategory(undefined);
    setTimeout(() => { suppressClick.current = false; }, 0);
  };

  return <View style={styles.layer}>
    <View style={styles.bar}>
      <View style={styles.intro}><Text style={styles.introTitle}>Product Catalog</Text><Text style={styles.introHelp}>Hover a category · drag an item into the plan</Text></View>
      <AnyView style={styles.categories}>
        {DRAG_CATALOG_CATEGORIES.map((category, index) => {
          const active = activeCategory === category.id;
          const alignRight = index >= DRAG_CATALOG_CATEGORIES.length - 2;
          return <AnyView
            key={category.id}
            style={styles.categoryWrap}
            onMouseEnter={() => open(category.id)}
            onMouseLeave={scheduleClose}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: active }}
              accessibilityLabel={`${category.label} catalog, ${category.items.length} items`}
              onPress={() => active ? setActiveCategory(undefined) : open(category.id)}
              style={[styles.categoryButton, active && styles.categoryButtonActive]}
            >
              <Text style={[styles.categoryIcon, active && styles.categoryTextActive]}>{category.icon}</Text>
              <View style={styles.categoryCopy}><Text style={[styles.categoryLabel, active && styles.categoryTextActive]}>{category.label}</Text><Text style={[styles.categoryCount, active && styles.categoryCountActive]}>{category.items.length} available</Text></View>
              <Text style={[styles.chevron, active && styles.categoryTextActive]}>⌄</Text>
            </Pressable>
            {active && <View style={[styles.flyout, alignRight && styles.flyoutRight]}>
              <View style={styles.flyoutHeader}><View><Text style={styles.flyoutTitle}>{category.label}</Text><Text style={styles.flyoutHelp}>{category.helper}</Text></View><View style={styles.dragBadge}><Text style={styles.dragBadgeText}>DRAG TO PLACE</Text></View></View>
              <ScrollView style={styles.flyoutScroll} contentContainerStyle={styles.itemGrid} showsVerticalScrollIndicator>
                {category.items.map(item => <AnyPressable
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  aria-label={`${item.name}. Drag into the plan or click to add.`}
                  onDragStart={(event: any) => beginDrag(event, item)}
                  onDragEnd={endDrag}
                  onClick={() => clickItem(item)}
                  onKeyDown={(event: any) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clickItem(item); } }}
                  style={[styles.itemCard, draggingId === item.id && styles.itemDragging]}
                >
                  <View style={styles.previewStage}><ItemPreview item={item}/></View>
                  <Text numberOfLines={2} style={styles.itemName}>{item.shortName}</Text>
                  <Text numberOfLines={2} style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemDimensions}>{item.widthIn}\" W × {item.depthIn}\" D × {item.heightIn}\" H</Text>
                  <View style={styles.itemAction}><Text style={styles.itemActionText}>⠿ Drag</Text><Text style={styles.clickAction}>Click adds center</Text></View>
                </AnyPressable>)}
              </ScrollView>
            </View>}
          </AnyView>;
        })}
      </AnyView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  layer: { position: 'relative', zIndex: 80, overflow: 'visible' },
  bar: { minHeight: 52, backgroundColor: '#24332F', borderTopWidth: 1, borderTopColor: '#3A4D47', borderBottomWidth: 1, borderBottomColor: '#14201D', flexDirection: 'row', alignItems: 'stretch', overflow: 'visible' },
  intro: { width: 190, paddingHorizontal: 12, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#3A4D47' },
  introTitle: { fontSize: 12, fontWeight: '900', color: '#F5F8F7', textTransform: 'uppercase' },
  introHelp: { fontSize: 9, lineHeight: 12, color: '#B8C6C2', marginTop: 2 },
  categories: { flex: 1, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 5, overflow: 'visible' },
  categoryWrap: { position: 'relative', flex: 1, minWidth: 110, maxWidth: 190, justifyContent: 'center', overflow: 'visible' },
  categoryButton: { width: '100%', minHeight: 50, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 1, borderLeftColor: '#344640' },
  categoryButtonActive: { backgroundColor: '#DDEEE8', borderLeftColor: '#6CA18F' },
  categoryIcon: { width: 22, textAlign: 'center', fontSize: 21, color: '#D6E2DE' },
  categoryCopy: { flex: 1, minWidth: 0 },
  categoryLabel: { fontSize: 11, fontWeight: '900', color: '#F1F6F4' },
  categoryCount: { fontSize: 8, fontWeight: '700', color: '#9FB0AA', marginTop: 1 },
  categoryCountActive: { color: '#4F6F65' },
  categoryTextActive: { color: '#154D3D' },
  chevron: { marginLeft: 'auto', fontSize: 13, color: '#B9C7C3' },
  flyout: { position: 'absolute', top: 50, left: 0, width: 612, maxHeight: 430, zIndex: 120, borderRadius: 12, borderWidth: 1, borderColor: '#AFC0BA', backgroundColor: '#F7FAF9', shadowColor: '#000000', shadowOpacity: .25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 20, overflow: 'hidden' },
  flyoutRight: { left: undefined, right: 0 },
  flyoutHeader: { minHeight: 58, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#E8F0ED', borderBottomWidth: 1, borderBottomColor: '#C5D2CD', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flyoutTitle: { fontSize: 16, fontWeight: '900', color: '#1C2E28' },
  flyoutHelp: { fontSize: 10, color: '#5D6D67', marginTop: 2 },
  dragBadge: { borderRadius: 999, backgroundColor: '#315F55', paddingHorizontal: 9, paddingVertical: 5 },
  dragBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  flyoutScroll: { maxHeight: 370 },
  itemGrid: { padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemCard: { width: 190, minHeight: 215, borderRadius: 10, borderWidth: 1, borderColor: '#C2CECA', backgroundColor: '#FFFFFF', padding: 8, cursor: 'grab' } as any,
  itemDragging: { opacity: .55, borderColor: '#147356', backgroundColor: '#E6F3EF' },
  previewStage: { height: 96, borderRadius: 8, backgroundColor: '#E9EEEC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemName: { minHeight: 30, marginTop: 6, fontSize: 11, lineHeight: 14, fontWeight: '900', color: '#23342E' },
  itemDescription: { minHeight: 26, fontSize: 9, lineHeight: 12, color: '#61716B' },
  itemDimensions: { marginTop: 4, fontSize: 9, fontWeight: '900', color: '#315F55' },
  itemAction: { marginTop: 7, borderTopWidth: 1, borderTopColor: '#E0E7E4', paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemActionText: { fontSize: 9, fontWeight: '900', color: '#155B46' },
  clickAction: { fontSize: 8, color: '#75847F' },
  cabinetPreview: { width: '56%', height: '72%', borderRadius: 4, borderWidth: 1, borderColor: '#7B857F', padding: 4, justifyContent: 'space-between' },
  tallPreview: { width: '35%', height: '86%' },
  cornerPreview: { width: '62%', transform: [{ skewX: '-10deg' }] },
  doorRow: { flex: 1, flexDirection: 'row', gap: 3 },
  cabinetDoor: { flex: 1, borderWidth: 1, borderColor: '#8A938E', padding: 3 },
  glassDoor: { backgroundColor: '#9FC3CF' },
  doorInset: { flex: 1, borderWidth: 1, borderColor: '#FFFFFF88' },
  drawerFace: { height: '27%', borderWidth: 1, borderColor: '#858E89', backgroundColor: '#F4F1E9AA' },
  cabinetToe: { height: 5, marginTop: 3, backgroundColor: '#4B5350' },
  fridgePreview: { width: '36%', height: '86%', borderRadius: 6, borderWidth: 1, borderColor: '#687274', padding: 3 },
  fridgeDoorRow: { flex: 1, flexDirection: 'row', gap: 2 },
  fridgeDoor: { flex: 1, borderWidth: 1, borderColor: '#788183', backgroundColor: '#D9DDDE66' },
  darkDoor: { backgroundColor: '#101415' },
  fridgeDivider: { height: 2, backgroundColor: '#4A5152', marginVertical: 2 },
  fridgeDrawer: { height: '24%', borderWidth: 1, borderColor: '#788183', backgroundColor: '#D9DDDE66' },
  fridgeHandleLeft: { position: 'absolute', top: '18%', left: '41%', width: 2, height: '42%', backgroundColor: '#5F6769' },
  fridgeHandleRight: { position: 'absolute', top: '18%', right: '41%', width: 2, height: '42%', backgroundColor: '#5F6769' },
  retroPreview: { width: '34%', height: '82%', borderRadius: 12, borderWidth: 1, borderColor: '#687274', padding: 4 },
  retroFreezer: { height: '28%', borderWidth: 1, borderColor: '#6D858E' },
  retroSeparator: { height: 3, backgroundColor: '#E1E4E5', marginVertical: 3 },
  retroDoor: { flex: 1, borderWidth: 1, borderColor: '#6D858E' },
  retroHandleTop: { position: 'absolute', left: 8, top: 20, width: 16, height: 3, backgroundColor: '#E1E4E5' },
  retroHandleBottom: { position: 'absolute', left: 8, top: 48, width: 16, height: 3, backgroundColor: '#E1E4E5' },
  rangePreview: { width: '55%', height: '78%', borderRadius: 4, borderWidth: 1, borderColor: '#687274', padding: 4 },
  rangeCooktop: { height: '30%', borderRadius: 2, backgroundColor: '#272B2C', position: 'relative' },
  rangeBurner: { position: 'absolute', width: 12, height: 12, borderRadius: 99, borderWidth: 2, borderColor: '#0F1112', backgroundColor: '#53595A', top: 3 },
  burnerLeft: { left: 12 },
  burnerRight: { right: 12 },
  burnerBottom: { top: 23 },
  rangeGriddle: { position: 'absolute', left: '40%', width: '20%', top: 3, bottom: 3, backgroundColor: '#515657', borderWidth: 1, borderColor: '#0F1112' },
  rangeControls: { height: '18%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  rangeKnob: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#E6E8E8', borderWidth: 1, borderColor: '#5F6668' },
  rangeOven: { flex: 1, borderRadius: 2, backgroundColor: '#C2C7C8', padding: 4 },
  rangeHandle: { height: 3, backgroundColor: '#656C6E', marginBottom: 4 },
  rangeGlass: { flex: 1, backgroundColor: '#202526', borderWidth: 1, borderColor: '#707778' },
});
