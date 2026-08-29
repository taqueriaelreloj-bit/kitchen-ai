import { EditorObject, EditorProject } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';
import { Bounds2D, fit3DCamera, projectPlanBounds, ViewportSize } from './viewFitting';

export type Professional3DView = 'dollhouse' | 'visit' | 'wall' | 'top';
export type ProfessionalSurface = 'object' | 'wall' | 'glass' | 'wood-floor' | 'site-grid' | 'platform' | 'shadow';
export type ProfessionalSceneBox = Box3D & {
  surface: ProfessionalSurface;
  opacity: number;
  selectable: boolean;
  roomSide?: 'north' | 'east' | 'south' | 'west';
};
export type ProfessionalScene = {
  boxes: ProfessionalSceneBox[];
  planBounds: Bounds2D;
  sceneCenter: [number, number, number];
  areaSqFt: number;
};

const INCHES_PER_SCENE_UNIT = 24;
const inchesToScene = (value: number) => value / INCHES_PER_SCENE_UNIT;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const normalizeYaw = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
const wallHeightIn = (project: EditorProject) => Math.max(84, project.room.heightM * 39.3701);

function wallEndpoints(wall: EditorObject) {
  const radians = wall.rotation * Math.PI / 180;
  return [
    { x: wall.x, y: wall.y },
    { x: wall.x + Math.cos(radians) * wall.widthIn, y: wall.y + Math.sin(radians) * wall.widthIn },
  ];
}

function boundsFromValues(left: number, top: number, right: number, bottom: number): Bounds2D {
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  return { left, top, right, bottom, width, height, centerX: left + width / 2, centerY: top + height / 2 };
}

/**
 * Finds the room footprint rather than the complete object footprint. Walls are
 * the best source of truth; the scan dimensions fill missing directions for
 * open L-shaped rooms and early projects that contain only one or two walls.
 */
export function professionalRoomBounds(project: EditorProject): Bounds2D {
  const roomWidthIn = Math.max(72, project.room.widthM * 39.3701);
  const roomLengthIn = Math.max(72, project.room.lengthM * 39.3701);
  const walls = project.objects.filter(object => object.kind === 'wall');
  if (!walls.length) {
    const projectBounds = projectPlanBounds(project);
    const left = projectBounds.centerX - roomWidthIn / 2;
    const top = projectBounds.centerY - roomLengthIn / 2;
    return boundsFromValues(left, top, left + roomWidthIn, top + roomLengthIn);
  }

  const points = walls.flatMap(wallEndpoints);
  let left = Math.min(...points.map(point => point.x));
  let top = Math.min(...points.map(point => point.y));
  let right = Math.max(...points.map(point => point.x));
  let bottom = Math.max(...points.map(point => point.y));

  // L-shaped scans commonly describe the top and left wall only. Preserve the
  // detected corner and extend missing directions using confirmed room size.
  if (right - left < roomWidthIn * .8) right = left + roomWidthIn;
  if (bottom - top < roomLengthIn * .8) bottom = top + roomLengthIn;

  // Include wall thickness without allowing a refrigerator or island overhang
  // to make the floor much larger than the measured room.
  const wallPadding = Math.max(2.25, ...walls.map(wall => wall.depthIn / 2));
  left -= wallPadding;
  top -= wallPadding;
  right += wallPadding;
  bottom += wallPadding;
  return boundsFromValues(left, top, right, bottom);
}

function wallSide(wall: EditorObject, bounds: Bounds2D) {
  const [start, end] = wallEndpoints(wall);
  const horizontal = Math.abs(start.y - end.y) <= Math.abs(start.x - end.x);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const tolerance = Math.max(8, wall.depthIn * 2);
  if (horizontal) {
    if (Math.abs(midpoint.y - bounds.top) <= tolerance) return 'north' as const;
    if (Math.abs(midpoint.y - bounds.bottom) <= tolerance) return 'south' as const;
  } else {
    if (Math.abs(midpoint.x - bounds.left) <= tolerance) return 'west' as const;
    if (Math.abs(midpoint.x - bounds.right) <= tolerance) return 'east' as const;
  }
  return undefined;
}

