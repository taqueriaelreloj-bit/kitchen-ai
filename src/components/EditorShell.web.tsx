import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CABINET_FINISHES,
  HARDWARE_FINISHES,
  HARDWARE_POSITIONS,
  HARDWARE_SIZES,
  HARDWARE_STYLES,
  WALL_PAINTS,
} from '../domain/catalogs';
import {
  applyCabinetFinish,
  applyHardware,
  applyToeKick,
  applyWallPaint,
  CabinetScope,
  clampZoom,
  deleteObject,
  duplicateObject,
  EditorObject,
  EditorProject,
  isBaseLikeKind,
  ObjectKind,
  objectDefaults,
  removeHardware,
  reset2DView,
  reset3DView,
  updateObject,
} from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';

type Tool =
  | 'Plan'
  | 'Walls'
  | 'Doors & Windows'
  | 'Cabinets'
  | 'Appliances'
  | 'Countertops'
  | 'Island'
  | 'Colors'
  | 'Hardware'
  | 'Measurements'
  | 'View'
  | 'Settings';

const TOOLS: Tool[] = [
  'Plan', 'Walls', 'Doors & Windows', 'Cabinets', 'Appliances', 'Countertops',
  'Island', 'Colors', 'Hardware', 'Measurements', 'View', 'Settings',
];

const ICON: Record<Tool, string> = {
  Plan: '⌗', Walls: '▥', 'Doors & Windows': '▤', Cabinets: '▦', Appliances: '▧',
  Countertops: '▬', Island: '▰', Colors: '◉', Hardware: '⌁', Measurements: '↔',
  View: '◫', Settings: '⚙',
};

const CABINET_MENU: { label: string; kind: ObjectKind }[] = [
  { label: 'Base Cabinet', kind: 'base-cabinet' },
  { label: 'Sink Base', kind: 'sink-base' },
  { label: 'Drawer Base', kind: 'drawer-base' },
  { label: 'Corner Cabinet', kind: 'corner-cabinet' },
  { label: 'Wall Cabinet', kind: 'wall-cabinet' },
  { label: 'Glass Upper', kind: 'glass-upper' },
  { label: 'Tall Cabinet', kind: 'tall-cabinet' },
  { label: 'Pantry Cabinet', kind: 'pantry-cabinet' },
  { label: 'Oven Cabinet', kind: 'oven-cabinet' },
  { label: 'Refrigerator Cabinet', kind: 'refrigerator-cabinet' },
];

const AnyView = View as any;
const AnyPressable = Pressable as any;
type Mat4 = number[];

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      for (let k = 0; k < 4; k += 1) out[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
    }
  }
  return out;
}

function perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

function normalize(v: number[]) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return v.map(value => value / length);
}

function cross(a: number[], b: number[]) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function lookAt(eye: number[], target: number[], up = [0, 1, 0]): Mat4 {
  const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return [
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]), 1,
  ];
}

const translate = (x: number, y: number, z: number): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const scale = (x: number, y: number, z: number): Mat4 => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
function rotateY(angle: number): Mat4 { const c = Math.cos(angle); const s = Math.sin(angle); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }

function transformPoint(m: Mat4, p: number[]) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15],
  ];
}

