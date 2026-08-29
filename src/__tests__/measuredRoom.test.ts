import {
  createMeasuredRoomProject, createProjectFromPreset, measuredRoomModel, measuredRoomWalls,
  ROOM_PRESETS, roomPreset, validateMeasuredRoom,
} from '../domain/measuredRoom';

describe('manual measured room projects',()=>{
  test('provides senior-friendly common room presets',()=>{
    expect(ROOM_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(ROOM_PRESETS.map(preset=>preset.id)).toEqual(expect.arrayContaining(['small-galley','standard-10x12','large-12x14','open-14x16','u-shape-12x15']));
    expect(ROOM_PRESETS.every(preset=>preset.widthIn>=96&&preset.heightIn>=96)).toBe(true);
  });

  test('validates practical room and ceiling ranges',()=>{
    expect(validateMeasuredRoom({widthIn:120,lengthIn:144,heightIn:96,shape:'Rectangle'})).toEqual({valid:true,errors:[]});
    expect(validateMeasuredRoom({widthIn:48,lengthIn:144,heightIn:96,shape:'Rectangle'}).errors[0]).toContain('width');
    expect(validateMeasuredRoom({widthIn:120,lengthIn:700,heightIn:96,shape:'Rectangle'}).errors[0]).toContain('length');
    expect(validateMeasuredRoom({widthIn:120,lengthIn:144,heightIn:60,shape:'Rectangle'}).errors[0]).toContain('Ceiling');
  });

  test('converts inch measurements to a high-confidence room model',()=>{
    const room=measuredRoomModel({widthIn:120,lengthIn:144,heightIn:108,shape:'Rectangle'});
    expect(room.widthM).toBeCloseTo(3.048,3);
    expect(room.lengthM).toBeCloseTo(3.6576,3);
    expect(room.heightM).toBeCloseTo(2.7432,3);
    expect(room.confidence).toBe(1);
    expect(room.source).toBe('manual-measurements');
    expect(room.photos).toEqual([]);
  });

  test('creates four continuous walls for a rectangular room',()=>{
    const walls=measuredRoomWalls({widthIn:120,lengthIn:144,heightIn:96,shape:'Rectangle'});
    expect(walls).toHaveLength(4);
    expect(walls.map(wall=>wall.rotation)).toEqual([0,90,180,270]);
    expect(walls[0].widthIn).toBe(120);
    expect(walls[1].widthIn).toBe(144);
    expect(walls.every(wall=>wall.heightIn===96&&wall.depthIn===4.5)).toBe(true);
  });

  test('creates a six-segment L-shaped shell',()=>{
    const walls=measuredRoomWalls({widthIn:168,lengthIn:192,heightIn:108,shape:'L-Shape'});
    expect(walls).toHaveLength(6);
    expect(walls.some(wall=>wall.id==='wall-notch-horizontal')).toBe(true);
    expect(walls.some(wall=>wall.id==='wall-notch-vertical')).toBe(true);
  });

  test('creates a five-segment U-shaped shell',()=>{
    const walls=measuredRoomWalls({widthIn:144,lengthIn:180,heightIn:96,shape:'U-Shape'});
    expect(walls).toHaveLength(5);
    expect(walls.filter(wall=>wall.name.includes('Return'))).toHaveLength(2);
  });

  test('creates a complete editable project without camera photos',()=>{
    const project=createMeasuredRoomProject({widthIn:120,lengthIn:144,heightIn:96,shape:'Rectangle',projectName:'Luis Kitchen'});
    expect(project.name).toBe('Luis Kitchen');
    expect(project.room.source).toBe('manual-measurements');
    expect(project.objects.every(object=>object.kind==='wall')).toBe(true);
    expect(project.viewMode).toBe('2d');
    expect(project.version).toBe(2);
  });

  test('creates a project directly from a preset',()=>{
    const project=createProjectFromPreset('large-12x14','Preset Kitchen');
    expect(project.name).toBe('Preset Kitchen');
    expect(project.room.widthM).toBeCloseTo(144/39.3700787402,4);
    expect(roomPreset('large-12x14')?.heightIn).toBe(108);
  });

  test('rejects an unknown preset',()=>{
    expect(()=>createProjectFromPreset('not-a-preset')).toThrow('Unknown room preset');
  });
});