function sideForScenePoint(box: Box3D, bounds: Bounds2D) {
  const x = box.center[0] * INCHES_PER_SCENE_UNIT;
  const y = box.center[2] * INCHES_PER_SCENE_UNIT;
  const distances = [
    { side: 'north' as const, distance: Math.abs(y - bounds.top) },
    { side: 'south' as const, distance: Math.abs(y - bounds.bottom) },
    { side: 'west' as const, distance: Math.abs(x - bounds.left) },
    { side: 'east' as const, distance: Math.abs(x - bounds.right) },
  ].sort((a, b) => a.distance - b.distance);
  return distances[0].distance <= 12 ? distances[0].side : undefined;
}

function sceneSurface(
  box: Box3D,
  project: EditorProject,
  bounds: Bounds2D,
): Pick<ProfessionalSceneBox, 'surface'|'opacity'|'selectable'|'roomSide'> {
  if (box.kind === 'wall') {
    const wall = project.objects.find(object => object.id === box.sourceId && object.kind === 'wall');
    return { surface: 'wall', opacity: 1, selectable: Boolean(box.sourceId), roomSide: wall ? wallSide(wall, bounds) : sideForScenePoint(box, bounds) };
  }
  if (box.kind === 'opening') {
    const source = project.objects.find(object => object.id === box.sourceId);
    return source?.kind === 'window'
      ? { surface: 'glass', opacity: .5, selectable: true, roomSide: sideForScenePoint(box, bounds) }
      : { surface: 'object', opacity: 1, selectable: true, roomSide: sideForScenePoint(box, bounds) };
  }
  if (box.kind === 'trim') {
    return { surface: sideForScenePoint(box, bounds) ? 'wall' : 'object', opacity: 1, selectable: Boolean(box.sourceId), roomSide: sideForScenePoint(box, bounds) };
  }
  return { surface: 'object', opacity: 1, selectable: Boolean(box.sourceId) };
}

function shadowForObject(object: EditorObject): ProfessionalSceneBox | undefined {
  if (object.kind === 'wall' || object.kind === 'door' || object.kind === 'window' || object.kind === 'countertop' || object.kind === 'hardware') return undefined;
  if (object.elevationIn && object.elevationIn > 16) return undefined;
  return {
    id: `professional-shadow-${object.id}`,
    kind: 'floor',
    center: [
      inchesToScene(object.x + object.widthIn / 2),
      .075,
      inchesToScene(object.y + object.depthIn / 2),
    ],
    size: [
      inchesToScene(object.widthIn + 5),
      .018,
      inchesToScene(object.depthIn + 5),
    ],
    rotationY: -object.rotation * Math.PI / 180,
    color: '#17211F',
    roughness: 1,
    metalness: 0,
    surface: 'shadow',
    opacity: .13,
    selectable: false,
  };
}

