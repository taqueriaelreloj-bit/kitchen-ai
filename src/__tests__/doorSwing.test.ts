import { doorPlanLeafStyle, doorSwingGeometry, doorSwingLabel } from '../domain/doorSwing';
import { objectDefaults } from '../domain/editor';
import { openingData } from '../domain/openings';

const door=(swingDirection:'Left In'|'Right In'|'Left Out'|'Right Out')=>objectDefaults('door',{id:`door-${swingDirection}`,widthIn:36,openingSpec:{...openingData(objectDefaults('door')),swingDirection}} as any);

describe('door swing geometry',()=>{
  test('distinguishes left and right hinges',()=>{
    const left=doorSwingGeometry(door('Left In'));
    const right=doorSwingGeometry(door('Right In'));
    expect(left.hinge).toBe('left');
    expect(right.hinge).toBe('right');
    expect(left.leafCenterAlongIn).toBeLessThan(right.leafCenterAlongIn);
    expect(left.leafRotationDeg).not.toBe(right.leafRotationDeg);
  });

  test('distinguishes inward and outward opening',()=>{
    const inward=doorSwingGeometry(door('Left In'));
    const outward=doorSwingGeometry(door('Left Out'));
    expect(inward.direction).toBe('in');
    expect(outward.direction).toBe('out');
    expect(Math.sign(inward.leafCenterNormalIn)).toBe(-Math.sign(outward.leafCenterNormalIn));
  });

  test('places the handle near the free edge',()=>{
    const geometry=doorSwingGeometry(door('Right In'));
    expect(Math.hypot(geometry.handleAlongIn-18,geometry.handleNormalIn)).toBeGreaterThan(28);
  });

  test('creates readable labels and 2D plan style data',()=>{
    const object=door('Right Out');
    expect(doorSwingLabel(object)).toBe('Right hinge · opens out');
    const style=doorPlanLeafStyle(object,.5);
    expect(style.width).toBe(18);
    expect(style.hingeLeft).toBe(false);
    expect(style.opensOut).toBe(true);
  });

  test('falls back safely when an old project has no swing value',()=>{
    const oldDoor=objectDefaults('door',{id:'old-door'});
    expect(doorSwingGeometry(oldDoor).swing).toBe('Left In');
  });
});
