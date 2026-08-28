import { applyCabinetFinish, applyHardware, isBaseCabinetKind, isTallCabinetKind, isWallCabinetKind, objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));

describe('Professional cabinet families', () => {
  test('creates correct standard dimensions for cabinet types', () => {
    expect(objectDefaults('sink-base').widthIn).toBe(36);
    expect(objectDefaults('drawer-base').widthIn).toBe(30);
    expect(objectDefaults('pantry-cabinet').heightIn).toBe(84);
    expect(objectDefaults('oven-cabinet').widthIn).toBe(30);
    expect(objectDefaults('refrigerator-cabinet').widthIn).toBe(36);
    expect(objectDefaults('glass-upper').elevationIn).toBe(54);
  });

  test('wall cabinet families never have a toe kick', () => {
    expect(objectDefaults('wall-cabinet').toeKick).toBeUndefined();
    expect(objectDefaults('glass-upper').toeKick).toBeUndefined();
  });

  test('base and tall families are classified for bulk application', () => {
    expect(isBaseCabinetKind('drawer-base')).toBe(true);
    expect(isTallCabinetKind('pantry-cabinet')).toBe(true);
    expect(isWallCabinetKind('glass-upper')).toBe(true);
  });

  test('bulk base finish and hardware include tall cabinetry but exclude uppers', () => {
    const room = reconstructRoom(photos); const design = generateDesigns(room)[0];
    const pantry = objectDefaults('pantry-cabinet',{id:'pantry'});
    const upper = objectDefaults('glass-upper',{id:'glass'});
    const project = { ...require('../domain/editor').createEditorProject(room,design), objects:[pantry,upper] };
    const finish = applyCabinetFinish(project, 'cab-painted-black', 'base');
    const hardware = applyHardware(finish, { style:'T-Bar Pull' }, 'base');
    expect(hardware.objects.find(o=>o.id==='pantry')?.hardware?.style).toBe('T-Bar Pull');
    expect(hardware.objects.find(o=>o.id==='glass')?.hardware?.style).not.toBe('T-Bar Pull');
  });

  test('oven and refrigerator cabinets create dedicated appliance geometry', () => {
    const boxes = buildSceneBoxes([objectDefaults('oven-cabinet',{id:'oven'}),objectDefaults('refrigerator-cabinet',{id:'fridge'})]);
    expect(boxes.some(x=>x.id==='oven-oven'&&x.kind==='appliance')).toBe(true);
    expect(boxes.some(x=>x.id==='fridge-fridge'&&x.kind==='appliance')).toBe(true);
  });
});
