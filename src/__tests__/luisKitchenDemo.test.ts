import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';

describe('Luis 10 × 11 kitchen demo', () => {
  it('creates the requested room and appliance layout', () => {
    const project = createLuisTenByElevenKitchen();
    const topWall = project.objects.find(object => object.id === 'wall-top-10ft');
    const leftWall = project.objects.find(object => object.id === 'wall-left-11ft');
    const range = project.objects.find(object => object.id === 'range-centered');
    const refrigerator = project.objects.find(object => object.id === 'refrigerator-far-right');
    const island = project.objects.find(object => object.id === 'sink-island') as typeof project.objects[number] & {
      islandSpec?: { sink?: boolean };
      countertopSpec?: { sinkCutout?: boolean };
    };

    expect(project.room.widthM).toBeCloseTo(3.048, 4);
    expect(project.room.lengthM).toBeCloseTo(3.3528, 4);
    expect(topWall?.widthIn).toBe(120);
    expect(leftWall?.widthIn).toBe(132);
    expect(range?.widthIn).toBe(36);
    expect(refrigerator?.widthIn).toBe(36);
    expect(range && topWall ? range.x + range.widthIn / 2 : 0).toBeCloseTo(180, 2);
    expect(refrigerator && topWall ? refrigerator.x + refrigerator.widthIn : 0).toBeCloseTo(240, 2);
    expect(island.x + island.widthIn / 2).toBeCloseTo(180, 2);
    expect(island.islandSpec?.sink).toBe(true);
    expect(island.countertopSpec?.sinkCutout).toBe(true);
    expect(project.objects.some(object => object.id === 'left-pantry-30')).toBe(true);
    expect(project.objects.some(object => object.id === 'left-oven-tower')).toBe(true);
    expect(project.objects.some(object => object.id === 'built-in-microwave')).toBe(true);
    expect(project.viewMode).toBe('3d');
  });
});
