import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import {
  applyMeasurementInput, formatFeetInches, formatMeasurement, parseMeasurement,
  snapMeasurement, validateMeasurement,
} from '../domain/measurements';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`measurement-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional measurement input',()=>{
  test.each([
    ['42 in',42],
    ['42"',42],
    ['3 ft 6 in',42],
    ["3' 6\"",42],
    ["3' 6 1/2\"",42.5],
    ['3.5 ft',42],
    ['3 1/2 in',3.5],
    ['7/8 in',.875],
    ['106.68 cm',42],
    ['1066.8 mm',42],
    ['1.0668 m',42],
  ] as const)('parses %s', (input,expected)=>{
    const result=parseMeasurement(input);
    expect(result.valid).toBe(true);
    expect(result.inches).toBeCloseTo(expected,3);
  });

  test('uses inches when no unit is supplied',()=>{
    expect(parseMeasurement('36').inches).toBe(36);
    expect(parseMeasurement('36','cm').inches).toBeCloseTo(14.1732,3);
  });

  test('normalizes architectural output and fractions',()=>{
    expect(formatFeetInches(42.5)).toBe("3' 6 1/2\"");
    expect(formatFeetInches(11.999)).toBe("1' 0\"");
    expect(formatFeetInches(-42)).toBe("-3' 6\"");
    expect(formatMeasurement(42,'cm')).toBe('106.68 cm');
  });

  test('rejects invalid or zero-denominator fractions',()=>{
    expect(parseMeasurement('').valid).toBe(false);
    expect(parseMeasurement('three feet').valid).toBe(false);
    expect(parseMeasurement('3/0 in').valid).toBe(false);
    expect(parseMeasurement('3 ft apples').error).toContain('Use a value');
  });

  test('validates negative, minimum and maximum limits',()=>{
    expect(validateMeasurement(-1)).toContain('negative');
    expect(validateMeasurement(-1,{allowNegative:true})).toBeUndefined();
    expect(validateMeasurement(8,{minIn:9})).toContain('at least');
    expect(validateMeasurement(121,{maxIn:120})).toContain('no more');
  });

  test('applies a parsed value to the selected object through the shared project model',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:30});
    let project=createEditorProject(room,design);
    project={...project,objects:[cabinet],selectedId:cabinet.id};
    const applied=applyMeasurementInput(project,cabinet.id,'widthIn',"3' 0\"",{minIn:9,maxIn:60});
    expect(applied.error).toBeUndefined();
    expect(applied.project.objects[0].widthIn).toBe(36);
    expect(applied.project.updatedAt).not.toBe(project.updatedAt);
  });

  test('does not modify project for invalid or out-of-range values',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:30});
    const project={...createEditorProject(room,design),objects:[cabinet],selectedId:cabinet.id};
    const invalid=applyMeasurementInput(project,cabinet.id,'widthIn','bad value',{minIn:9,maxIn:60});
    const tooLarge=applyMeasurementInput(project,cabinet.id,'widthIn','72 in',{minIn:9,maxIn:60});
    expect(invalid.project).toBe(project);
    expect(tooLarge.project).toBe(project);
    expect(tooLarge.error).toContain('no more');
  });

  test('snaps decimal dimensions without changing real units',()=>{
    expect(snapMeasurement(35.87,.25)).toBe(35.75);
    expect(snapMeasurement(35.88,.25)).toBe(36);
    expect(snapMeasurement(36,5)).toBe(35);
  });
});
