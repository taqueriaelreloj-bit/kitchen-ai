import { gasRangeById, gasRangeFinishById, GasRangeOvenType } from './applianceCatalog';
import { EditorObject } from './editor';

export type GasRangeMaterialGroup = 'body' | 'stainless-trim' | 'grate' | 'burner' | 'griddle' | 'glass' | 'interior';
export type GasRangePart = {
  id: string;
  offsetXIn: number;
  offsetYIn: number;
  offsetZIn: number;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  color: string;
  roughness: number;
  metalness: number;
  materialGroup: GasRangeMaterialGroup;
};

type RangeSpec = {
  hasGriddle: boolean;
  hasGriddleHandle: boolean;
  knobCount: number;
  ovenType: GasRangeOvenType;
  ovenDoorCount: number;
};

const fixed = {
  trim: { color: '#A6AEB0', roughness: .22, metalness: .94 },
  darkTrim: { color: '#60686A', roughness: .28, metalness: .82 },
  grate: { color: '#171A1B', roughness: .78, metalness: .24 },
  brass: { color: '#B08A48', roughness: .3, metalness: .82 },
  griddle: { color: '#34393A', roughness: .72, metalness: .38 },
  glass: { color: '#15191A', roughness: .08, metalness: .38 },
  interior: { color: '#292D2E', roughness: .72, metalness: .12 },
};

function rangePart(
  id: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  group: GasRangeMaterialGroup,
  color: string,
  roughness: number,
  metalness: number,
): GasRangePart {
  return { id, offsetXIn: x, offsetYIn: y, offsetZIn: z, widthIn: width, heightIn: height, depthIn: depth, materialGroup: group, color, roughness, metalness };
}

function specFor(object: EditorObject): RangeSpec {
  const catalog = gasRangeById(object.productId ?? object.variantId);
  const hasGriddle = object.hasCenterGriddle ?? catalog?.hasCenterGriddle ?? object.widthIn >= 36;
  const ovenType = object.ovenType ?? catalog?.ovenType ?? (object.widthIn === 36 ? 'double-side-by-side' : object.widthIn >= 42 ? 'single-wide' : 'single');
  return {
    hasGriddle,
    hasGriddleHandle: object.griddleHandle ?? catalog?.griddleHandle ?? hasGriddle,
    knobCount: object.knobCount ?? catalog?.knobCount ?? (hasGriddle ? 5 : 4),
    ovenType,
    ovenDoorCount: object.ovenDoorCount ?? catalog?.ovenDoorCount ?? (ovenType === 'double-side-by-side' ? 2 : 1),
  };
}

function addBurner(parts: GasRangePart[], index: number, x: number, z: number, top: number) {
  const grate = fixed.grate, brass = fixed.brass;
  parts.push(
    rangePart(`burner-${index}-well`, x, top + .18, z, 5.5, .28, 5.5, 'burner', '#303536', .56, .38),
    rangePart(`burner-${index}-brass`, x, top + .42, z, 2.45, .3, 2.45, 'burner', brass.color, brass.roughness, brass.metalness),
    rangePart(`burner-${index}-cap`, x, top + .61, z, 1.65, .22, 1.65, 'burner', '#202425', .62, .35),
    rangePart(`burner-${index}-grate-x`, x, top + .82, z, 7.0, .42, .72, 'grate', grate.color, grate.roughness, grate.metalness),
    rangePart(`burner-${index}-grate-z`, x, top + .82, z, .72, .42, 7.0, 'grate', grate.color, grate.roughness, grate.metalness),
    rangePart(`burner-${index}-grate-left`, x - 2.6, top + .72, z, .48, .52, 5.6, 'grate', grate.color, grate.roughness, grate.metalness),
    rangePart(`burner-${index}-grate-right`, x + 2.6, top + .72, z, .48, .52, 5.6, 'grate', grate.color, grate.roughness, grate.metalness),
  );
}