function generatedRoomWalls(project: EditorProject, bounds: Bounds2D): ProfessionalSceneBox[] {
  const existingSides = new Set(project.objects
    .filter(object => object.kind === 'wall')
    .map(wall => wallSide(wall, bounds))
    .filter((side): side is 'north'|'east'|'south'|'west' => Boolean(side)));
  const sourceWall = project.objects.find(object => object.kind === 'wall');
  const color = sourceWall?.color ?? '#F4F1E9';
  const thicknessIn = sourceWall?.depthIn ?? 4.5;
  const heightIn = wallHeightIn(project);
  const baseboardHeightIn = 4.25;
  const baseboardDepthIn = .75;
  const boxes: ProfessionalSceneBox[] = [];

  const addSide = (side: 'north'|'east'|'south'|'west') => {
    if (existingSides.has(side)) return;
    const horizontal = side === 'north' || side === 'south';
    const centerXIn = horizontal ? bounds.centerX : side === 'west' ? bounds.left + thicknessIn / 2 : bounds.right - thicknessIn / 2;
    const centerYIn = horizontal ? side === 'north' ? bounds.top + thicknessIn / 2 : bounds.bottom - thicknessIn / 2 : bounds.centerY;
    const widthIn = horizontal ? bounds.width : thicknessIn;
    const depthIn = horizontal ? thicknessIn : bounds.height;
    boxes.push({
      id: `professional-room-wall-${side}`,
      kind: 'wall',
      center: [inchesToScene(centerXIn), inchesToScene(heightIn / 2), inchesToScene(centerYIn)],
      size: [inchesToScene(widthIn), inchesToScene(heightIn), inchesToScene(depthIn)],
      rotationY: 0,
      color,
      roughness: .9,
      metalness: 0,
      surface: 'wall',
      opacity: 1,
      selectable: false,
      roomSide: side,
    });
  };

  (['north', 'east', 'south', 'west'] as const).forEach(addSide);

  // A continuous baseboard line makes the room read as a finished interior,
  // especially when the camera cuts away the two nearest walls.
  (['north', 'east', 'south', 'west'] as const).forEach(side => {
    const horizontal = side === 'north' || side === 'south';
    const interiorOffset = thicknessIn + baseboardDepthIn / 2;
    const centerXIn = horizontal ? bounds.centerX : side === 'west' ? bounds.left + interiorOffset : bounds.right - interiorOffset;
    const centerYIn = horizontal ? side === 'north' ? bounds.top + interiorOffset : bounds.bottom - interiorOffset : bounds.centerY;
    boxes.push({
      id: `professional-baseboard-${side}`,
      kind: 'trim',
      center: [inchesToScene(centerXIn), inchesToScene(baseboardHeightIn / 2), inchesToScene(centerYIn)],
      size: [
        inchesToScene(horizontal ? Math.max(1, bounds.width - thicknessIn * 2) : baseboardDepthIn),
        inchesToScene(baseboardHeightIn),
        inchesToScene(horizontal ? baseboardDepthIn : Math.max(1, bounds.height - thicknessIn * 2)),
      ],
      rotationY: 0,
      color: '#F5F3EE',
      roughness: .64,
      metalness: 0,
      surface: 'wall',
      opacity: 1,
      selectable: false,
      roomSide: side,
    });
  });
  return boxes;
}

export function buildProfessional3DScene(project: EditorProject): ProfessionalScene {
  const planBounds = professionalRoomBounds(project);
  const centerX = inchesToScene(planBounds.centerX);
  const centerZ = inchesToScene(planBounds.centerY);
  const floorWidth = inchesToScene(planBounds.width);
  const floorDepth = inchesToScene(planBounds.height);
  const siteWidth = Math.max(floorWidth + 10, 22);
  const siteDepth = Math.max(floorDepth + 10, 22);

  const site: ProfessionalSceneBox = {
    id: 'professional-site-grid',
    kind: 'floor',
    center: [centerX, -.18, centerZ],
    size: [siteWidth, .08, siteDepth],
    rotationY: 0,
    color: '#B8C9D8',
    roughness: 1,
    metalness: 0,
    surface: 'site-grid',
    opacity: 1,
    selectable: false,
  };
  const platform: ProfessionalSceneBox = {
    id: 'professional-room-platform',
    kind: 'floor',
    center: [centerX, -.09, centerZ],
    size: [floorWidth + inchesToScene(8), .16, floorDepth + inchesToScene(8)],
    rotationY: 0,
    color: '#F2F0EA',
    roughness: .84,
    metalness: 0,
    surface: 'platform',
    opacity: 1,
    selectable: false,
  };
  const floor: ProfessionalSceneBox = {
    id: 'professional-room-floor',
    kind: 'floor',
    center: [centerX, .015, centerZ],
    size: [floorWidth, .10, floorDepth],
    rotationY: 0,
    color: '#D9D0C3',
    roughness: .7,
    metalness: 0,
    surface: 'wood-floor',
    opacity: 1,
    selectable: false,
  };

  const shadows = project.objects.map(shadowForObject).filter((box): box is ProfessionalSceneBox => Boolean(box));
  const generatedWalls = generatedRoomWalls(project, planBounds);
  const content = buildSceneBoxes(project.objects)
    .filter(box => box.id !== 'floor')
    .map(box => ({ ...box, ...sceneSurface(box, project, planBounds) }));

  const maximumHeight = Math.max(72, ...project.objects.map(object => (object.elevationIn ?? 0) + object.heightIn), wallHeightIn(project));
  return {
    boxes: [site, platform, floor, ...shadows, ...generatedWalls, ...content],
    planBounds,
    sceneCenter: [centerX, inchesToScene(maximumHeight / 2), centerZ],
    areaSqFt: Math.round(project.room.widthM * project.room.lengthM * 10.7639104167),
  };
}

