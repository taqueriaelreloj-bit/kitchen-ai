import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera3DState, EditorProject, Vec2 } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import {
  focusNativeCamera,
  orbitNativeCamera,
  pinchNativeCamera,
  ProjectedBox,
  projectNativeScene,
  ViewportSize,
} from '../domain/nativeProjection3d';

type Props = { project: EditorProject; apply: (project: EditorProject, record?: boolean) => void };
type GestureState = {
  mode: 'none'|'orbit'|'pinch';
  startCamera: Camera3DState;
  startDistance: number;
  startMidpoint: Vec2;
};

const point = (touch: any): Vec2 => ({
  x: Number.isFinite(touch.locationX) ? touch.locationX : touch.pageX,
  y: Number.isFinite(touch.locationY) ? touch.locationY : touch.pageY,
});
const midpoint = (touches: any[]): Vec2 => {
  const a = point(touches[0]);
  const b = point(touches[1]);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};
const touchDistance = (touches: any[]) => {
  const a = point(touches[0]);
  const b = point(touches[1]);
  return Math.hypot(b.x - a.x, b.y - a.y);
};
const opacityFor = (kind: ProjectedBox['kind']) => {
  if (kind === 'floor') return .2;
  if (kind === 'wall') return .52;
  if (kind === 'opening') return .58;
  if (kind === 'hardware' || kind === 'lighting') return .96;
  if (kind === 'trim' || kind === 'fixture') return .9;
  return .86;
};
const radiusFor = (kind: ProjectedBox['kind']) => kind === 'lighting' || kind === 'hardware' ? 6 : kind === 'fixture' ? 8 : 2;