function addKnob(parts: GasRangePart[], id: string, x: number, front: number, bodyY: number, griddle = false) {
  const trim = fixed.trim, dark = fixed.darkTrim;
  parts.push(
    rangePart(`${id}-ring`, x, bodyY, front - .33, 2.25, 2.25, .34, 'stainless-trim', dark.color, dark.roughness, dark.metalness),
    rangePart(id, x, bodyY, front - .78, 1.62, 1.62, .82, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
    rangePart(`${id}-indicator`, x, bodyY + .72, front - 1.22, .18, .46, .18, 'stainless-trim', '#202425', .42, .42),
  );
  if (griddle) parts.push(rangePart('griddle-label', x, bodyY - 1.35, front - .58, 3.4, .34, .18, 'stainless-trim', '#1E2423', .55, .2));
}

function addOvenDoor(parts: GasRangePart[], id: string, x: number, width: number, front: number, bodyColor: string, bodyRoughness: number, bodyMetalness: number) {
  const trim = fixed.trim, glass = fixed.glass, interior = fixed.interior;
  parts.push(
    rangePart(`${id}-body`, x, -3.0, front - .08, width, 22.5, .48, 'body', bodyColor, bodyRoughness, bodyMetalness),
    rangePart(`${id}-interior`, x, -3.2, front - .34, Math.max(8, width - 4.2), 13.4, .24, 'interior', interior.color, interior.roughness, interior.metalness),
    rangePart(`${id}-glass`, x, -2.8, front - .62, Math.max(8, width - 4.8), 12.7, .24, 'glass', glass.color, glass.roughness, glass.metalness),
    rangePart(`${id}-glass-top`, x, 3.8, front - .78, Math.max(8, width - 4.4), .38, .32, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
    rangePart(`${id}-glass-bottom`, x, -9.4, front - .78, Math.max(8, width - 4.4), .38, .32, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
    rangePart(`${id}-handle`, x, 7.3, front - 1.28, Math.max(8, width * .78), .72, .72, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
    rangePart(`${id}-handle-left-support`, x - width * .36, 7.3, front - .9, .72, 1.4, .72, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
    rangePart(`${id}-handle-right-support`, x + width * .36, 7.3, front - .9, .72, 1.4, .72, 'stainless-trim', trim.color, trim.roughness, trim.metalness),
  );
  for (let rack = 0; rack < 3; rack++) {
    parts.push(rangePart(`${id}-rack-${rack}`, x, -7.1 + rack * 4.0, front - .86, Math.max(7, width - 6.3), .18, .18, 'interior', '#AEB3B4', .34, .72));
  }
}

export function professionalGasRangeParts(object: EditorObject): GasRangePart[] {
  const spec = specFor(object);
  const finish = gasRangeFinishById(object.finishId);
  const bodyColor = object.color ?? finish.color;
  const bodyRoughness = finish.roughness;
  const bodyMetalness = finish.metalness;
  const width = object.widthIn;
  const depth = object.depthIn;
  const height = object.heightIn;
  const front = -depth / 2 - .34;
  const top = height / 2 - .35;
  const parts: GasRangePart[] = [];

  parts.push(
    rangePart('body-front-panel', 0, 10.4, front, width - .8, 8.2, .52, 'body', bodyColor, bodyRoughness, bodyMetalness),
    rangePart('body-plinth', 0, -15.8, front + .1, width - .8, 2.2, .58, 'body', bodyColor, bodyRoughness, bodyMetalness),
    rangePart('cooktop-rim', 0, top, 0, width, .55, depth - .8, 'body', bodyColor, bodyRoughness, bodyMetalness),
    rangePart('backguard', 0, top + 2.1, depth / 2 - .7, width - .8, 4.0, .65, 'body', bodyColor, bodyRoughness, bodyMetalness),
  );

  for (let vent = 0; vent < 11; vent++) {
    const ventWidth = (width - 5) / 11;
    parts.push(rangePart(`backguard-vent-${vent}`, -width / 2 + 2.5 + ventWidth * (vent + .5), top + 2.15, depth / 2 - 1.08, Math.max(.45, ventWidth * .42), .34, .18, 'grate', fixed.grate.color, fixed.grate.roughness, fixed.grate.metalness));
  }

  const burnerX = spec.hasGriddle ? width * .34 : width * .25;
  const burnerZ = depth * .22;
  addBurner(parts, 1, -burnerX, -burnerZ, top);
  addBurner(parts, 2, -burnerX, burnerZ, top);
  addBurner(parts, 3, burnerX, -burnerZ, top);
  addBurner(parts, 4, burnerX, burnerZ, top);

  if (spec.hasGriddle) {
    const griddleWidth = Math.max(8.5, width * .26);
    const griddleDepth = depth * .66;
    parts.push(
      rangePart('center-griddle', 0, top + .55, 0, griddleWidth, .52, griddleDepth, 'griddle', fixed.griddle.color, fixed.griddle.roughness, fixed.griddle.metalness),
      rangePart('center-griddle-left-rail', -griddleWidth / 2, top + .72, 0, .42, .48, griddleDepth, 'grate', fixed.grate.color, fixed.grate.roughness, fixed.grate.metalness),
      rangePart('center-griddle-right-rail', griddleWidth / 2, top + .72, 0, .42, .48, griddleDepth, 'grate', fixed.grate.color, fixed.grate.roughness, fixed.grate.metalness),
    );
    if (spec.hasGriddleHandle) {
      const handleZ = -griddleDepth / 2 - .58;
      parts.push(
        rangePart('griddle-handle', 0, top + .88, handleZ, griddleWidth * .58, .62, .62, 'stainless-trim', fixed.trim.color, fixed.trim.roughness, fixed.trim.metalness),
        rangePart('griddle-handle-left-support', -griddleWidth * .26, top + .72, handleZ + .25, .55, .74, .55, 'stainless-trim', fixed.trim.color, fixed.trim.roughness, fixed.trim.metalness),
        rangePart('griddle-handle-right-support', griddleWidth * .26, top + .72, handleZ + .25, .55, .74, .55, 'stainless-trim', fixed.trim.color, fixed.trim.roughness, fixed.trim.metalness),
      );
    }
  }

  const knobY = 11.1;
  if (spec.knobCount === 5) {
    const positions = [-width * .35, -width * .175, 0, width * .175, width * .35];
    addKnob(parts, 'knob-burner-1', positions[0], front, knobY);
    addKnob(parts, 'knob-burner-2', positions[1], front, knobY);
    addKnob(parts, 'knob-griddle', positions[2], front, knobY, true);
    addKnob(parts, 'knob-burner-3', positions[3], front, knobY);
    addKnob(parts, 'knob-burner-4', positions[4], front, knobY);
  } else {
    const positions = [-width * .31, -width * .105, width * .105, width * .31];
    positions.forEach((x, index) => addKnob(parts, `knob-burner-${index + 1}`, x, front, knobY));
  }

  if (spec.ovenDoorCount === 2 || spec.ovenType === 'double-side-by-side') {
    const doorWidth = (width - 1.6) / 2;
    addOvenDoor(parts, 'oven-door-left', -width / 4, doorWidth, front, bodyColor, bodyRoughness, bodyMetalness);
    addOvenDoor(parts, 'oven-door-right', width / 4, doorWidth, front, bodyColor, bodyRoughness, bodyMetalness);
    parts.push(rangePart('oven-center-seam', 0, -3.0, front - .72, .34, 22.2, .28, 'stainless-trim', fixed.darkTrim.color, fixed.darkTrim.roughness, fixed.darkTrim.metalness));
  } else {
    addOvenDoor(parts, 'oven-door-wide', 0, width - 1.2, front, bodyColor, bodyRoughness, bodyMetalness);
  }

  const legX = width / 2 - 2.0, legZ = depth / 2 - 2.1;
  for (const [id, x, z] of [
    ['front-left', -legX, -legZ], ['front-right', legX, -legZ], ['rear-left', -legX, legZ], ['rear-right', legX, legZ],
  ] as const) parts.push(rangePart(`leveling-leg-${id}`, x, -17.2, z, 1.25, 2.1, 1.25, 'stainless-trim', fixed.darkTrim.color, fixed.darkTrim.roughness, fixed.darkTrim.metalness));

  parts.push(
    rangePart('kitchen-ai-badge', 0, -13.25, front - .84, 5.6, 1.0, .24, 'stainless-trim', '#202526', .34, .52),
    rangePart('kitchen-ai-badge-inset', 0, -13.25, front - 1.0, 4.7, .42, .12, 'stainless-trim', '#D6DADB', .18, .86),
  );
  return parts;
}
