import { applianceDetailGeometry } from '../domain/applianceGeometry';
import { createCatalogMicrowave } from '../domain/microwaveCatalog';

describe('professional microwave 3D geometry', () => {
  test('countertop model has a complete front assembly without extractor parts', () => {
    const parts = applianceDetailGeometry(createCatalogMicrowave('microwave-countertop-24-stainless'));
    expect(parts.some(part => part.id === 'microwave-door-glass')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-door-mesh')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-control-panel')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-display')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-handle')).toBe(true);
    expect(parts.filter(part => part.id.startsWith('microwave-key-'))).toHaveLength(12);
    expect(parts.some(part => part.id === 'hood-filter-left')).toBe(false);
    expect(parts.some(part => part.id === 'cooktop-light')).toBe(false);
  });

  test('over-the-range model includes extractor filters, vent grille and cooktop light', () => {
    const parts = applianceDetailGeometry(createCatalogMicrowave('microwave-over-range-30-stainless'));
    expect(parts.some(part => part.id === 'hood-filter-left')).toBe(true);
    expect(parts.some(part => part.id === 'hood-filter-right')).toBe(true);
    expect(parts.some(part => part.id === 'cooktop-light')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-vent-button')).toBe(true);
    expect(parts.some(part => part.id === 'microwave-light-button')).toBe(true);
    expect(parts.filter(part => part.id.startsWith('microwave-vent-slat-'))).toHaveLength(10);
    expect(parts.filter(part => part.id.startsWith('microwave-key-'))).toHaveLength(12);
  });

  test('stainless facade keeps realistic fixed glass, mesh and display materials', () => {
    const object = createCatalogMicrowave('microwave-over-range-30-stainless');
    const parts = applianceDetailGeometry(object);
    expect(parts.find(part => part.id === 'microwave-front-frame')?.color).toBe('#AEB5B8');
    expect(parts.find(part => part.id === 'microwave-door-glass')?.color).toBe('#111416');
    expect(parts.find(part => part.id === 'microwave-door-mesh')?.color).toBe('#34393B');
    expect(parts.find(part => part.id === 'microwave-display')?.color).toBe('#8ED7E8');
  });
});
