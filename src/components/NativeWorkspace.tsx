import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { EditorObject, EditorProject, Vec2, View2DState } from '../domain/editor';
import { createObjectDragOrigin, moveObjectByPlanDelta, ObjectDragOrigin } from '../domain/objectMovement';
import { pan2DView, pinch2DView } from '../domain/touchNavigation';
import { Native3DWorkspace } from './Native3DWorkspace';
import { GasRangePlanGraphic } from './GasRangePlanGraphic';

type Props = { project: EditorProject; apply: (project: EditorProject, record?: boolean) => void };
type GestureState = { mode: 'none'|'pan'|'pinch'; startView: View2DState; startDistance: number; startMidpoint: Vec2 };
type ObjectProps = Props & { object: EditorObject; view: View2DState; setObjectTouch: (active: boolean) => void };

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

function NativePlanObject({ project, object, view, apply, setObjectTouch }: ObjectProps) {
  const [previewObject, setPreviewObject] = useState(object);
  const [dragging, setDragging] = useState(false);
  const origin = useRef<ObjectDragOrigin | undefined>(undefined);
  const startProject = useRef<EditorProject | undefined>(undefined);
  const finalProject = useRef<EditorProject | undefined>(undefined);
  const moved = useRef(false);

  useEffect(() => {
    if (!dragging) setPreviewObject(object);
  }, [object, dragging]);

  const finish = (commit: boolean) => {
    setObjectTouch(false);
    setDragging(false);
    if (commit && moved.current && finalProject.current) apply({ ...finalProject.current, selectedId: object.id }, true);
    else setPreviewObject(object);
    moved.current = false;
    origin.current = undefined;
    startProject.current = undefined;
    finalProject.current = undefined;
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (event, state) => event.nativeEvent.touches.length === 1 && Math.abs(state.dx) + Math.abs(state.dy) > 4,
    onPanResponderGrant: () => {
      const dragOrigin = createObjectDragOrigin(project, object.id);
      if (!dragOrigin) return;
      origin.current = dragOrigin;
      startProject.current = project;
      finalProject.current = project;
      moved.current = false;
      setDragging(true);
      setObjectTouch(true);
    },
    onPanResponderMove: (_event, state) => {
      if (!origin.current || !startProject.current) return;
      const dx = state.dx / view.zoom;
      const dy = state.dy / view.zoom;
      if (Math.abs(dx) + Math.abs(dy) > .5) moved.current = true;
      const next = moveObjectByPlanDelta(startProject.current, origin.current, dx, dy);
      finalProject.current = next;
      const nextObject = next.objects.find(item => item.id === object.id);
      if (nextObject) setPreviewObject(nextObject);
    },
    onPanResponderRelease: () => finish(true),
    onPanResponderTerminate: () => finish(false),
    onPanResponderTerminationRequest: () => true,
  }), [project, object.id, object, view.zoom, apply, setObjectTouch]);

  const width = Math.max(18, previewObject.widthIn * .38);
  const depth = previewObject.kind === 'wall' ? Math.max(5, previewObject.depthIn * .38) : Math.max(12, previewObject.depthIn * .38);
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${previewObject.name}, ${Math.round(previewObject.widthIn)} by ${Math.round(previewObject.depthIn)} inches`}
    accessibilityHint="Tap to select or drag to move"
    onPressIn={() => setObjectTouch(true)}
    onPressOut={() => { if (!dragging) setObjectTouch(false); }}
    onPress={event => { event.stopPropagation(); apply({ ...project, selectedId: object.id }, false); }}
    style={[s.object, { left: previewObject.x, top: previewObject.y, width, height: depth, backgroundColor: previewObject.color ?? '#C8CFCC', transform: [{ rotate: `${previewObject.rotation}deg` }] }, (project.selectedId === object.id || dragging) && s.selected]}
    {...responder.panHandlers}
  >
    <GasRangePlanGraphic object={previewObject}/>
    <Text numberOfLines={1} style={s.objectLabel}>{previewObject.name}</Text>
    {view.measurements && <Text numberOfLines={1} style={s.dimensionLabel}>{Math.round(previewObject.widthIn)}″ × {Math.round(previewObject.depthIn)}″</Text>}
  </Pressable>;
}

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
  const setObjectTouch = (active: boolean) => { objectTouch.current = active; };

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

  if (project.viewMode === '3d') return <Native3DWorkspace project={project} apply={apply} />;

  const planTransform = { transformOrigin: [0, 0, 0], transform: [{ translateX: view.pan.x }, { translateY: view.pan.y }, { scale: view.zoom }] } as any;
  return <Pressable accessibilityLabel="Touch 2D kitchen workspace" accessibilityHint="Pinch with two fingers to zoom, drag empty space to pan, or drag an object to move it" onPress={() => apply({ ...project, selectedId: undefined }, false)} style={s.workspace} {...panResponder.panHandlers}>
    <View style={[s.plan, planTransform]}>
      {view.grid && <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {verticalGrid.map(left => <View key={`v-${left}`} style={[s.gridVertical, { left }]} />)}
        {horizontalGrid.map(top => <View key={`h-${top}`} style={[s.gridHorizontal, { top }]} />)}
      </View>}
      {project.objects.map(object => <NativePlanObject key={object.id} project={project} object={object} view={view} apply={apply} setObjectTouch={setObjectTouch} />)}
    </View>
    <View pointerEvents="none" style={s.touchHint}><Text style={s.touchHintText}>Pinch Zoom · Empty Pan · Drag Object · {Math.round(view.zoom * 100)}% · {view.snap ? 'Snap On' : 'Snap Off'}</Text></View>
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
});
