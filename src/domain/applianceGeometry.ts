import { EditorObject } from './editor';
import { GasRangeMaterialGroup, professionalGasRangeParts } from './gasRangeGeometry';

export type AppliancePart = {
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
  materialGroup?: GasRangeMaterialGroup;
};

const part = (
  id: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  roughness = .24,
  metalness = .8,
): AppliancePart => ({ id, offsetXIn: x, offsetYIn: y, offsetZIn: z, widthIn: w, heightIn: h, depthIn: d, color, roughness, metalness });

const identity = (object: EditorObject) => `${object.productId ?? ''} ${object.variantId ?? ''} ${object.applianceType ?? ''} ${object.finishId ?? ''} ${object.material ?? ''} ${object.name}`.toLowerCase();
const frontOf = (object: EditorObject, extra = .35) => -object.depthIn / 2 - extra;

function legacyRefrigerator(object: EditorObject): AppliancePart[] {
  const half = Math.max(10, object.widthIn / 2 - .3), front = frontOf(object), handleX = Math.min(object.widthIn * .18, 7);
  return [
    part('fridge-left-door', -object.widthIn / 4, 4, front, half, Math.max(40, object.heightIn * .82), .35, '#B9BFC0', .22, .88),
    part('fridge-right-door', object.widthIn / 4, 4, front, half, Math.max(40, object.heightIn * .82), .35, '#B9BFC0', .22, .88),
    part('fridge-freezer', 0, -object.heightIn * .37, front, Math.max(20, object.widthIn - 1), Math.max(12, object.heightIn * .22), .38, '#AEB5B6', .24, .86),
    part('fridge-handle-left', -handleX, 4, front - .75, .55, Math.min(26, object.heightIn * .38), .55, '#777E80', .18, .94),
    part('fridge-handle-right', handleX, 4, front - .75, .55, Math.min(26, object.heightIn * .38), .55, '#777E80', .18, .94),
  ];
}

