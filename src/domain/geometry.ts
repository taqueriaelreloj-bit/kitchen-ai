import { HARDWARE_FINISHES } from './catalogs';
import { EditorObject } from './editor';

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
const isBaseLike = (o: EditorObject) => o.kind === 'base-cabinet' || o.kind === 'island';
const isCabinet = (o: EditorObject) => o.kind === 'base-cabinet' || o.kind === 'wall-cabinet' || o.kind === 'island';

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
  const candidates = objects.filter(o => isBaseLike(o) && o.toeKick?.enabled);
  const used = new Set<string>();
  const runs: ToeKickRun[] = [];
  for (const first of candidates) {
    if (used.has(first.id)) continue;
    const rotation = ((first.rotation % 360) + 360) % 360;
    const horizontal = Math.abs(rotation % 180) < 1;
    const group = candidates
      .filter(o => !used.has(o.id) && Math.abs((((o.rotation % 360) + 360) % 360) - rotation) < 1)
      .filter(o => horizontal ? Math.abs(o.y - first.y) <= toleranceIn : Math.abs(o.x - first.x) <= toleranceIn)
      .sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
    let current: EditorObject[] = [];
    const flush = () => {
      if (!current.length) return;
      current.forEach(o => used.add(o.id));
      const start = current[0], end = current[current.length - 1];
      const startAxis = horizontal ? start.x : start.y;
      const endAxis = (horizontal ? end.x : end.y) + end.widthIn;
      const span = Math.max(start.widthIn, endAxis - startAxis);
      runs.push({ ids: current.map(o => o.id), x: horizontal ? startAxis + span / 2 : start.x, y: horizontal ? start.y : startAxis + span / 2, widthIn: span, depthIn: Math.max(...current.map(o => Math.max(1, o.depthIn - (o.toeKick?.recessIn ?? 3)))), rotation, heightIn: Math.max(...current.map(o => o.toeKick?.heightIn ?? 4)), recessIn: Math.max(...current.map(o => o.toeKick?.recessIn ?? 3)), color: start.toeKick?.color ?? start.color ?? '#E8E3D8' });
      current = [];
    };
    for (const cabinet of group) {
      if (!current.length) { current.push(cabinet); continue; }
      const prev = current[current.length - 1], prevEnd = (horizontal ? prev.x : prev.y) + prev.widthIn, nextStart = horizontal ? cabinet.x : cabinet.y;
      if (Math.abs(nextStart - prevEnd) <= toleranceIn) current.push(cabinet); else { flush(); current.push(cabinet); }
    }
    flush();
  }
  return runs;
}

function materialFor(o: EditorObject) {
  const name = (o.material ?? '').toLowerCase();
  const finish = (o.finishId ?? '').toLowerCase();
  const metallic = name.includes('stainless') || name.includes('metal') || name.includes('chrome');
  const matte = finish.includes('matte');
  const gloss = finish.includes('gloss');
  return { metalness: metallic ? 0.85 : 0.04, roughness: matte ? 0.82 : gloss ? 0.22 : metallic ? 0.3 : 0.46 };
}

function addCabinetDetails(boxes: Box3D[], o: EditorObject, x: number, z: number, baseY: number, rot: number) {
  const color = o.color ?? '#D8D4CA';
  const frontZ = z - inchesToScene(o.depthIn / 2 + 0.35);
  const doorGap = 0.16;
  const panelHeight = Math.max(8, o.heightIn - 3);
  const doubleDoor = o.widthIn >= 30;
  const panelWidth = doubleDoor ? o.widthIn / 2 - doorGap : o.widthIn - doorGap * 2;
  const centers = doubleDoor ? [-o.widthIn / 4, o.widthIn / 4] : [0];
  centers.forEach((offset, index) => boxes.push({ id:`${o.id}-door-${index}`, sourceId:o.id, kind:'cabinet-door', center:[x+inchesToScene(offset),baseY,frontZ], size:[inchesToScene(panelWidth),inchesToScene(panelHeight),0.035], rotationY:rot, color, roughness:0.42, metalness:0.03 }));

  if (isBaseLike(o)) boxes.push({ id:`${o.id}-counter-cap`, sourceId:o.id, kind:'countertop', center:[x,baseY+inchesToScene(o.heightIn/2+0.75),z-inchesToScene(0.25)], size:[inchesToScene(o.widthIn+1),inchesToScene(1.5),inchesToScene(o.depthIn+1)], rotationY:rot, color:'#E9E5DC', roughness:0.28, metalness:0.02 });

  if (o.hardware && o.hardware.style !== 'No Hardware') {
    const finish = HARDWARE_FINISHES.find(f => f.id === o.hardware?.finishId);
    const hwColor = finish?.baseColor ?? '#8B8D8C';
    const horizontal = o.hardware.position !== 'Vertical';
    const length = Math.min(o.widthIn * 0.42, o.hardware.size.includes('12') ? 12 : o.hardware.size.includes('10') ? 10 : 7.5);
    const y = baseY + inchesToScene(panelHeight * 0.18);
    boxes.push({ id:`${o.id}-hardware`, sourceId:o.id, kind:'hardware', center:[x,y,frontZ-inchesToScene(0.45)], size:horizontal?[inchesToScene(length),0.055,0.055]:[0.055,inchesToScene(Math.min(length,8)),0.055], rotationY:rot, color:hwColor, roughness:finish?.roughness ?? 0.25, metalness:finish?.metalness ?? 0.9 });
  }
}

