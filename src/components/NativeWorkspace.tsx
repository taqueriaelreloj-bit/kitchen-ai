import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorProject, Vec2, View2DState } from '../domain/editor';
import { pan2DView, pinch2DView } from '../domain/touchNavigation';

type Props = { project: EditorProject; apply: (project: EditorProject, record?: boolean) => void };
type GestureState = { mode: 'none'|'pan'|'pinch'; startView: View2DState; startDistance: number; startMidpoint: Vec2 };

const touchPoint = (touch: any): Vec2 => ({
  x: Number.isFinite(touch.locationX) ? touch.locationX : touch.pageX,
  y: Number.isFinite(touch.locationY) ? touch.locationY : touch.pageY,
});
const midpoint = (touches: any[]): Vec2 => {
  const a = touchPoint(touches[0]);
  const b = touchPoint(touches[1]);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};
const distance = (touches: any[]) => {
  const a = touchPoint(touches[0]);
  const b = touchPoint(touches[1]);
  return Math.hypot(b.x - a.x, b.y - a.y);
};
const verticalGrid = Array.from({ length: 76 }, (_, index) => index * 12);
const horizontalGrid = Array.from({ length: 56 }, (_, index) => index * 12);

export function NativeWorkspace({ project, apply }: Props) {
  const [view, setView] = useState<View2DState>(project.view2d);
  const viewRef = useRef<View2DState>(project.view2d);
  const objectTouch = useRef(false);
  const gesture = useRef<GestureState>({ mode: 'none', startView: project.view2d, startDistance: 1, startMidpoint: { x: 0, y: 0 } });

  useEffect(() => {
    viewRef.current = project.view2d;
    setView(project.view2d);
  }, [project.view2d]);

  const setLocal = (next: View2DState) => {
    viewRef.current = next;
    setView(next);
  };
  const beginPinch = (touches: any[]) => {
    gesture.current = {
      mode: 'pinch',
      startView: viewRef.current,
      startDistance: Math.max(1, distance(touches)),
      startMidpoint: midpoint(touches),
    };
  };
  const commit = () => {
    if (gesture.current.mode !== 'none') apply({ ...project, view2d: viewRef.current }, false);
    gesture.current = { ...gesture.current, mode: 'none' };
    objectTouch.current = false;
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (event, state) => event.nativeEvent.touches.length >= 2 || (!objectTouch.current && Math.abs(state.dx) + Math.abs(state.dy) > 5),
    onMoveShouldSetPanResponder: (event, state) => event.nativeEvent.touches.length >= 2 || (!objectTouch.current && Math.abs(state.dx) + Math.abs(state.dy) > 5),
    onPanResponderGrant: event => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) beginPinch(touches);
      else gesture.current = { mode: 'pan', startView: viewRef.current, startDistance: 1, startMidpoint: { x: 0, y: 0 } };
    },
    onPanResponderMove: (event, state) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        if (gesture.current.mode !== 'pinch') beginPinch(touches);
        setLocal(pinch2DView(gesture.current.startView, gesture.current.startDistance, gesture.current.startMidpoint, distance(touches), midpoint(touches)));
        return;
      }
      if (gesture.current.mode === 'pinch') return;
      if (gesture.current.mode !== 'pan') gesture.current = { mode: 'pan', startView: viewRef.current, startDistance: 1, startMidpoint: { x: 0, y: 0 } };
      setLocal(pan2DView(gesture.current.startView, state.dx, state.dy));
    },
    onPanResponderRelease: commit,
    onPanResponderTerminate: commit,
    onPanResponderTerminationRequest: () => true,
  }), [project, apply]);

  if (project.viewMode === '3d') return <View style={s.workspace}>
    <View style={s.native3d}>
      <Text style={s.native3dTitle}>3D Project Preview</Text>
      <Text style={s.help}>The complete AI layout, lighting, materials, appliances and hardware remain in the shared project. Desktop web uses the full WebGL renderer.</Text>
      <View style={s.previewFloor}>{project.objects.filter(object => object.kind !== 'wall').slice(0, 24).map((object, index) => <View key={object.id} style={[s.previewBlock, { width: Math.max(24, Math.min(90, object.widthIn)), height: Math.max(18, Math.min(65, object.heightIn * .55)), backgroundColor: object.color ?? '#D5D2CA', marginLeft: (index % 3) * 8 }]}><Text numberOfLines={1} style={s.previewLabel}>{object.name}</Text></View>)}</View>
    </View>
  </View>;

  const planTransform = { transformOrigin: [0, 0, 0], transform: [{ translateX: view.pan.x }, { translateY: view.pan.y }, { scale: view.zoom }] } as any;
  return <Pressable accessibilityLabel="Touch 2D kitchen workspace" accessibilityHint="Pinch with two fingers to zoom or drag empty space to pan" onPress={() => apply({ ...project, selectedId: undefined }, false)} style={s.workspace} {...panResponder.panHandlers}>
    <View style={[s.plan, planTransform]}>
      {view.grid && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {verticalGrid.map(left => <View key={`v-${left}`} style={[s.gridVertical, { left }]} />)}
        {horizontalGrid.map(top => <View key={`h-${top}`} style={[s.gridHorizontal, { top }]} />)}
      </View>}
      {project.objects.map(object => <Pressable
        key={object.id}
        accessibilityRole="button"
        accessibilityLabel={`${object.name}, ${Math.round(object.widthIn)} by ${Math.round(object.depthIn)} inches`}
        onPressIn={() => { objectTouch.current = true; }}
        onPressOut={() => { objectTouch.current = false; }}
        onPress={event => { event.stopPropagation(); apply({ ...project, selectedId: object.id }, false); }}
        style={[s.object, { left: object.x, top: object.y, width: Math.max(18, object.widthIn * .38), height: object.kind === 'wall' ? Math.max(5, object.depthIn * .38) : Math.max(12, object.depthIn * .38), backgroundColor: object.color ?? '#C8CFCC', transform: [{ rotate: `${object.rotation}deg` }] }, project.selectedId === object.id && s.selected]}
      >
        <Text numberOfLines={1} style={s.objectLabel}>{object.name}</Text>
        {view.measurements && <Text numberOfLines={1} style={s.dimensionLabel}>{Math.round(object.widthIn)}″ × {Math.round(object.depthIn)}″</Text>}
      </Pressable>)}
    </View>
    <View pointerEvents="none" style={s.touchHint}><Text style={s.touchHintText}>Pinch Zoom · Empty-space Pan · {Math.round(view.zoom * 100)}% · {view.snap ? 'Snap On' : 'Snap Off'}</Text></View>
  </Pressable>;
}

