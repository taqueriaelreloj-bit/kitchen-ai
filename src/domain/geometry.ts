import { HARDWARE_FINISHES } from './catalogs';
import { EditorObject, isBaseCabinetKind, isBaseLikeKind, isCabinetKind } from './editor';
import { openingData, openingsForWall } from './openings';

export type Box3D = {
  id: string;
  sourceId?: string;
  kind: 'wall' | 'cabinet' | 'cabinet-door' | 'countertop' | 'toe-kick' | 'hardware' | 'opening' | 'appliance' | 'floor' | 'trim';
  center: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  color: string;
  roughness: number;
  metalness: number;
};

const inchesToScene = (value: number) => value / 24;
const toRadians = (degrees: number) => degrees * Math.PI / 180;
const isBaseLike = (object: EditorObject) => isBaseLikeKind(object.kind);
const isCabinet = (object: EditorObject) => isCabinetKind(object.kind);

export type ToeKickRun = {
  ids: string[];
  x: number;
  y: number;
  widthIn: number;
  depthIn: number;
  rotation: number;
  heightIn: number;
  recessIn: number;
  color: string;
};

export function continuousToeKickRuns(objects: EditorObject[], toleranceIn = 2): ToeKickRun[] {
  const candidates = objects.filter(object => isBaseLike(object) && object.toeKick?.enabled);
  const used = new Set<string>();
  const runs: ToeKickRun[] = [];
  for (const first of candidates) {
    if (used.has(first.id)) continue;
    const rotation = ((first.rotation % 360) + 360) % 360;
    const horizontal = Math.abs(rotation % 180) < 1;
    const group = candidates
      .filter(object => !used.has(object.id) && Math.abs((((object.rotation % 360) + 360) % 360) - rotation) < 1)
      .filter(object => horizontal ? Math.abs(object.y - first.y) <= toleranceIn : Math.abs(object.x - first.x) <= toleranceIn)
      .sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
    let current: EditorObject[] = [];
    const flush = () => {
      if (!current.length) return;
      current.forEach(object => used.add(object.id));
      const start = current[0];
      const end = current[current.length - 1];
      const startAxis = horizontal ? start.x : start.y;
      const endAxis = (horizontal ? end.x : end.y) + end.widthIn;
      const span = Math.max(start.widthIn, endAxis - startAxis);
      runs.push({
        ids: current.map(object => object.id),
        x: horizontal ? startAxis + span / 2 : start.x,
        y: horizontal ? start.y : startAxis + span / 2,
        widthIn: span,
        depthIn: Math.max(...current.map(object => Math.max(1, object.depthIn - (object.toeKick?.recessIn ?? 3)))),
        rotation,
        heightIn: Math.max(...current.map(object => object.toeKick?.heightIn ?? 4)),
        recessIn: Math.max(...current.map(object => object.toeKick?.recessIn ?? 3)),
        color: start.toeKick?.color ?? start.color ?? '#E8E3D8',
      });
      current = [];
    };
    for (const cabinet of group) {
      if (!current.length) { current.push(cabinet); continue; }
      const previous = current[current.length - 1];
      const previousEnd = (horizontal ? previous.x : previous.y) + previous.widthIn;
      const nextStart = horizontal ? cabinet.x : cabinet.y;
      if (Math.abs(nextStart - previousEnd) <= toleranceIn) current.push(cabinet);
      else { flush(); current.push(cabinet); }
    }
    flush();
  }
  return runs;
}

function materialFor(object: EditorObject) {
  const name = (object.material ?? '').toLowerCase();
  const finish = (object.finishId ?? '').toLowerCase();
  const metallic = name.includes('stainless') || name.includes('metal') || name.includes('chrome');
  const matte = finish.includes('matte');
  const gloss = finish.includes('gloss');
  return { metalness: metallic ? 0.85 : 0.04, roughness: matte ? 0.82 : gloss ? 0.22 : metallic ? 0.3 : 0.46 };
}

function wallPoint(wall: EditorObject, alongIn: number, depthIn = wall.depthIn / 2) {
  const radians = toRadians(wall.rotation);
  return {
    x: wall.x + Math.cos(radians) * alongIn - Math.sin(radians) * depthIn,
    z: wall.y + Math.sin(radians) * alongIn + Math.cos(radians) * depthIn,
  };
}

