import { applianceDetailGeometry } from '../domain/applianceGeometry';
import {
  MICROWAVE_CATALOG,
  MicrowaveModelId,
  createCatalogMicrowave,
  microwaveById,
} from '../domain/microwaveCatalog';

describe('professional microwave catalog', () => {
  test('contains the countertop and over-the-range extractor models', () => {
    expect(MICROWAVE_CATALOG.map(item => item.id)).toEqual([
      'microwave-countertop-24-stainless',
      'microwave-over-range-30-stainless',
    ]);
    expect(new Set(MICROWAVE_CATALOG.map(item => item.id)).size).toBe(2);
    for (const item of MICROWAVE_CATALOG) {
      expect(item.category).toBe('microwave');
      expect(item.modelUri.endsWith('.gltf')).toBe(true);
      expect(item.thumbnailUri.endsWith('.svg')).toBe(true);
      expect(item.pbr).toBe(true);
      expect(item.units).toBe('meters');
      expect(item.upAxis).toBe('Y');
      expect(item.origin).toBe('floor-center');
      expect(item.finish).toBe('Brushed stainless steel');
      expect(item.dimensionsLocked).toBe(true);
    }
  });

  test.each(MICROWAVE_CATALOG.map(item => [
    item.id,
    item.widthIn,
    item.heightIn,
    item.depthIn,
    item.defaultElevationIn,
    item.hasExtractor,
  ] as const))(
    '%s creates a locked, dimensionally correct appliance object',
    (id, widthIn, heightIn, depthIn, elevationIn, hasExtractor) => {
      const object = createCatalogMicrowave(id as MicrowaveModelId, { x: 205, y: 170 });
      expect(object).toMatchObject({
        kind: 'appliance',
        applianceType: 'generic',
        productId: id,
        variantId: id,
        widthIn,
        heightIn,
        depthIn,
        elevationIn,
        x: 205,
        y: 170,
        finishId: id,
        material: 'Brushed Stainless Steel',
        dimensionsLocked: true,
      });
      const parts = applianceDetailGeometry(object);
      expect(parts.length).toBeGreaterThanOrEqual(hasExtractor ? 28 : 20);
    },
  );

  test('stores extractor metadata only on the over-the-range model', () => {
    expect(microwaveById('microwave-countertop-24-stainless')).toMatchObject({
      installation: 'countertop',
      defaultElevationIn: 36,
      hasExtractor: false,
    });
    expect(microwaveById('microwave-over-range-30-stainless')).toMatchObject({
      installation: 'over-the-range',
      defaultElevationIn: 54,
      hasExtractor: true,
      venting: ['recirculating', 'ducted'],
    });
  });
});
