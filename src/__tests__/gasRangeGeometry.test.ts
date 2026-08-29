import { createCatalogGasRange, gasRangeFinishPatch } from '../domain/applianceCatalog';
import { applianceDetailGeometry } from '../domain/applianceGeometry';

const burnerCount = (parts: ReturnType<typeof applianceDetailGeometry>) => parts.filter(part => /^burner-\d-brass$/.test(part.id)).length;
const knobCount = (parts: ReturnType<typeof applianceDetailGeometry>) => parts.filter(part => /^knob-(?:burner-\d|griddle)$/.test(part.id)).length;
const ovenDoorCount = (parts: ReturnType<typeof applianceDetailGeometry>) => parts.filter(part => /^oven-door-(?:left|right|wide)-body$/.test(part.id)).length;

describe('professional gas range 3D geometry', () => {
  test('32 inch variant has four burners, four controls and one oven', () => {
    const object = createCatalogGasRange('gas-range-32-4-burner');
    const parts = applianceDetailGeometry(object);
    expect(burnerCount(parts)).toBe(4);
    expect(knobCount(parts)).toBe(4);
    expect(ovenDoorCount(parts)).toBe(1);
    expect(parts.some(part => part.id === 'center-griddle')).toBe(false);
    expect(parts.some(part => part.id === 'griddle-handle')).toBe(false);
    expect(parts.some(part => part.id === 'knob-griddle')).toBe(false);
  });

  test('36 inch variant has the visible griddle handle, fifth knob and two oven doors', () => {
    const object = createCatalogGasRange('gas-range-36-4-burner-griddle');
    const parts = applianceDetailGeometry(object);
    expect(burnerCount(parts)).toBe(4);
    expect(knobCount(parts)).toBe(5);
    expect(ovenDoorCount(parts)).toBe(2);
    expect(parts.some(part => part.id === 'center-griddle')).toBe(true);
    expect(parts.some(part => part.id === 'griddle-handle')).toBe(true);
    expect(parts.some(part => part.id === 'knob-griddle')).toBe(true);
    expect(parts.some(part => part.id === 'griddle-label')).toBe(true);
  });

  test('42 inch variant has four burners, fifth knob and one extra-wide oven', () => {
    const object = createCatalogGasRange('gas-range-42-4-burner-griddle');
    const parts = applianceDetailGeometry(object);
    expect(burnerCount(parts)).toBe(4);
    expect(knobCount(parts)).toBe(5);
    expect(ovenDoorCount(parts)).toBe(1);
    expect(parts.find(part => part.id === 'oven-door-wide-body')?.widthIn).toBeGreaterThan(39);
    expect(parts.some(part => part.id === 'griddle-handle')).toBe(true);
  });

  test('finish changes affect body groups without recoloring fixed appliance materials', () => {
    const object = { ...createCatalogGasRange('gas-range-36-4-burner-griddle'), ...gasRangeFinishPatch('red') };
    const parts = applianceDetailGeometry(object);
    const body = parts.filter(part => part.materialGroup === 'body');
    const grates = parts.filter(part => part.materialGroup === 'grate');
    const glass = parts.filter(part => part.materialGroup === 'glass');
    expect(body.length).toBeGreaterThan(4);
    expect(body.every(part => part.color === '#B51F2E')).toBe(true);
    expect(grates.every(part => part.color !== '#B51F2E')).toBe(true);
    expect(glass.every(part => part.color !== '#B51F2E')).toBe(true);
    expect(new Set(parts.map(part => part.materialGroup).filter(Boolean))).toEqual(new Set(['body', 'stainless-trim', 'grate', 'burner', 'griddle', 'glass', 'interior']));
  });
});
