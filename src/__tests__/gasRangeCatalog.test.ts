import {
  DEFAULT_GAS_RANGE_FINISH_ID,
  GAS_RANGE_CATALOG,
  GAS_RANGE_FINISHES,
  GasRangeModelId,
  createCatalogGasRange,
  gasRangeFinishPatch,
} from '../domain/applianceCatalog';
import { duplicateObject, EditorProject, migrateProject, updateObject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { serializeProject, parseProject } from '../domain/projectIO';
import { ScanPhoto } from '../domain/types';

const expectedFinishes = ['stainless-steel', 'black', 'white', 'matte-black', 'matte-white', 'red', 'blue', 'green', 'cream-ivory'];
const photos: ScanPhoto[] = [0, 90, 180, 270].map((angle, index) => ({ uri: `range-photo-${index}.jpg`, angle, capturedAt: '2026-08-28T00:00:00.000Z' }));
const makeProject = () => {
  const room = reconstructRoom(photos);
  const design = generateDesigns(room)[0];
  return migrateProject({ version: 2, id: room.id, name: 'Range Test', room, design, objects: [], viewMode: '2d', view2d: { zoom: 1, pan: { x: 0, y: 0 }, grid: true, snap: true, measurements: true }, camera3d: { distance: 520, yaw: -28, pitch: 30, target: { x: 220, y: 170 } }, catalogState: { favoriteWallPaintIds: [], recentWallPaintIds: [], favoriteCabinetFinishIds: [], recentCabinetFinishIds: [], customColors: [], compareWallPaintIds: [] }, updatedAt: '2026-08-28T00:00:00.000Z' })!;
};

describe('gas range catalog', () => {
  test('contains the 32, 36 and 42 inch professional variants', () => {
    expect(GAS_RANGE_CATALOG.map(item => item.widthIn)).toEqual([32, 36, 42]);
    expect(GAS_RANGE_CATALOG.map(item => item.id)).toEqual([
      'gas-range-32-4-burner',
      'gas-range-36-4-burner-griddle',
      'gas-range-42-4-burner-griddle',
    ]);
    expect(new Set(GAS_RANGE_CATALOG.map(item => item.id)).size).toBe(3);
    for (const item of GAS_RANGE_CATALOG) {
      expect(item.category).toBe('gas-range');
      expect(item.modelUri.startsWith('parametric://')).toBe(true);
      expect(item.thumbnailUri.endsWith('.svg')).toBe(true);
      expect(item.defaultFinishId).toBe('stainless-steel');
      expect(item.fuelType).toBe('gas');
      expect(item.burnerCount).toBe(4);
      expect(item.heightIn).toBe(36);
      expect(item.depthIn).toBe(28);
      expect(item.dimensionsLocked).toBe(true);
    }
  });

  test('uses the required finish order and stainless steel default', () => {
    expect(GAS_RANGE_FINISHES.map(finish => finish.id)).toEqual(expectedFinishes);
    expect(DEFAULT_GAS_RANGE_FINISH_ID).toBe('stainless-steel');
    expect(GAS_RANGE_FINISHES[0].metalness).toBeGreaterThanOrEqual(.85);
    expect(GAS_RANGE_FINISHES[0].roughness).toBeGreaterThanOrEqual(.25);
    expect(GAS_RANGE_FINISHES[0].roughness).toBeLessThanOrEqual(.4);
  });

  test.each(GAS_RANGE_CATALOG.map(item => [item.id, item.widthIn, item.knobCount, item.hasCenterGriddle, item.ovenDoorCount] as const))(
    '%s creates a locked, correctly dimensioned stainless range',
    (id, widthIn, knobCount, hasCenterGriddle, ovenDoorCount) => {
      const object = createCatalogGasRange(id as GasRangeModelId, { x: 210, y: 175 });
      expect(object.kind).toBe('appliance');
      expect(object.applianceType).toBe('gas-range');
      expect(object.productId).toBe(id);
      expect(object.variantId).toBe(id);
      expect(object.widthIn).toBe(widthIn);
      expect(object.heightIn).toBe(36);
      expect(object.depthIn).toBe(28);
      expect(object.finishId).toBe('stainless-steel');
      expect(object.material).toBe('Brushed Stainless Steel');
      expect(object.burnerCount).toBe(4);
      expect(object.knobCount).toBe(knobCount);
      expect(object.hasCenterGriddle).toBe(hasCenterGriddle);
      expect(object.ovenDoorCount).toBe(ovenDoorCount);
      expect(object.dimensionsLocked).toBe(true);
      expect(object.x).toBe(210);
      expect(object.y).toBe(175);
    },
  );

  test('finish changes are instance-specific, undo-ready object updates', () => {
    const first = createCatalogGasRange('gas-range-36-4-burner-griddle', { id: 'range-a' });
    const second = createCatalogGasRange('gas-range-36-4-burner-griddle', { id: 'range-b' });
    let project: EditorProject = { ...makeProject(), objects: [first, second], selectedId: first.id };
    project = updateObject(project, first.id, gasRangeFinishPatch('red'));
    expect(project.objects.find(object => object.id === first.id)?.finishId).toBe('red');
    expect(project.objects.find(object => object.id === first.id)?.color).toBe('#B51F2E');
    expect(project.objects.find(object => object.id === second.id)?.finishId).toBe('stainless-steel');
  });

  test('locked catalog dimensions survive updates, duplication and project round-trip', () => {
    const source = createCatalogGasRange('gas-range-42-4-burner-griddle', { id: 'range-persist' });
    let project: EditorProject = { ...makeProject(), objects: [source], selectedId: source.id };
    project = updateObject(project, source.id, { widthIn: 99, heightIn: 10, depthIn: 10, rotation: 90, ...gasRangeFinishPatch('blue') });
    const locked = project.objects[0];
    expect([locked.widthIn, locked.heightIn, locked.depthIn]).toEqual([42, 36, 28]);
    expect(locked.rotation).toBe(90);
    expect(locked.finishId).toBe('blue');
    project = duplicateObject(project, source.id);
    const copy = project.objects[project.objects.length - 1];
    expect(copy.productId).toBe(source.productId);
    expect(copy.finishId).toBe('blue');
    expect(copy.dimensionsLocked).toBe(true);
    const restored = parseProject(serializeProject(project));
    expect(restored?.objects[0].productId).toBe('gas-range-42-4-burner-griddle');
    expect(restored?.objects[0].finishId).toBe('blue');
    expect(restored?.objects[0].hasCenterGriddle).toBe(true);
    expect(restored?.objects[0].knobCount).toBe(5);
  });
});