const s = StyleSheet.create({
  workspace: { flex: 1, overflow: 'hidden', backgroundColor: '#E2E7E5' },
  plan: { position: 'absolute', left: 0, top: 0, width: 900, height: 650 },
  gridVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#87958F24' },
  gridHorizontal: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#87958F24' },
  object: { position: 'absolute', minWidth: 18, minHeight: 12, borderWidth: 1, borderColor: '#596762', borderRadius: 3, justifyContent: 'center', paddingHorizontal: 2 },
  objectLabel: { fontSize: 9, fontWeight: '800', color: '#23312D' },
  dimensionLabel: { fontSize: 7, fontWeight: '700', color: '#485852', marginTop: 1 },
  selected: { borderWidth: 3, borderColor: '#0B785A' },
  touchHint: { position: 'absolute', left: 10, bottom: 10, backgroundColor: '#17211FCC', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  touchHintText: { fontSize: 10, color: '#E6EFEC', fontWeight: '800' },
  help: { fontSize: 13, lineHeight: 19, color: '#5C6B66' },
  native3d: { flex: 1, padding: 18, backgroundColor: '#DCE3E0' },
  native3dTitle: { fontSize: 22, fontWeight: '900', color: '#23312D', marginBottom: 6 },
  previewFloor: { flex: 1, marginTop: 16, borderWidth: 1, borderColor: '#9DAAA6', backgroundColor: '#CAD1CE', padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-end' },
  previewBlock: { borderWidth: 1, borderColor: '#5C6B66', margin: 4, justifyContent: 'center', padding: 3 },
  previewLabel: { fontSize: 8, fontWeight: '700' },
});