function selectedTarget(project: EditorProject) {
  const selected = project.objects.find(object => object.id === project.selectedId);
  if (!selected) {
    const bounds = projectPlanBounds(project);
    return { x: bounds.centerX, y: bounds.centerY, yaw: 42, span: Math.max(bounds.width, bounds.height) };
  }
  return {
    x: selected.x + selected.widthIn / 2,
    y: selected.y + selected.depthIn / 2,
    yaw: normalizeYaw(180 - selected.rotation),
    span: Math.max(selected.widthIn, selected.depthIn, selected.heightIn),
  };
}

export function professionalCameraForView(
  project: EditorProject,
  view: Professional3DView,
  viewport: ViewportSize = { width: 960, height: 640 },
) {
  const fitted = fit3DCamera(project, viewport);
  const target = selectedTarget(project);
  if (view === 'top') return {
    ...fitted,
    yaw: 42,
    pitch: 76,
    distance: clamp(fitted.distance * 1.08, 220, 1100),
  };
  if (view === 'visit') return {
    ...fitted,
    target: { x: target.x, y: target.y },
    yaw: normalizeYaw(project.camera3d.yaw || 42),
    pitch: 13,
    distance: clamp(Math.min(fitted.distance * .62, 430), 190, 480),
  };
  if (view === 'wall') return {
    ...fitted,
    target: { x: target.x, y: target.y },
    yaw: target.yaw,
    pitch: 9,
    distance: clamp(Math.max(210, target.span * 5.2), 190, 680),
  };
  return {
    ...fitted,
    yaw: 42,
    pitch: 48,
    distance: clamp(fitted.distance * .78, 230, 1100),
  };
}

export function professionalWallOpacity(
  box: ProfessionalSceneBox,
  cameraYaw: number,
  view: Professional3DView,
  sceneCenter: [number, number, number],
) {
  if (box.surface !== 'wall' && box.surface !== 'glass') return box.opacity;
  if (view === 'visit') return box.opacity;
  const yaw = cameraYaw * Math.PI / 180;
  const cameraDirection = [Math.sin(yaw), Math.cos(yaw)];
  const dx = box.center[0] - sceneCenter[0];
  const dz = box.center[2] - sceneCenter[2];
  const length = Math.hypot(dx, dz) || 1;
  const towardCamera = cameraDirection[0] * dx / length + cameraDirection[1] * dz / length;
  const baseOpacity = box.surface === 'glass' ? Math.min(.56, box.opacity) : box.opacity;
  if (view === 'top') return towardCamera > .15 ? baseOpacity * .68 : baseOpacity * .96;
  if (view === 'wall') return towardCamera > .2 ? baseOpacity * .38 : baseOpacity * .94;
  return towardCamera > .12 ? baseOpacity * .18 : baseOpacity * .96;
}

export function professionalViewLabel(view: Professional3DView) {
  if (view === 'visit') return 'Visit';
  if (view === 'wall') return 'Wall View';
  if (view === 'top') return 'Top View';
  return 'Dollhouse';
}