function stainlessFrenchDoor(object: EditorObject): AppliancePart[] {
  const front = frontOf(object), upperBottom = -object.heightIn / 2 + 18.5, upperHeight = object.heightIn - 20.5;
  const half = Math.max(10, object.widthIn / 2 - .28), handleX = Math.min(object.widthIn * .075, 2.8);
  return [
    part('left-door', -object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#AEB6B8', .28, .94),
    part('right-door', object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#AEB6B8', .28, .94),
    part('center-gasket', 0, upperBottom + upperHeight / 2, front - .24, .20, upperHeight - 1, .18, '#17191A', .84, .05),
    part('freezer-drawer', 0, -object.heightIn / 2 + 8.8, front, object.widthIn - .55, 16.5, .44, '#A6AEB0', .3, .93),
    part('drawer-gasket', 0, upperBottom - .35, front - .24, object.widthIn - .8, .2, .18, '#17191A', .84, .05),
    part('left-handle', -handleX, 11, front - 1.08, .72, 29, .72, '#747C7E', .18, .97),
    part('right-handle', handleX, 11, front - 1.08, .72, 29, .72, '#747C7E', .18, .97),
    part('drawer-handle', 0, -object.heightIn / 2 + 14.2, front - 1.08, object.widthIn * .76, .72, .72, '#747C7E', .18, .97),
    part('dispenser-bezel', -object.widthIn * .255, 8.5, front - .62, object.widthIn * .23, 14.5, .50, '#23282A', .12, .35),
    part('dispenser-display', -object.widthIn * .255, 13.4, front - .93, object.widthIn * .19, 3.0, .22, '#91D2E7', .08, .08),
    part('dispenser-cavity', -object.widthIn * .255, 6.2, front - .95, object.widthIn * .16, 7.3, .28, '#4B5255', .38, .68),
    part('dispenser-tray', -object.widthIn * .255, 2.8, front - 1.18, object.widthIn * .16, .45, 2.3, '#70787A', .28, .88),
  ];
}

function panelReadyBuiltIn(object: EditorObject): AppliancePart[] {
  const front = frontOf(object, .30), toeHeight = 5.2, drawerHeight = 17.5, topTrim = 4.2;
  const upperBottom = -object.heightIn / 2 + toeHeight + drawerHeight + 1.0;
  const upperHeight = object.heightIn - toeHeight - drawerHeight - topTrim - 2.0;
  const half = Math.max(10, object.widthIn / 2 - .28);
  const parts: AppliancePart[] = [
    part('upper-left-panel', -object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#F1F2F1', .63, .02),
    part('upper-right-panel', object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#F1F2F1', .63, .02),
    part('lower-drawer-panel', 0, -object.heightIn / 2 + toeHeight + drawerHeight / 2 + .5, front, object.widthIn - .55, drawerHeight, .42, '#F1F2F1', .63, .02),
    part('top-trim', 0, object.heightIn / 2 - topTrim / 2 - .5, front, object.widthIn - .55, topTrim, .42, '#F1F2F1', .63, .02),
    part('vertical-handle-channel', 0, upperBottom + upperHeight / 2, front - .50, .34, upperHeight - 5, .20, '#17191A', .82, .05),
    part('drawer-handle-channel', 0, upperBottom - .5, front - .50, object.widthIn - 3, .48, .20, '#17191A', .82, .05),
    part('toe-vent-background', 0, -object.heightIn / 2 + toeHeight / 2, front - .35, object.widthIn - 2.5, toeHeight - .8, .32, '#555B5E', .42, .72),
  ];
  const rail = 1.8, inset = 1.7;
  for (const [side, x] of [['left', -object.widthIn / 4], ['right', object.widthIn / 4]] as const) {
    const panelWidth = half - inset;
    const panelHeight = upperHeight - inset * 2;
    parts.push(
      part(`${side}-frame-left`, x - panelWidth / 2 + rail / 2, upperBottom + upperHeight / 2, front - .72, rail, panelHeight, .18, '#E2E5E4', .52, .03),
      part(`${side}-frame-right`, x + panelWidth / 2 - rail / 2, upperBottom + upperHeight / 2, front - .72, rail, panelHeight, .18, '#E2E5E4', .52, .03),
      part(`${side}-frame-top`, x, upperBottom + upperHeight / 2 + panelHeight / 2 - rail / 2, front - .72, panelWidth - rail * 2, rail, .18, '#E2E5E4', .52, .03),
      part(`${side}-frame-bottom`, x, upperBottom + upperHeight / 2 - panelHeight / 2 + rail / 2, front - .72, panelWidth - rail * 2, rail, .18, '#E2E5E4', .52, .03),
    );
  }
  for (let index = 0; index < 6; index++) {
    parts.push(part(`vent-slat-${index}`, 0, -object.heightIn / 2 + 1.0 + index * .62, front - .72, object.widthIn - 3.4, .18, .16, '#858D90', .34, .85));
  }
  return parts;
}

function smartBlack(object: EditorObject): AppliancePart[] {
  const front = frontOf(object), upperBottom = -object.heightIn / 2 + 18.5, upperHeight = object.heightIn - 20.5;
  const half = Math.max(10, object.widthIn / 2 - .28), handleX = Math.min(object.widthIn * .075, 2.8);
  return [
    part('left-glass-door', -object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#111315', .08, .38),
    part('right-glass-door', object.widthIn / 4, upperBottom + upperHeight / 2, front, half, upperHeight, .42, '#111315', .08, .38),
    part('center-gasket', 0, upperBottom + upperHeight / 2, front - .24, .20, upperHeight - 1, .18, '#08090A', .88, .05),
    part('freezer-drawer', 0, -object.heightIn / 2 + 8.8, front, object.widthIn - .55, 16.5, .44, '#111315', .08, .38),
    part('drawer-gasket', 0, upperBottom - .35, front - .24, object.widthIn - .8, .2, .18, '#08090A', .88, .05),
    part('left-handle', -handleX, 11, front - 1.08, .72, 29, .72, '#202426', .30, .86),
    part('right-handle', handleX, 11, front - 1.08, .72, 29, .72, '#202426', .30, .86),
    part('drawer-handle', 0, -object.heightIn / 2 + 14.2, front - 1.08, object.widthIn * .76, .72, .72, '#202426', .30, .86),
    part('screen-bezel', object.widthIn * .245, 9.5, front - .66, object.widthIn * .235, 19, .52, '#070809', .10, .24),
    part('smart-screen', object.widthIn * .245, 9.5, front - .96, object.widthIn * .195, 17, .20, '#4FC2D5', .05, .06),
    part('screen-header', object.widthIn * .245, 15.8, front - 1.08, object.widthIn * .16, 2.0, .10, '#E9F2F4', .04, .02),
    part('screen-tile-1', object.widthIn * .21, 10.8, front - 1.08, object.widthIn * .065, 3.2, .10, '#49A88B', .18, .02),
    part('screen-tile-2', object.widthIn * .28, 10.8, front - 1.08, object.widthIn * .065, 3.2, .10, '#E8A43A', .18, .02),
    part('screen-note', object.widthIn * .245, 5.8, front - 1.08, object.widthIn * .15, 4.3, .10, '#EED77F', .32, .02),
  ];
}

function retroBlue(object: EditorObject): AppliancePart[] {
  const front = frontOf(object, .28), upperHeight = Math.max(15, object.heightIn * .28), separatorY = object.heightIn / 2 - upperHeight - 1.0;
  const lowerHeight = object.heightIn - upperHeight - 3.3;
  return [
    part('lower-door', 0, -object.heightIn / 2 + 1.5 + lowerHeight / 2, front, object.widthIn - .45, lowerHeight, .44, '#9FCBE4', .24, .08),
    part('upper-freezer-door', 0, object.heightIn / 2 - upperHeight / 2 - .7, front, object.widthIn - .45, upperHeight, .44, '#9FCBE4', .24, .08),
    part('chrome-separator', 0, separatorY, front - .48, object.widthIn - 1.0, .45, .36, '#D9DEE0', .09, 1),
    part('chrome-plinth', 0, -object.heightIn / 2 + .9, front - .50, object.widthIn - 1.2, 1.1, .38, '#D9DEE0', .09, 1),
    part('upper-handle', -object.widthIn * .22, object.heightIn / 2 - upperHeight * .58, front - 1.08, object.widthIn * .30, .72, .72, '#D9DEE0', .09, 1),
    part('lower-handle', -object.widthIn * .22, -object.heightIn * .03, front - 1.08, object.widthIn * .30, .72, .72, '#D9DEE0', .09, 1),
    part('badge', 0, object.heightIn / 2 - 6.2, front - .95, 2.8, 1.0, .20, '#D9DEE0', .09, 1),
  ];
}

export function applianceDetailGeometry(object: EditorObject): AppliancePart[] {
  if (object.kind !== 'appliance') return [];
  const key = identity(object);
  if (object.applianceType === 'gas-range' || key.includes('gas-range') || key.includes('gas range')) return professionalGasRangeParts(object);
  if (key.includes('refrigerator-panel-ready-built-in') || key.includes('panel ready') || key.includes('panel-ready')) return panelReadyBuiltIn(object);
  if (key.includes('refrigerator-smart-black') || key.includes('smart refrigerator') || key.includes('black glass')) return smartBlack(object);
  if (key.includes('refrigerator-retro-blue') || key.includes('retro') || key.includes('pastel blue')) return retroBlue(object);
  if (key.includes('refrigerator-french-door-stainless') || key.includes('french-door') || key.includes('french door')) return stainlessFrenchDoor(object);
  if (key.includes('refrigerator') || key.includes('fridge')) return legacyRefrigerator(object);
  if (key.includes('range') || key.includes('stove') || key.includes('oven')) {
    const front = frontOf(object);
    return [
      part('range-oven-door', 0, -object.heightIn * .08, front, Math.max(20, object.widthIn - 2), Math.max(16, object.heightIn * .48), .42, '#272B2C', .16, .62),
      part('range-control', 0, object.heightIn * .32, front, Math.max(20, object.widthIn - 1), 5, .5, '#555B5C', .2, .82),
      part('range-handle', 0, object.heightIn * .14, front - .85, Math.max(16, object.widthIn * .72), .65, .65, '#8C9394', .18, .93),
      part('range-cooktop', 0, object.heightIn / 2 + .15, 0, Math.max(20, object.widthIn), .25, Math.max(18, object.depthIn * .82), '#242829', .12, .48),
    ];
  }
  if (key.includes('dishwasher')) {
    const front = frontOf(object, .30);
    return [
      part('dishwasher-front', 0, 0, front, Math.max(18, object.widthIn - 1), Math.max(24, object.heightIn - 1), .4, '#AEB5B6', .23, .88),
      part('dishwasher-handle', 0, object.heightIn * .36, front - .7, Math.max(10, object.widthIn * .65), .55, .55, '#737A7C', .18, .94),
    ];
  }
  return [];
}