function colorToRgb(value: string) {
  const short = value.replace('#', '');
  const full = short.length === 3 ? short.split('').map(x => x + x).join('') : short;
  const n = parseInt(full, 16) || 0xcccccc;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
varying vec3 vNormal;
varying vec3 vWorld;
void main(){
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uViewProjection * world;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vWorld;
uniform vec3 uColor;
uniform float uMetalness;
uniform float uRoughness;
uniform vec3 uEye;
void main(){
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(-0.35, 0.9, 0.45));
  vec3 V = normalize(uEye - vWorld);
  vec3 H = normalize(L + V);
  float diffuse = max(dot(N, L), 0.0);
  float specular = pow(max(dot(N, H), 0.0), mix(90.0, 10.0, uRoughness));
  vec3 base = uColor * (0.28 + 0.72 * diffuse);
  vec3 reflection = mix(vec3(0.65), uColor, uMetalness);
  gl_FragColor = vec4(base + reflection * specular * (0.15 + 0.7 * uMetalness), 1.0);
}`;

const CUBE = new Float32Array([
  -0.5,-0.5,0.5,0,0,1, 0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,-0.5,0.5,0,0,1, 0.5,0.5,0.5,0,0,1, -0.5,0.5,0.5,0,0,1,
  0.5,-0.5,-0.5,0,0,-1, -0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1, 0.5,-0.5,-0.5,0,0,-1, -0.5,0.5,-0.5,0,0,-1, 0.5,0.5,-0.5,0,0,-1,
  -0.5,-0.5,-0.5,-1,0,0, -0.5,-0.5,0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,-0.5,-0.5,-1,0,0, -0.5,0.5,0.5,-1,0,0, -0.5,0.5,-0.5,-1,0,0,
  0.5,-0.5,0.5,1,0,0, 0.5,-0.5,-0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,-0.5,0.5,1,0,0, 0.5,0.5,-0.5,1,0,0, 0.5,0.5,0.5,1,0,0,
  -0.5,0.5,0.5,0,1,0, 0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0, -0.5,0.5,0.5,0,1,0, 0.5,0.5,-0.5,0,1,0, -0.5,0.5,-0.5,0,1,0,
  -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,-0.5,0,-1,0, 0.5,-0.5,0.5,0,-1,0, -0.5,-0.5,0.5,0,-1,0,
]);

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile error');
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const program = gl.createProgram()!;
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link error');
  return program;
}

function WebGLKitchen({ project, apply }: { project: EditorProject; apply: (p: EditorProject, record?: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hits = useRef(new Map<string, { x: number; y: number }>());
  const drag = useRef({ x: 0, y: 0, yaw: 0, pitch: 0, tx: 0, ty: 0, mode: 'orbit' as 'orbit' | 'pan', active: false, moved: false });
  const boxes = useMemo(() => buildSceneBoxes(project.objects), [project.objects]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    const program = createProgram(gl);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE, gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'aPosition');
    const normal = gl.getAttribLocation(program, 'aNormal');
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const modelLocation = gl.getUniformLocation(program, 'uModel');
    const vpLocation = gl.getUniformLocation(program, 'uViewProjection');
    const colorLocation = gl.getUniformLocation(program, 'uColor');
    const roughLocation = gl.getUniformLocation(program, 'uRoughness');
    const metalLocation = gl.getUniformLocation(program, 'uMetalness');
    const eyeLocation = gl.getUniformLocation(program, 'uEye');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.88, 0.9, 0.89, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const yaw = project.camera3d.yaw * Math.PI / 180;
    const pitch = project.camera3d.pitch * Math.PI / 180;
    const distance = project.camera3d.distance / 42;
    const target = [project.camera3d.target.x / 24, 2, project.camera3d.target.y / 24];
    const eye = [target[0] + Math.cos(pitch) * Math.sin(yaw) * distance, target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(pitch) * Math.cos(yaw) * distance];
    const vp = multiply(perspective(Math.PI / 4, canvas.width / canvas.height, 0.05, 100), lookAt(eye, target));
    gl.uniformMatrix4fv(vpLocation, false, new Float32Array(vp));
    gl.uniform3fv(eyeLocation, new Float32Array(eye));
    hits.current.clear();

    for (const box of boxes) {
      const model = multiply(translate(...box.center), multiply(rotateY(box.rotationY), scale(...box.size)));
      gl.uniformMatrix4fv(modelLocation, false, new Float32Array(model));
      gl.uniform3fv(colorLocation, new Float32Array(colorToRgb(box.sourceId === project.selectedId ? '#49A88B' : box.color)));
      gl.uniform1f(roughLocation, box.roughness);
      gl.uniform1f(metalLocation, box.metalness);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
      if (box.sourceId && !hits.current.has(box.sourceId)) {
        const p = transformPoint(vp, box.center);
        if (p[3] > 0) hits.current.set(box.sourceId, { x: (p[0] / p[3] * 0.5 + 0.5) * width, y: (1 - (p[1] / p[3] * 0.5 + 0.5)) * height });
      }
    }

    return () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [boxes, project.camera3d, project.selectedId]);

  const pick = (event: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let id: string | undefined;
    let best = 44;
    for (const [candidate, pointValue] of hits.current) {
      const distance = Math.hypot(pointValue.x - x, pointValue.y - y);
      if (distance < best) { best = distance; id = candidate; }
    }
    return id;
  };

  return <canvas
    ref={canvasRef}
    aria-label="3D kitchen viewport"
    style={{ width: '100%', height: '100%', display: 'block' }}
    onContextMenu={event => event.preventDefault()}
    onWheel={event => { event.preventDefault(); apply({ ...project, camera3d: { ...project.camera3d, distance: Math.max(180, Math.min(1100, project.camera3d.distance + (event.deltaY > 0 ? 32 : -32))) } }, false); }}
    onMouseDown={event => { drag.current = { x: event.clientX, y: event.clientY, yaw: project.camera3d.yaw, pitch: project.camera3d.pitch, tx: project.camera3d.target.x, ty: project.camera3d.target.y, mode: event.button === 1 || event.button === 2 ? 'pan' : 'orbit', active: true, moved: false }; }}
    onMouseMove={event => {
      if (!drag.current.active) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
      if (drag.current.mode === 'orbit') apply({ ...project, camera3d: { ...project.camera3d, yaw: drag.current.yaw + dx * 0.28, pitch: Math.max(8, Math.min(78, drag.current.pitch + dy * 0.2)) } }, false);
      else apply({ ...project, camera3d: { ...project.camera3d, target: { x: drag.current.tx - dx * 0.45, y: drag.current.ty + dy * 0.45 } } }, false);
    }}
    onMouseUp={event => { drag.current.active = false; if (!drag.current.moved) apply({ ...project, selectedId: pick(event) }, false); }}
    onMouseLeave={() => { drag.current.active = false; }}
    onDoubleClick={event => { const id = pick(event); const object = project.objects.find(item => item.id === id); if (object) apply({ ...project, selectedId: object.id, camera3d: { ...project.camera3d, target: { x: object.x + object.widthIn / 2, y: object.y + object.depthIn / 2 }, distance: Math.max(260, project.camera3d.distance * 0.72) } }, false); }}
  />;
}

function Button({ label, onPress, active = false, disabled = false }: { label: string; onPress: () => void; active?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[s.button, active && s.buttonActive, disabled && s.disabled]}><Text style={[s.buttonText, active && s.buttonTextActive]}>{label}</Text></Pressable>;
}
function ToolButton({ tool, active, onPress }: { tool: Tool; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.tool, active && s.toolActive]}><Text style={s.toolIcon}>{ICON[tool]}</Text><Text style={s.toolText}>{tool}</Text></Pressable>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>; }
function Swatch({ color, name, onPress, selected }: { color: string; name: string; onPress: () => void; selected?: boolean }) { return <Pressable onPress={onPress} style={[s.swatchWrap, selected && s.swatchSelected]}><View style={[s.swatch, { backgroundColor: color }]} /><Text style={s.swatchName}>{name}</Text></Pressable>; }
function Scope({ value, onChange }: { value: CabinetScope; onChange: (v: CabinetScope) => void }) { return <View style={s.wrap}>{(['selected', 'base', 'wall', 'island', 'all'] as CabinetScope[]).map(v => <Button key={v} label={v} active={value === v} onPress={() => onChange(v)} />)}</View>; }

function ToolPanel({ tool, project, selected, apply }: { tool: Tool; project: EditorProject; selected?: EditorObject; apply: (p: EditorProject, record?: boolean) => void }) {
  const [scope, setScope] = useState<CabinetScope>('selected');
  const [query, setQuery] = useState('');
  const add = (kind: ObjectKind) => apply({ ...project, objects: [...project.objects, objectDefaults(kind, { x: 145 + project.objects.length * 9, y: 110 + project.objects.length * 7 })] });

  if (tool === 'Walls') return <Section title="Walls"><View style={s.wrap}><Button label="Add Wall" onPress={() => add('wall')} /><Button label="Continue Wall" onPress={() => add('wall')} /><Button label="Delete Wall" disabled={selected?.kind !== 'wall'} onPress={() => selected && apply(deleteObject(project, selected.id))} /></View></Section>;
  if (tool === 'Doors & Windows') return <Section title="Doors & Windows"><View style={s.wrap}><Button label="Add Door" onPress={() => add('door')} /><Button label="Add Window" onPress={() => add('window')} /></View></Section>;
  if (tool === 'Cabinets') return <ScrollView><Section title="Cabinet Catalog"><View style={s.catalog}>{CABINET_MENU.map(item => <Pressable key={item.kind} onPress={() => add(item.kind)} style={s.catalogItem}><Text style={s.catalogIcon}>▦</Text><Text style={s.catalogText}>{item.label}</Text></Pressable>)}</View></Section><Section title="Selected Cabinet"><View style={s.wrap}><Button label="Duplicate" disabled={!selected} onPress={() => selected && apply(duplicateObject(project, selected.id))} /><Button label="Rotate 90°" disabled={!selected} onPress={() => selected && apply(updateObject(project, selected.id, { rotation: (selected.rotation + 90) % 360 }))} /></View></Section><Section title="Toe Kick"><View style={s.wrap}><Button label="Selected On" onPress={() => apply(applyToeKick(project, { enabled: true }, false))} /><Button label="Selected Off" onPress={() => apply(applyToeKick(project, { enabled: false }, false))} /><Button label="All Base On" onPress={() => apply(applyToeKick(project, { enabled: true }, true))} /><Button label="All Base Off" onPress={() => apply(applyToeKick(project, { enabled: false }, true))} /></View></Section></ScrollView>;
  if (tool === 'Appliances') return <Section title="Appliances"><Button label="Add Appliance" onPress={() => add('appliance')} /></Section>;
  if (tool === 'Countertops') return <Section title="Countertops"><Button label="Add Countertop" onPress={() => add('countertop')} /></Section>;
  if (tool === 'Island') return <Section title="Island"><Button label="Add Island" onPress={() => add('island')} /></Section>;
  if (tool === 'Colors') {
    const q = query.trim().toLowerCase();
    const paints = WALL_PAINTS.filter(item => !q || item.displayName.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
    const finishes = CABINET_FINISHES.filter(item => !q || item.displayName.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
    return <ScrollView><TextInput value={query} onChangeText={setQuery} placeholder="Search colors or finishes" style={s.input} /><Section title="Wall Paint"><Button label="Apply Current to All Walls" disabled={selected?.kind !== 'wall'} onPress={() => selected?.wallPaintId && apply(applyWallPaint(project, selected.wallPaintId, true))} /><View style={s.swatches}>{paints.map(item => <Swatch key={item.id} color={item.approximateHex} name={item.displayName} selected={selected?.wallPaintId === item.id} onPress={() => selected?.kind === 'wall' && apply(applyWallPaint(project, item.id, false))} />)}</View><Text style={s.help}>Digital previews are approximate, not guaranteed physical paint matches.</Text></Section><Section title="Cabinet Finishes"><Scope value={scope} onChange={setScope} /><View style={s.swatches}>{finishes.map(item => <Swatch key={item.id} color={item.baseColor} name={item.displayName} selected={selected?.finishId === item.id} onPress={() => apply(applyCabinetFinish(project, item.id, scope))} />)}</View></Section></ScrollView>;
  }
  if (tool === 'Hardware') return <ScrollView><Section title="Application"><Scope value={scope} onChange={setScope} /><Button label="Remove Hardware" onPress={() => apply(removeHardware(project, scope))} /></Section><Section title="Style"><View style={s.wrap}>{HARDWARE_STYLES.map(item => <Button key={item} label={item} active={selected?.hardware?.style === item} onPress={() => apply(applyHardware(project, { style: item }, scope))} />)}</View></Section><Section title="Size"><View style={s.wrap}>{HARDWARE_SIZES.map(item => <Button key={item} label={item} active={selected?.hardware?.size === item} onPress={() => apply(applyHardware(project, { size: item }, scope))} />)}</View></Section><Section title="Finish"><View style={s.swatches}>{HARDWARE_FINISHES.map(item => <Swatch key={item.id} color={item.baseColor} name={item.displayName} selected={selected?.hardware?.finishId === item.id} onPress={() => apply(applyHardware(project, { finishId: item.id }, scope))} />)}</View></Section><Section title="Position"><View style={s.wrap}>{HARDWARE_POSITIONS.map(item => <Button key={item} label={item} active={selected?.hardware?.position === item} onPress={() => apply(applyHardware(project, { position: item }, scope))} />)}</View></Section></ScrollView>;
  if (tool === 'Measurements') return <Section title="Measurements"><Button label={project.view2d.measurements ? 'Measurements On' : 'Measurements Off'} onPress={() => apply({ ...project, view2d: { ...project.view2d, measurements: !project.view2d.measurements } }, false)} /><Button label={project.view2d.snap ? 'Snap On' : 'Snap Off'} onPress={() => apply({ ...project, view2d: { ...project.view2d, snap: !project.view2d.snap } }, false)} /></Section>;
  if (tool === 'View') return <Section title="Navigation Help"><Text style={s.help}>2D: wheel zooms toward cursor; middle drag or Space + left drag pans; drag objects to move. 3D: wheel zooms; left drag orbits; middle/right drag pans; double-click focuses an object.</Text></Section>;
  return <Section title={tool}><Text style={s.help}>Select an object to see contextual properties.</Text></Section>;
}

function ContextPanel({ project, selected, apply }: { project: EditorProject; selected?: EditorObject; apply: (p: EditorProject) => void }) {
  if (!selected) return <View style={s.context}><Text style={s.panelTitle}>Properties</Text><Text style={s.help}>Select a wall, cabinet, island, opening, appliance or countertop.</Text></View>;
  const patch = (next: Partial<EditorObject>) => apply(updateObject(project, selected.id, next));
  const baseLike = isBaseLikeKind(selected.kind);
  return <ScrollView style={s.context} contentContainerStyle={s.contextInner}><Text style={s.panelTitle}>{selected.name}</Text><Text style={s.kind}>{selected.kind.replace(/-/g, ' ')}</Text><TextInput value={selected.name} onChangeText={name => patch({ name })} style={s.input} />{([['Width', 'widthIn'], ['Height', 'heightIn'], ['Depth', 'depthIn'], ['Rotation', 'rotation']] as const).map(([label, key]) => <View key={key} style={s.field}><Text style={s.fieldLabel}>{label}</Text><View style={s.wrap}><Button label="−" onPress={() => patch({ [key]: Math.max(0, selected[key] - 1) })} /><Text style={s.fieldValue}>{Math.round(selected[key] * 10) / 10}{key === 'rotation' ? '°' : ' in'}</Text><Button label="+" onPress={() => patch({ [key]: selected[key] + 1 })} /></View></View>)}{baseLike && <Section title="Toe Kick"><Button label={selected.toeKick?.enabled ? 'Toe Kick On' : 'Toe Kick Off'} onPress={() => apply(applyToeKick(project, { enabled: !(selected.toeKick?.enabled ?? true) }, false))} />{selected.toeKick?.enabled && <Text style={s.help}>Height {selected.toeKick.heightIn} in · Recess {selected.toeKick.recessIn} in</Text>}</Section>}<View style={s.wrap}><Button label="Duplicate" onPress={() => apply(duplicateObject(project, selected.id))} /><Button label="Delete" onPress={() => Alert.alert('Delete object?', `Delete ${selected.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => apply(deleteObject(project, selected.id)) }])} /></View></ScrollView>;
}

