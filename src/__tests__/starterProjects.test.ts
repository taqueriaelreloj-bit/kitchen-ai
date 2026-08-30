import { createBlankManualProject, createManualRoom, normalizeManualRoomInput } from '../domain/starterProjects';

describe('No-camera starter projects', () => {
  test('creates a manual room using feet and marks the source as manual', () => {
    const room = createManualRoom({ widthFt: 10, lengthFt: 11, heightFt: 8, layout: 'L' });
    expect(room.widthM).toBeCloseTo(3.048, 4);
    expect(room.lengthM).toBeCloseTo(3.3528, 4);
    expect(room.heightM).toBeCloseTo(2.4384, 4);
    expect(room.source).toBe('manual');
    expect(room.photos).toEqual([]);
  });

  test('creates an empty four-wall editor project without starter cabinets', () => {
    const project = createBlankManualProject({ widthFt: 10, lengthFt: 11, heightFt: 8, layout: 'single-wall' });
    expect(project.viewMode).toBe('2d');
    expect(project.objects).toHaveLength(4);
    expect(project.objects.every(object => object.kind === 'wall')).toBe(true);
    expect(project.objects.find(object => object.id === 'manual-wall-north')?.widthIn).toBe(120);
    expect(project.objects.find(object => object.id === 'manual-wall-west')?.widthIn).toBe(132);
  });

  test('normalizes unsafe dimensions instead of producing a broken room', () => {
    expect(normalizeManualRoomInput({ widthFt: 2, lengthFt: 100, heightFt: Number.NaN, layout: 'U' })).toEqual({
      widthFt: 5,
      lengthFt: 60,
      heightFt: 8,
      layout: 'U',
    });
  });
});