export function Native3DWorkspace({ project, apply }: Props) {
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1, height: 1 });
  const [camera, setCamera] = useState<Camera3DState>(project.camera3d);
  const cameraRef = useRef<Camera3DState>(project.camera3d);
  const objectTouch = useRef(false);
  const lastTap = useRef({ sourceId: '', at: 0 });
  const gesture = useRef<GestureState>({ mode: 'none', startCamera: project.camera3d, startDistance: 1, startMidpoint: { x: 0, y: 0 } });

  useEffect(() => {
    cameraRef.current = project.camera3d;
    setCamera(project.camera3d);
  }, [project.camera3d]);

  const boxes = useMemo(() => buildSceneBoxes(project.objects), [project.objects]);
  const projected = useMemo(() => projectNativeScene(boxes, camera, viewport), [boxes, camera, viewport]);
  const selected = useMemo(() => project.objects.find(object => object.id === project.selectedId), [project.objects, project.selectedId]);

  const setLocalCamera = (next: Camera3DState) => {
    cameraRef.current = next;
    setCamera(next);
  };
  const beginPinch = (touches: any[]) => {
    gesture.current = {
      mode: 'pinch',
      startCamera: cameraRef.current,
      startDistance: Math.max(1, touchDistance(touches)),
      startMidpoint: midpoint(touches),
    };
  };
  const commitCamera = () => {
    if (gesture.current.mode !== 'none') apply({ ...project, camera3d: cameraRef.current }, false);
    gesture.current = { ...gesture.current, mode: 'none' };
    objectTouch.current = false;
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (event, state) => event.nativeEvent.touches.length >= 2 || (!objectTouch.current && Math.abs(state.dx) + Math.abs(state.dy) > 5),
    onMoveShouldSetPanResponder: (event, state) => event.nativeEvent.touches.length >= 2 || (!objectTouch.current && Math.abs(state.dx) + Math.abs(state.dy) > 5),
    onPanResponderGrant: event => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) beginPinch(touches);
      else gesture.current = { mode: 'orbit', startCamera: cameraRef.current, startDistance: 1, startMidpoint: { x: 0, y: 0 } };
    },
    onPanResponderMove: (event, state) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        if (gesture.current.mode !== 'pinch') beginPinch(touches);
        setLocalCamera(pinchNativeCamera(gesture.current.startCamera, gesture.current.startDistance, touchDistance(touches), gesture.current.startMidpoint, midpoint(touches)));
        return;
      }
      if (gesture.current.mode === 'pinch') return;
      if (gesture.current.mode !== 'orbit') gesture.current = { mode: 'orbit', startCamera: cameraRef.current, startDistance: 1, startMidpoint: { x: 0, y: 0 } };
      setLocalCamera(orbitNativeCamera(gesture.current.startCamera, state.dx, state.dy));
    },
    onPanResponderRelease: commitCamera,
    onPanResponderTerminate: commitCamera,
    onPanResponderTerminationRequest: () => true,
  }), [project, apply]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== viewport.width || height !== viewport.height)) setViewport({ width, height });
  };

  const selectSource = (sourceId: string) => {
    const object = project.objects.find(item => item.id === sourceId);
    if (!object) return;
    const now = Date.now();
    const doubleTap = lastTap.current.sourceId === sourceId && now - lastTap.current.at < 360;
    lastTap.current = { sourceId, at: now };
    if (doubleTap) {
      const focused = focusNativeCamera(cameraRef.current, object.x + object.widthIn / 2, object.y + object.depthIn / 2, Math.max(object.widthIn, object.depthIn, object.heightIn));
      setLocalCamera(focused);
      apply({ ...project, selectedId: sourceId, camera3d: focused }, false);
      return;
    }
    apply({ ...project, selectedId: sourceId, camera3d: cameraRef.current }, false);
  };

  return <Pressable
    accessibilityLabel="Interactive 3D kitchen workspace"
    accessibilityHint="Drag empty space to orbit. Pinch with two fingers to zoom and pan. Double tap an object to focus it."
    onLayout={onLayout}
    onPress={() => apply({ ...project, selectedId: undefined, camera3d: cameraRef.current }, false)}
    style={s.workspace}
    {...responder.panHandlers}
  >
    <View pointerEvents="none" style={s.horizon} />
    {projected.map((box, index) => {
      const isSelected = Boolean(box.sourceId && box.sourceId === project.selectedId);
      const style = [s.projected, {
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: index + 1,
        backgroundColor: box.color,
        borderRadius: radiusFor(box.kind),
        opacity: opacityFor(box.kind),
      }, isSelected && s.selected];
      if (!box.sourceId || box.kind === 'floor') return <View key={box.id} pointerEvents="none" style={style}><View style={s.highlight} /></View>;
      return <Pressable
        key={box.id}
        accessibilityRole="button"
        accessibilityLabel={project.objects.find(object => object.id === box.sourceId)?.name ?? box.kind}
        accessibilityHint="Tap to select. Double tap to focus."
        onPressIn={() => { objectTouch.current = true; }}
        onPressOut={() => { objectTouch.current = false; }}
        onPress={event => { event.stopPropagation(); selectSource(box.sourceId!); }}
        style={style}
      ><View pointerEvents="none" style={s.highlight} /></Pressable>;
    })}
    <View pointerEvents="none" style={s.cameraBadge}>
      <Text style={s.cameraText}>1-Finger Orbit · 2-Finger Zoom/Pan · Double Tap Focus</Text>
      <Text style={s.cameraSubtext}>{Math.round(camera.yaw)}° yaw · {Math.round(camera.pitch)}° pitch · {Math.round(camera.distance)} distance</Text>
    </View>
    {selected && <View pointerEvents="none" style={s.selectionBadge}><Text numberOfLines={1} style={s.selectionText}>{selected.name}</Text></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  workspace: { flex: 1, overflow: 'hidden', backgroundColor: '#D9E0DE' },
  horizon: { position: 'absolute', left: 0, right: 0, top: '42%', bottom: 0, backgroundColor: '#C8CFCC' },
  projected: { position: 'absolute', minWidth: 2, minHeight: 2, borderWidth: 1, borderColor: '#34423D55', overflow: 'hidden' },
  highlight: { position: 'absolute', left: 0, right: 0, top: 0, height: '20%', backgroundColor: '#FFFFFF', opacity: .16 },
  selected: { borderWidth: 3, borderColor: '#0B785A', opacity: 1 },
  cameraBadge: { position: 'absolute', left: 10, bottom: 10, maxWidth: '82%', borderRadius: 9, backgroundColor: '#17211FDD', paddingHorizontal: 10, paddingVertical: 7 },
  cameraText: { fontSize: 10, color: '#ECF3F1', fontWeight: '900' },
  cameraSubtext: { fontSize: 9, color: '#B7C6C1', fontWeight: '700', marginTop: 2 },
  selectionBadge: { position: 'absolute', right: 10, top: 10, maxWidth: '55%', borderRadius: 8, borderWidth: 1, borderColor: '#5E8F80', backgroundColor: '#F4F8F6EE', paddingHorizontal: 9, paddingVertical: 6 },
  selectionText: { fontSize: 11, fontWeight: '900', color: '#21483D' },
});