function Workspace2D({ project, apply }: { project: EditorProject; apply: (p: EditorProject, record?: boolean) => void }) {
  const pan = useRef({ x: 0, y: 0, px: 0, py: 0, active: false });
  const move = useRef({ id: '', x: 0, y: 0, ox: 0, oy: 0, active: false });
  const spaceHeld = useRef(false);
  const webProps = {
    tabIndex: 0,
    onKeyDown: (event: any) => { if (event.code === 'Space') { spaceHeld.current = true; event.preventDefault(); } },
    onKeyUp: (event: any) => { if (event.code === 'Space') spaceHeld.current = false; },
    onWheel: (event: any) => { event.preventDefault(); const old = project.view2d.zoom; const next = clampZoom(old + (event.deltaY < 0 ? 0.08 : -0.08)); const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const ratio = next / old; apply({ ...project, view2d: { ...project.view2d, zoom: next, pan: { x: x - (x - project.view2d.pan.x) * ratio, y: y - (y - project.view2d.pan.y) * ratio } } }, false); },
    onMouseDown: (event: any) => { if (event.button === 1 || (event.button === 0 && spaceHeld.current)) pan.current = { x: event.clientX, y: event.clientY, px: project.view2d.pan.x, py: project.view2d.pan.y, active: true }; },
    onMouseMove: (event: any) => { if (pan.current.active) { apply({ ...project, view2d: { ...project.view2d, pan: { x: pan.current.px + event.clientX - pan.current.x, y: pan.current.py + event.clientY - pan.current.y } } }, false); return; } if (move.current.active) { const snap = (n: number) => project.view2d.snap ? Math.round(n / 5) * 5 : n; apply(updateObject(project, move.current.id, { x: snap(move.current.ox + (event.clientX - move.current.x) / project.view2d.zoom), y: snap(move.current.oy + (event.clientY - move.current.y) / project.view2d.zoom) }), false); } },
    onMouseUp: () => { pan.current.active = false; move.current.active = false; },
    onMouseLeave: () => { pan.current.active = false; move.current.active = false; },
  };
  return <AnyView style={s.workspace} {...webProps}><View style={[s.plan, { transform: [{ translateX: project.view2d.pan.x }, { translateY: project.view2d.pan.y }, { scale: project.view2d.zoom }] }]}>{project.objects.map(object => <AnyPressable key={object.id} onPress={() => apply({ ...project, selectedId: object.id }, false)} onMouseDown={(event: any) => { if (event.button !== 0 || spaceHeld.current) return; event.stopPropagation(); move.current = { id: object.id, x: event.clientX, y: event.clientY, ox: object.x, oy: object.y, active: true }; }} style={[s.obj2d, { left: object.x, top: object.y, width: Math.max(10, object.widthIn * 0.45), height: object.kind === 'wall' ? Math.max(4, object.depthIn * 0.45) : Math.max(8, object.depthIn * 0.45), backgroundColor: object.color ?? '#C7CECA', transform: [{ rotate: `${object.rotation}deg` }] }, project.selectedId === object.id && s.selected]}><Text numberOfLines={1} style={s.objLabel}>{object.name}</Text></AnyPressable>)}</View></AnyView>;
}