function addWallSegment(boxes: Box3D[], wall: EditorObject, id: string, startIn: number, lengthIn: number, bottomIn: number, heightIn: number) {
  if (lengthIn <= 0.05 || heightIn <= 0.05) return;
  const point = wallPoint(wall, startIn + lengthIn / 2);
  boxes.push({
    id,
    sourceId: wall.id,
    kind: 'wall',
    center: [inchesToScene(point.x), inchesToScene(bottomIn + heightIn / 2), inchesToScene(point.z)],
    size: [inchesToScene(lengthIn), inchesToScene(heightIn), inchesToScene(Math.max(2, wall.depthIn))],
    rotationY: -toRadians(wall.rotation),
    color: wall.color ?? '#F4F1E9',
    roughness: 0.92,
    metalness: 0,
  });
}

export function wallSegmentsForOpenings(wall: EditorObject, objects: EditorObject[]): Box3D[] {
  const boxes: Box3D[] = [];
  const openings = openingsForWall(objects, wall.id)
    .map(opening => ({ opening, offset: Math.max(0, Math.min(wall.widthIn - opening.widthIn, openingData(opening).wallOffsetIn ?? 0)) }))
    .sort((a, b) => a.offset - b.offset);
  if (!openings.length) {
    addWallSegment(boxes, wall, `${wall.id}-full`, 0, wall.widthIn, 0, wall.heightIn);
    return boxes;
  }
  let cursor = 0;
  openings.forEach(({ opening, offset }, index) => {
    const start = Math.max(cursor, offset);
    const end = Math.min(wall.widthIn, Math.max(start, offset + opening.widthIn));
    if (start > cursor) addWallSegment(boxes, wall, `${wall.id}-between-${index}`, cursor, start - cursor, 0, wall.heightIn);
    const sill = opening.kind === 'window' ? Math.max(0, openingData(opening).sillHeightIn ?? opening.elevationIn ?? 36) : 0;
    const openingHeight = Math.max(0, Math.min(opening.heightIn, wall.heightIn - sill));
    if (sill > 0) addWallSegment(boxes, wall, `${wall.id}-below-${opening.id}`, start, end - start, 0, sill);
    const top = sill + openingHeight;
    if (top < wall.heightIn) addWallSegment(boxes, wall, `${wall.id}-above-${opening.id}`, start, end - start, top, wall.heightIn - top);
    cursor = Math.max(cursor, end);
  });
  if (cursor < wall.widthIn) addWallSegment(boxes, wall, `${wall.id}-tail`, cursor, wall.widthIn - cursor, 0, wall.heightIn);
  return boxes;
}

function openingPose(opening: EditorObject, objects: EditorObject[]) {
  const data = openingData(opening);
  const wall = data.parentWallId ? objects.find(object => object.id === data.parentWallId && object.kind === 'wall') : undefined;
  if (!wall) return {
    x: opening.x + opening.widthIn / 2,
    z: opening.y + opening.depthIn / 2,
    rotation: opening.rotation,
    sill: opening.kind === 'window' ? data.sillHeightIn ?? opening.elevationIn ?? 36 : 0,
    depth: opening.depthIn,
  };
  const offset = Math.max(0, Math.min(wall.widthIn - opening.widthIn, data.wallOffsetIn ?? 0));
  const point = wallPoint(wall, offset + opening.widthIn / 2, wall.depthIn / 2);
  return { x: point.x, z: point.z, rotation: wall.rotation, sill: opening.kind === 'window' ? data.sillHeightIn ?? opening.elevationIn ?? 36 : 0, depth: wall.depthIn };
}