export function buildSceneBoxes(objects: EditorObject[]): Box3D[] {
  const boxes: Box3D[] = [{ id:'floor', kind:'floor', center:[5,-0.05,5], size:[16,0.1,16], rotationY:0, color:'#D8D2C7', roughness:0.76, metalness:0 }];
  const toeIds = new Set<string>();
  continuousToeKickRuns(objects).forEach((run,index)=>{run.ids.forEach(id=>toeIds.add(id));boxes.push({id:`toe-run-${index}`,sourceId:run.ids[0],kind:'toe-kick',center:[inchesToScene(run.x),inchesToScene(run.heightIn/2),inchesToScene(run.y+run.recessIn)],size:[inchesToScene(run.widthIn),inchesToScene(run.heightIn),inchesToScene(Math.max(1,run.depthIn))],rotationY:-toRadians(run.rotation),color:run.color,roughness:0.55,metalness:0});});

  for (const o of objects) {
    const mat=materialFor(o),x=inchesToScene(o.x+o.widthIn/2),z=inchesToScene(o.y+o.depthIn/2),elevation=inchesToScene(o.elevationIn??0),rot=-toRadians(o.rotation);
    if (o.kind==='wall') { boxes.push({id:o.id,sourceId:o.id,kind:'wall',center:[x,inchesToScene(o.heightIn/2),z],size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(Math.max(2,o.depthIn))],rotationY:rot,color:o.color??'#F4F1E9',roughness:0.92,metalness:0}); continue; }
    if (o.kind==='door') { boxes.push({id:o.id,sourceId:o.id,kind:'opening',center:[x,elevation+inchesToScene(o.heightIn/2),z],size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(1.25)],rotationY:rot,color:'#8A664B',roughness:0.52,metalness:0.02}); boxes.push({id:`${o.id}-trim`,sourceId:o.id,kind:'trim',center:[x,elevation+inchesToScene(o.heightIn/2),z-inchesToScene(0.9)],size:[inchesToScene(o.widthIn+4),inchesToScene(o.heightIn+4),0.035],rotationY:rot,color:'#F4F1E9',roughness:0.7,metalness:0}); continue; }
    if (o.kind==='window') { boxes.push({id:o.id,sourceId:o.id,kind:'opening',center:[x,elevation+inchesToScene(o.heightIn/2),z],size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),0.04],rotationY:rot,color:'#91C7DC',roughness:0.08,metalness:0.05}); boxes.push({id:`${o.id}-sill`,sourceId:o.id,kind:'trim',center:[x,elevation-inchesToScene(0.5),z],size:[inchesToScene(o.widthIn+3),inchesToScene(1),inchesToScene(4)],rotationY:rot,color:'#F0EEE8',roughness:0.65,metalness:0}); continue; }
    const kind:Box3D['kind']=o.kind==='countertop'?'countertop':o.kind==='appliance'?'appliance':'cabinet';
    const toeLift=toeIds.has(o.id)&&isBaseLike(o)?(o.toeKick?.heightIn??4):0;
    const baseY=elevation+inchesToScene(o.heightIn/2+toeLift);
    boxes.push({id:o.id,sourceId:o.id,kind,center:[x,baseY,z],size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(o.depthIn)],rotationY:rot,color:o.color??'#D8D4CA',roughness:mat.roughness,metalness:mat.metalness});
    if (isCabinet(o)) addCabinetDetails(boxes,o,x,z,baseY,rot);
  }
  return boxes;
}