export function EditorShell({ initialProject, onProjectChange, onExit }: { initialProject: EditorProject; onProjectChange: (p: EditorProject) => void; onExit: () => void }) {
  const [project, setProject] = useState(initialProject);
  const [tool, setTool] = useState<Tool>('Plan');
  const [rightOpen, setRightOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const undo = useRef<EditorProject[]>([]);
  const redo = useRef<EditorProject[]>([]);
  const selected = useMemo(() => project.objects.find(object => object.id === project.selectedId), [project.objects, project.selectedId]);
  const apply = (next: EditorProject, record = true) => { if (record) { undo.current.push(project); if (undo.current.length > 60) undo.current.shift(); redo.current = []; } setProject(next); onProjectChange(next); };
  const doUndo = () => { const previous = undo.current.pop(); if (!previous) return; redo.current.push(project); setProject(previous); onProjectChange(previous); };
  const doRedo = () => { const next = redo.current.pop(); if (!next) return; undo.current.push(project); setProject(next); onProjectChange(next); };
  const fit = () => project.viewMode === '2d' ? apply({ ...project, view2d: { ...project.view2d, zoom: 0.72, pan: { x: 30, y: 24 } } }, false) : apply({ ...project, camera3d: { ...project.camera3d, distance: 700, target: { x: 220, y: 170 } } }, false);
  const reset = () => apply(project.viewMode === '2d' ? reset2DView(project) : reset3DView(project), false);

  return <View style={s.app}><View style={s.top}><View style={s.brand}><Text style={s.logo}>K</Text><View><Text style={s.brandTitle}>Kitchen AI</Text><Text style={s.projectName}>{project.name}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topActions}><Button label="Undo" disabled={!undo.current.length} onPress={doUndo} /><Button label="Redo" disabled={!redo.current.length} onPress={doRedo} /><Button label="Save" onPress={() => onProjectChange(project)} /><Button label="Open Project" onPress={onExit} /><Button label="2D" active={project.viewMode === '2d'} onPress={() => apply({ ...project, viewMode: '2d' }, false)} /><Button label="3D" active={project.viewMode === '3d'} onPress={() => apply({ ...project, viewMode: '3d' }, false)} /><Button label="Fit View" onPress={fit} /><Button label="Help" onPress={() => setTool('View')} /><Button label="Settings" onPress={() => setTool('Settings')} /></ScrollView></View><View style={s.main}>{!maximized && <ScrollView style={s.toolbar}>{TOOLS.map(item => <ToolButton key={item} tool={item} active={tool === item} onPress={() => setTool(item)} />)}</ScrollView>}{!maximized && <View style={s.leftPanel}><ToolPanel tool={tool} project={project} selected={selected} apply={apply} /></View>}<View style={s.center}><View style={s.workspaceHeader}><Text style={s.workspaceTitle}>{project.viewMode === '2d' ? '2D Plan' : '3D WebGL Kitchen'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>{project.viewMode === '2d' && <><Button label="Zoom −" onPress={() => apply({ ...project, view2d: { ...project.view2d, zoom: clampZoom(project.view2d.zoom - 0.1) } }, false)} /><Text style={s.zoom}>{Math.round(project.view2d.zoom * 100)}%</Text><Button label="Zoom +" onPress={() => apply({ ...project, view2d: { ...project.view2d, zoom: clampZoom(project.view2d.zoom + 0.1) } }, false)} /></>}<Button label="Fit" onPress={fit} /><Button label="Reset" onPress={reset} /><Button label={maximized ? 'Restore' : 'Maximize'} onPress={() => setMaximized(!maximized)} /><Button label={rightOpen ? 'Hide Properties' : 'Properties'} onPress={() => setRightOpen(!rightOpen)} /></ScrollView></View>{project.viewMode === '2d' ? <Workspace2D project={project} apply={apply} /> : <View style={s.workspace}><WebGLKitchen project={project} apply={apply} /></View>}<View style={s.status}><Text style={s.statusText}>{project.viewMode === '3d' ? 'WebGL 3D · detailed cabinet geometry · continuous toe kick' : `${Math.round(project.view2d.zoom * 100)}% · ${project.view2d.snap ? 'Snap On' : 'Snap Off'}`}</Text><Text style={s.statusText}>{project.viewMode === '3d' ? 'Wheel Zoom · Drag Orbit · Middle/Right Pan · Double-click Focus' : 'Wheel Zoom · Middle/Space Pan · Drag Objects'}</Text></View></View>{!maximized && rightOpen && <ContextPanel project={project} selected={selected} apply={next => apply(next)} />}</View></View>;
}

const s = StyleSheet.create({
  app:{flex:1,backgroundColor:'#E8ECEA'},top:{minHeight:64,backgroundColor:'#17211F',flexDirection:'row',alignItems:'center',paddingHorizontal:10},brand:{minWidth:190,flexDirection:'row',alignItems:'center',gap:9},logo:{width:38,height:38,borderRadius:10,backgroundColor:'#5EA38F',color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',textAlignVertical:'center'},brandTitle:{color:'#fff',fontSize:17,fontWeight:'900'},projectName:{color:'#AAB9B5',fontSize:11,maxWidth:130},topActions:{alignItems:'center',gap:5,paddingVertical:7},button:{minHeight:40,borderWidth:1,borderColor:'#B8C5C1',borderRadius:8,backgroundColor:'#fff',paddingHorizontal:10,alignItems:'center',justifyContent:'center',marginRight:4,marginBottom:4},buttonActive:{backgroundColor:'#DDEEE8',borderColor:'#5A917F'},buttonText:{fontSize:12,fontWeight:'800',color:'#263530'},buttonTextActive:{color:'#0E4939'},disabled:{opacity:.35},main:{flex:1,flexDirection:'row'},toolbar:{width:94,backgroundColor:'#202C29'},tool:{minHeight:72,margin:5,borderRadius:10,alignItems:'center',justifyContent:'center',padding:5},toolActive:{backgroundColor:'#38544C'},toolIcon:{fontSize:23,color:'#F1F6F4'},toolText:{fontSize:10,color:'#CFD8D5',fontWeight:'700',textAlign:'center',marginTop:3},leftPanel:{width:300,backgroundColor:'#F6F8F7',borderRightWidth:1,borderRightColor:'#CCD5D2',padding:12},section:{gap:8,marginBottom:16},sectionTitle:{fontSize:14,fontWeight:'900',color:'#1D2A27',textTransform:'uppercase'},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},catalog:{flexDirection:'row',flexWrap:'wrap',gap:7},catalogItem:{width:'48%',minHeight:76,borderWidth:1,borderColor:'#C5D0CC',borderRadius:10,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',padding:8},catalogIcon:{fontSize:24,color:'#315F55'},catalogText:{fontSize:11,fontWeight:'800',textAlign:'center',color:'#263530',marginTop:3},help:{fontSize:13,lineHeight:19,color:'#5C6B66'},swatches:{flexDirection:'row',flexWrap:'wrap'},swatchWrap:{width:'31%',margin:'1%',padding:4,borderWidth:2,borderColor:'transparent',borderRadius:8,minHeight:78},swatchSelected:{borderColor:'#315F55',backgroundColor:'#E4F0EC'},swatch:{height:40,borderRadius:6,borderWidth:1,borderColor:'#C9D0CD'},swatchName:{fontSize:9,fontWeight:'700',color:'#2B3935',marginTop:3},input:{minHeight:42,borderWidth:1,borderColor:'#BBC7C3',borderRadius:8,paddingHorizontal:10,backgroundColor:'#fff',marginBottom:10},center:{flex:1,minWidth:0},workspaceHeader:{minHeight:52,backgroundColor:'#F6F8F7',borderBottomWidth:1,borderBottomColor:'#CBD4D1',paddingHorizontal:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},workspaceTitle:{fontSize:15,fontWeight:'900',color:'#1D2A27'},headerActions:{alignItems:'center',gap:3},zoom:{width:44,textAlign:'center',fontSize:12,fontWeight:'900'},workspace:{flex:1,overflow:'hidden',backgroundColor:'#E2E7E5'},plan:{position:'absolute',left:0,top:0,width:900,height:650},obj2d:{position:'absolute',borderWidth:1,borderColor:'#596762',borderRadius:3,justifyContent:'center'},objLabel:{fontSize:9,fontWeight:'700',paddingHorizontal:2},selected:{borderWidth:3,borderColor:'#0B785A'},status:{minHeight:30,backgroundColor:'#17211F',paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},statusText:{fontSize:10,color:'#CBD6D3'},context:{width:290,backgroundColor:'#F7F9F8',borderLeftWidth:1,borderLeftColor:'#CBD4D1'},contextInner:{padding:13,gap:9},panelTitle:{fontSize:18,fontWeight:'900',color:'#1E2B27'},kind:{fontSize:11,fontWeight:'800',color:'#60706A',textTransform:'uppercase'},field:{gap:5,marginBottom:8},fieldLabel:{fontSize:12,fontWeight:'800',color:'#43524D'},fieldValue:{fontSize:13,fontWeight:'900',minWidth:72,textAlign:'center'},
});