function addDoorGeometry(boxes: Box3D[], opening: EditorObject, objects: EditorObject[]) {
  const pose = openingPose(opening, objects);
  const rotation = -toRadians(pose.rotation);
  const x = inchesToScene(pose.x);
  const z = inchesToScene(pose.z);
  const height = inchesToScene(opening.heightIn);
  boxes.push({ id: opening.id, sourceId: opening.id, kind: 'opening', center: [x, height / 2, z], size: [inchesToScene(opening.widthIn - 1), height, inchesToScene(1.25)], rotationY: rotation, color: '#8A664B', roughness: 0.52, metalness: 0.02 });
  const trimWidth = 2.25;
  const left = wallPoint({ ...opening, x: pose.x, y: pose.z, rotation: pose.rotation } as EditorObject, -opening.widthIn / 2, 0);
  const right = wallPoint({ ...opening, x: pose.x, y: pose.z, rotation: pose.rotation } as EditorObject, opening.widthIn / 2, 0);
  boxes.push({ id: `${opening.id}-trim-left`, sourceId: opening.id, kind: 'trim', center: [inchesToScene(left.x), height / 2, inchesToScene(left.z)], size: [inchesToScene(trimWidth), height + inchesToScene(trimWidth), inchesToScene(1.5)], rotationY: rotation, color: '#F0EEE8', roughness: 0.68, metalness: 0 });
  boxes.push({ id: `${opening.id}-trim-right`, sourceId: opening.id, kind: 'trim', center: [inchesToScene(right.x), height / 2, inchesToScene(right.z)], size: [inchesToScene(trimWidth), height + inchesToScene(trimWidth), inchesToScene(1.5)], rotationY: rotation, color: '#F0EEE8', roughness: 0.68, metalness: 0 });
  boxes.push({ id: `${opening.id}-trim-top`, sourceId: opening.id, kind: 'trim', center: [x, height + inchesToScene(trimWidth / 2), z], size: [inchesToScene(opening.widthIn + trimWidth * 2), inchesToScene(trimWidth), inchesToScene(1.5)], rotationY: rotation, color: '#F0EEE8', roughness: 0.68, metalness: 0 });
}

function addWindowGeometry(boxes: Box3D[], opening: EditorObject, objects: EditorObject[]) {
  const pose = openingPose(opening, objects);
  const rotation = -toRadians(pose.rotation);
  const x = inchesToScene(pose.x);
  const z = inchesToScene(pose.z);
  const sill = inchesToScene(pose.sill);
  const height = inchesToScene(opening.heightIn);
  boxes.push({ id: opening.id, sourceId: opening.id, kind: 'opening', center: [x, sill + height / 2, z], size: [inchesToScene(opening.widthIn - 1), height, 0.04], rotationY: rotation, color: '#91C7DC', roughness: 0.08, metalness: 0.05 });
  boxes.push({ id: `${opening.id}-sill`, sourceId: opening.id, kind: 'trim', center: [x, sill - inchesToScene(0.5), z], size: [inchesToScene(opening.widthIn + 3), inchesToScene(1), inchesToScene(Math.max(4, pose.depth + 1))], rotationY: rotation, color: '#F0EEE8', roughness: 0.65, metalness: 0 });
}

