import { generateDesigns } from '../domain/design';
import {
  applyHardware,
  createEditorProject,
  duplicateObject,
  migrateProject,
  normalizeCabinetHardware,
  objectDefaults,
} from '../domain/editor';
import { hardwareGeometry } from '../domain/hardwareGeometry';
import { projectScheduleCsv } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({ uri: `hardware-${index}`, angle, capturedAt: '2026-08-28T00:00:00.000Z' }));
const room = reconstructRoom(photos);
const design = generateDesigns(room)[0];

describe('custom cabinet hardware', () => {
  test('normalizes unsafe custom values and preserves standard fields', () => {
    const hardware = normalizeCabinetHardware({ style: 'Cup Pull', size: 'Custom Size', customSizeIn: 999, customOffsetXIn: Number.NaN, customOffsetYIn: -999 });
    expect(hardware.style).toBe('Cup Pull');
    expect(hardware.customSizeIn).toBe(36);
    expect(hardware.customOffsetXIn).toBe(0);
    expect(hardware.customOffsetYIn).toBe(-96);
  });

  test('migrates older saved cabinets with safe custom defaults', () => {
    const source = createEditorProject(room, design);
    const raw = JSON.parse(JSON.stringify(source));
    raw.objects[2].hardware = { style: 'Bar Pull', size: '5 inches', finishId: 'brushed-nickel', position: 'Center' };
    const migrated = migrateProject(raw)!;
    const hardware = migrated.objects.find(object => object.id === 'base-1')?.hardware;
    expect(hardware?.customSizeIn).toBe(5);
    expect(hardware?.customOffsetXIn).toBe(0);
    expect(hardware?.customOffsetYIn).toBe(0);
  });

  test('applies and duplicates custom hardware without sharing references', () => {
    let project = createEditorProject(room, design);
    project = { ...project, selectedId: 'base-1' };
    project = applyHardware(project, { size: 'Custom Size', customSizeIn: 8.25, position: 'Custom Position', customOffsetXIn: 3.5, customOffsetYIn: -4 }, 'selected');
    const hardware = project.objects.find(object => object.id === 'base-1')?.hardware;
    expect(hardware).toMatchObject({ size: 'Custom Size', customSizeIn: 8.25, position: 'Custom Position', customOffsetXIn: 3.5, customOffsetYIn: -4 });
    const duplicated = duplicateObject(project, 'base-1');
    const copy = duplicated.objects.find(object => object.id === duplicated.selectedId)!;
    expect(copy.hardware).toEqual(hardware);
    expect(copy.hardware).not.toBe(hardware);
  });

  test('custom values survive a JSON save/load round trip', () => {
    let project = createEditorProject(room, design);
    project = { ...project, selectedId: 'base-1' };
    project = applyHardware(project, { style: 'T-Bar Pull', size: 'Custom Size', customSizeIn: 11.75, position: 'Custom Position', customOffsetXIn: -2.5, customOffsetYIn: 7 }, 'selected');
    const restored = migrateProject(JSON.parse(JSON.stringify(project)))!;
    expect(restored.objects.find(object => object.id === 'base-1')?.hardware).toMatchObject({ customSizeIn: 11.75, customOffsetXIn: -2.5, customOffsetYIn: 7 });
  });

  test('custom size controls the rendered pull length', () => {
    const object = objectDefaults('base-cabinet', { widthIn: 36, hardware: { style: 'Bar Pull', size: 'Custom Size', finishId: 'brushed-nickel', position: 'Horizontal', customSizeIn: 9.25 } });
    const geometry = hardwareGeometry(object)!;
    expect(geometry.parts.find(part => part.id === 'bar')?.widthIn).toBeCloseTo(9.25, 5);
  });

  test('vertical custom pulls use cabinet height as the maximum span', () => {
    const object = objectDefaults('tall-cabinet', { widthIn: 12, heightIn: 84, hardware: { style: 'Bar Pull', size: 'Custom Size', finishId: 'brushed-nickel', position: 'Vertical', customSizeIn: 30 } });
    const geometry = hardwareGeometry(object)!;
    expect(geometry.parts.find(part => part.id === 'bar')?.heightIn).toBe(30);
  });

  test('custom position offsets every generated part and clamps inside the front', () => {
    const centered = objectDefaults('base-cabinet', { widthIn: 30, heightIn: 34.5, hardware: { style: 'Bar Pull', size: '5 inches', finishId: 'brushed-nickel', position: 'Custom Position', customOffsetXIn: 4, customOffsetYIn: -6 } });
    const geometry = hardwareGeometry(centered)!;
    expect(geometry.parts.find(part => part.id === 'bar')).toMatchObject({ offsetXIn: 4, offsetYIn: -6 });
    const clamped = objectDefaults('base-cabinet', { widthIn: 10, heightIn: 12, hardware: { style: 'Round Knob', size: '3 inches', finishId: 'brushed-nickel', position: 'Custom Position', customOffsetXIn: 90, customOffsetYIn: -90 } });
    const knob = hardwareGeometry(clamped)!.parts[0];
    expect(knob.offsetXIn).toBe(3);
    expect(knob.offsetYIn).toBe(-4);
  });

  test('CSV schedules include actual custom size and offsets', () => {
    let project = createEditorProject(room, design);
    project = { ...project, selectedId: 'base-1' };
    project = applyHardware(project, { size: 'Custom Size', customSizeIn: 8.25, position: 'Custom Position', customOffsetXIn: 3.5, customOffsetYIn: -4 }, 'selected');
    const csv = projectScheduleCsv(project);
    expect(csv).toContain('8.25in custom');
    expect(csv).toContain('Custom Position X 3.5in / Y -4in');
  });
});
