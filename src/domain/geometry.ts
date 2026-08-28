import { EditorObject } from './editor';

export type Box3D = {
  id: string;
  sourceId?: string;
  kind: 'wall' | 'cabinet' | 'countertop' | 'toe-kick' | 'hardware' | 'opening' | 'appliance' | 'floor';
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
      const start = current[0];
      const end = current[current.length - 1];
      const startAxis = horizontal ? start.x : start.y;
      const endAxis = (horizontal ? end.x : end.y) + end.widthIn;
      const span = Math.max(start.widthIn, endAxis - startAxis);
      runs.push({
        ids: current.map(o => o.id),
        x: horizontal ? startAxis + span / 2 : start.x,
        y: horizontal ? start.y : startAxis + span / 2,
        widthIn: span,
        depthIn: Math.max(...current.map(o => Math.max(1, o.depthIn - (o.toeKick?.recessIn ?? 3)))),
        rotation,
        heightIn: Math.max(...current.map(o => o.toeKick?.heightIn ?? 4)),
        recessIn: Math.max(...current.map(o => o.toeKick?.recessIn ?? 3)),
        color: start.toeKick?.color ?? start.color ?? '#E8E3D8',
      });
      current = [];
    };

    for (const cabinet of group) {
      if (!current.length) { current.push(cabinet); continue; }
      const prev = current[current.length - 1];
      const prevEnd = (horizontal ? prev.x : prev.y) + prev.widthIn;
      const nextStart = horizontal ? cabinet.x : cabinet.y;
      if (Math.abs(nextStart - prevEnd) <= toleranceIn) current.push(cabinet);
      else { flush(); current.push(cabinet); }
    }
    flush();
  }
  return runs;
}

function materialFor(o: EditorObject) {
  const name = (o.material ?? '').toLowerCase();
  const metallic = name.includes('stainless') || name.includes('metal') || name.includes('chrome');
  const matte = (o.finishId ?? '').toLowerCase().includes('matte');
  return { metalness: metallic ? 0.85 : 0.05, roughness: matte ? 0.8 : metallic ? 0.28 : 0.48 };
}

export function buildSceneBoxes(objects: EditorObject[]): Box3D[] {
  const boxes: Box3D[] = [{ id: 'floor', kind: 'floor', center: [5, -0.05, 5], size: [16, 0.1, 16], rotationY: 0, color: '#D8D2C7', roughness: 0.75, metalness: 0 }];
  const toeIds = new Set<string>();
  continuousToeKickRuns(objects).forEach((run, index) => {
    run.ids.forEach(id => toeIds.add(id));
    boxes.push({
      id: `toe-run-${index}`,
      sourceId: run.ids[0],
      kind: 'toe-kick',
      center: [inchesToScene(run.x), inchesToScene(run.heightIn / 2), inchesToScene(run.y + run.recessIn)],
      size: [inchesToScene(run.widthIn), inchesToScene(run.heightIn), inchesToScene(Math.max(1, run.depthIn))],
      rotationY: -toRadians(run.rotation), color: run.color, roughness: 0.55, metalness: 0,
    });
  });

  for (const o of objects) {
    const mat = materialFor(o);
    const x = inchesToScene(o.x + o.widthIn / 2);
    const z = inchesToScene(o.y + o.depthIn / 2);
    const elevation = inchesToScene(o.elevationIn ?? 0);
    const rot = -toRadians(o.rotation);

    if (o.kind === 'wall') {
      boxes.push({ id:o.id, sourceId:o.id, kind:'wall', center:[x,inchesToScene(o.heightIn/2),z], size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(Math.max(2,o.depthIn))], rotationY:rot, color:o.color ?? '#F4F1E9', roughness:0.9, metalness:0 });
      continue;
    }
    if (o.kind === 'door' || o.kind === 'window') {
      boxes.push({ id:o.id, sourceId:o.id, kind:'opening', center:[x,elevation+inchesToScene(o.heightIn/2),z], size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(Math.max(1,o.depthIn))], rotationY:rot, color:o.kind==='window'?'#9CC8D8':'#8B684F', roughness:0.4, metalness:0.05 });
      continue;
    }
    const kind: Box3D['kind'] = o.kind === 'countertop' ? 'countertop' : o.kind === 'appliance' ? 'appliance' : 'cabinet';
    const baseY = elevation + inchesToScene(o.heightIn/2 + (toeIds.has(o.id) && isBaseLike(o) ? (o.toeKick?.heightIn ?? 4) : 0));
    boxes.push({ id:o.id, sourceId:o.id, kind, center:[x,baseY,z], size:[inchesToScene(o.widthIn),inchesToScene(o.heightIn),inchesToScene(o.depthIn)], rotationY:rot, color:o.color ?? '#D8D4CA', roughness:mat.roughness, metalness:mat.metalness });

    if ((o.kind.includes('cabinet') || o.kind === 'island') && o.hardware && o.hardware.style !== 'No Hardware') {
      boxes.push({ id:`${o.id}-hardware`, sourceId:o.id, kind:'hardware', center:[x,baseY,z-inchesToScene(o.depthIn/2+0.5)], size:[inchesToScene(Math.min(o.widthIn*0.5,10)),0.06,0.06], rotationY:rot, color:'#8B8D8C', roughness:0.25, metalness:0.9 });
    }
  }
  return boxes;
}