function addCabinetDetails(boxes: Box3D[], object: EditorObject, x: number, z: number, baseY: number, rotation: number) {
  const color = object.color ?? '#D8D4CA';
  const frontZ = z - inchesToScene(object.depthIn / 2 + 0.35);
  const panelHeight = Math.max(8, object.heightIn - 3);
  const doubleDoor = object.widthIn >= 30;
  const panelWidth = doubleDoor ? object.widthIn / 2 - 0.16 : object.widthIn - 0.32;
  const centers = doubleDoor ? [-object.widthIn / 4, object.widthIn / 4] : [0];
  centers.forEach((offset, index) => boxes.push({ id: `${object.id}-door-${index}`, sourceId: object.id, kind: 'cabinet-door', center: [x + inchesToScene(offset), baseY, frontZ], size: [inchesToScene(panelWidth), inchesToScene(panelHeight), 0.035], rotationY: rotation, color: object.kind === 'glass-upper' ? '#B9D5DD' : color, roughness: object.kind === 'glass-upper' ? 0.12 : 0.42, metalness: 0.03 }));
  if (isBaseCabinetKind(object.kind) || object.kind === 'island') boxes.push({ id: `${object.id}-counter-cap`, sourceId: object.id, kind: 'countertop', center: [x, baseY + inchesToScene(object.heightIn / 2 + 0.75), z - inchesToScene(0.25)], size: [inchesToScene(object.widthIn + 1), inchesToScene(1.5), inchesToScene(object.depthIn + 1)], rotationY: rotation, color: '#E9E5DC', roughness: 0.28, metalness: 0.02 });
  if (object.kind === 'oven-cabinet') boxes.push({ id: `${object.id}-oven`, sourceId: object.id, kind: 'appliance', center: [x, baseY, z - inchesToScene(object.depthIn / 2 + 0.5)], size: [inchesToScene(Math.max(20, object.widthIn - 4)), inchesToScene(28), 0.08], rotationY: rotation, color: '#454A4A', roughness: 0.2, metalness: 0.8 });
  if (object.kind === 'refrigerator-cabinet') boxes.push({ id: `${object.id}-fridge`, sourceId: object.id, kind: 'appliance', center: [x, baseY, z - inchesToScene(object.depthIn / 2 + 0.45)], size: [inchesToScene(Math.max(28, object.widthIn - 3)), inchesToScene(Math.max(60, object.heightIn - 10)), 0.09], rotationY: rotation, color: '#A7ADAE', roughness: 0.22, metalness: 0.88 });
  if (object.hardware && object.hardware.style !== 'No Hardware') {
    const finish = HARDWARE_FINISHES.find(item => item.id === object.hardware?.finishId);
    const length = Math.min(object.widthIn * 0.42, object.hardware.size.includes('12') ? 12 : object.hardware.size.includes('10') ? 10 : 7.5);
    const horizontal = object.hardware.position !== 'Vertical';
    boxes.push({ id: `${object.id}-hardware`, sourceId: object.id, kind: 'hardware', center: [x, baseY + inchesToScene(panelHeight * 0.18), frontZ - inchesToScene(0.45)], size: horizontal ? [inchesToScene(length), 0.055, 0.055] : [0.055, inchesToScene(Math.min(length, 8)), 0.055], rotationY: rotation, color: finish?.baseColor ?? '#8B8D8C', roughness: finish?.roughness ?? 0.25, metalness: finish?.metalness ?? 0.9 });
  }
}

export function buildSceneBoxes(objects: EditorObject[]): Box3D[] {
  const boxes: Box3D[] = [{ id: 'floor', kind: 'floor', center: [5, -0.05, 5], size: [16, 0.1, 16], rotationY: 0, color: '#D8D2C7', roughness: 0.76, metalness: 0 }];
  const toeIds = new Set<string>();
  continuousToeKickRuns(objects).forEach((run, index) => {
    run.ids.forEach(id => toeIds.add(id));
    boxes.push({ id: `toe-run-${index}`, sourceId: run.ids[0], kind: 'toe-kick', center: [inchesToScene(run.x), inchesToScene(run.heightIn / 2), inchesToScene(run.y + run.recessIn)], size: [inchesToScene(run.widthIn), inchesToScene(run.heightIn), inchesToScene(Math.max(1, run.depthIn))], rotationY: -toRadians(run.rotation), color: run.color, roughness: 0.55, metalness: 0 });
  });

  for (const object of objects) {
    if (object.kind === 'wall') { boxes.push(...wallSegmentsForOpenings(object, objects)); continue; }
    if (object.kind === 'door') { addDoorGeometry(boxes, object, objects); continue; }
    if (object.kind === 'window') { addWindowGeometry(boxes, object, objects); continue; }
    const material = materialFor(object);
    const x = inchesToScene(object.x + object.widthIn / 2);
    const z = inchesToScene(object.y + object.depthIn / 2);
    const elevation = inchesToScene(object.elevationIn ?? 0);
    const rotation = -toRadians(object.rotation);
    const kind: Box3D['kind'] = object.kind === 'countertop' ? 'countertop' : object.kind === 'appliance' ? 'appliance' : 'cabinet';
    const toeLift = toeIds.has(object.id) && isBaseLike(object) ? (object.toeKick?.heightIn ?? 4) : 0;
    const baseY = elevation + inchesToScene(object.heightIn / 2 + toeLift);
    boxes.push({ id: object.id, sourceId: object.id, kind, center: [x, baseY, z], size: [inchesToScene(object.widthIn), inchesToScene(object.heightIn), inchesToScene(object.depthIn)], rotationY: rotation, color: object.color ?? '#D8D4CA', roughness: material.roughness, metalness: material.metalness });
    if (isCabinet(object)) addCabinetDetails(boxes, object, x, z, baseY, rotation);
  }
  return boxes;
}
