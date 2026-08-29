import { applianceDetailGeometry } from '../domain/applianceGeometry';
import { createCatalogRefrigerator, REFRIGERATOR_CATALOG } from '../domain/applianceCatalog';

describe('professional refrigerator catalog', () => {
  test('contains four unique, web-ready glTF assets', () => {
    expect(REFRIGERATOR_CATALOG).toHaveLength(4);
    expect(new Set(REFRIGERATOR_CATALOG.map(item => item.id)).size).toBe(4);
    for (const item of REFRIGERATOR_CATALOG) {
      expect(item.modelUri.endsWith('.gltf')).toBe(true);
      expect(item.thumbnailUri.endsWith('.svg')).toBe(true);
      expect(item.pbr).toBe(true);
      expect(item.units).toBe('meters');
      expect(item.upAxis).toBe('Y');
      expect(item.widthIn).toBeGreaterThanOrEqual(24);
      expect(item.heightIn).toBeGreaterThanOrEqual(63);
      expect(item.depthIn).toBeGreaterThanOrEqual(24);
    }
  });

  test.each(REFRIGERATOR_CATALOG.map(item => [item.id, item.widthIn, item.heightIn, item.depthIn] as const))(
    '%s creates a correctly dimensioned appliance object',
    (id, widthIn, heightIn, depthIn) => {
      const object = createCatalogRefrigerator(id, { x: 200, y: 180 });
      expect(object.kind).toBe('appliance');
      expect(object.finishId).toBe(id);
      expect(object.widthIn).toBe(widthIn);
      expect(object.heightIn).toBe(heightIn);
      expect(object.depthIn).toBe(depthIn);
      expect(object.x).toBe(200);
      expect(object.y).toBe(180);
      expect(applianceDetailGeometry(object).length).toBeGreaterThanOrEqual(7);
    },
  );
});
