import { validateKitchenLayout } from '../domain/designValidation';
import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';

const overlaps = (a: {x:number;y:number;widthIn:number;depthIn:number}, b: {x:number;y:number;widthIn:number;depthIn:number}) =>
  a.x < b.x + b.widthIn && a.x + a.widthIn > b.x && a.y < b.y + b.depthIn && a.y + a.depthIn > b.y;

describe('Clean 10 × 11 kitchen demo', () => {
  it('creates a simple ordered appliance wall and compact sink island', () => {
    const project = createLuisTenByElevenKitchen();
    const northWall = project.objects.find(object => object.id === 'wall-north-10ft');
    const westWall = project.objects.find(object => object.id === 'wall-west-11ft');
    const range = project.objects.find(object => object.id === 'range-centered');
    const refrigerator = project.objects.find(object => object.id === 'refrigerator-far-right');
    const island = project.objects.find(object => object.id === 'sink-island') as typeof project.objects[number] & {
      islandSpec?: { sink?: boolean };
      countertopSpec?: { sinkCutout?: boolean };
    };

    expect(project.room.widthM).toBeCloseTo(3.048, 4);
    expect(project.room.lengthM).toBeCloseTo(3.3528, 4);
    expect(northWall?.widthIn).toBe(120);
    expect(westWall?.widthIn).toBe(132);
    expect(range?.widthIn).toBe(32);
    expect(refrigerator?.widthIn).toBe(36);
    expect(range?.x).toBeCloseTo(138, 2);
    expect(refrigerator?.x).toBeCloseTo(204, 2);
    expect(island.widthIn).toBe(42);
    expect(island.depthIn).toBe(24);
    expect(island.islandSpec?.sink).toBe(true);
    expect(island.countertopSpec?.sinkCutout).toBe(true);
    expect(project.objects.some(object => object.id.includes('pantry'))).toBe(false);
    expect(project.objects.some(object => object.id.includes('oven-tower'))).toBe(false);
    expect(project.viewMode).toBe('3d');
  });

  it('has no floor-object overlaps and keeps the island aisle clear', () => {
    const project = createLuisTenByElevenKitchen();
    const floorObjects = project.objects.filter(object =>
      object.kind === 'island' || object.kind === 'appliance' ||
      ['base-cabinet','sink-base','drawer-base','corner-cabinet','tall-cabinet','pantry-cabinet','oven-cabinet','refrigerator-cabinet'].includes(object.kind),
    ).filter(object => (object.elevationIn ?? 0) < 16);
    for (let index = 0; index < floorObjects.length; index += 1) {
      for (let other = index + 1; other < floorObjects.length; other += 1) {
        expect(overlaps(floorObjects[index], floorObjects[other])).toBe(false);
      }
    }
    const issueIds = validateKitchenLayout(project).map(issue => issue.id);
    expect(issueIds.some(id => id.startsWith('overlap-'))).toBe(false);
    expect(issueIds).not.toContain('island-clearance-sink-island');
    expect(issueIds.some(id => id.startsWith('outside-'))).toBe(false);
  });
});
