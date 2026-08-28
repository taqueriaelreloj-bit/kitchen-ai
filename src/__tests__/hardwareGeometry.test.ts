import { objectDefaults } from '../domain/editor';
import { hardwareGeometry } from '../domain/hardwareGeometry';

const cabinet=(style:string,position='Center',size='5 inches')=>objectDefaults('base-cabinet',{id:`cabinet-${style}`,hardware:{style,size,finishId:'brushed-nickel',position}});

describe('Hardware 3D shape engine',()=>{
  test('knobs are compact single-part fixtures',()=>{
    const round=hardwareGeometry(cabinet('Round Knob'))!;
    expect(round.parts).toHaveLength(1);
    expect(round.parts[0].widthIn).toBeLessThan(2);
  });
  test('bar pull includes bar and mounting posts',()=>{
    const bar=hardwareGeometry(cabinet('Bar Pull'))!;
    expect(bar.parts.length).toBeGreaterThanOrEqual(3);
    expect(bar.parts.some(part=>part.id==='bar')).toBe(true);
  });
  test('cup pull and edge pull produce different silhouettes',()=>{
    const cup=hardwareGeometry(cabinet('Cup Pull'))!;
    const edge=hardwareGeometry(cabinet('Edge Pull'))!;
    expect(cup.parts.length).not.toBe(edge.parts.length);
    expect(edge.parts[0].offsetYIn).toBeGreaterThan(cup.parts[0].offsetYIn);
  });
  test('vertical position rotates bar dimensions in local cabinet coordinates',()=>{
    const vertical=hardwareGeometry(cabinet('Bar Pull','Vertical','10 inches'))!;
    const bar=vertical.parts.find(part=>part.id==='bar')!;
    expect(bar.heightIn).toBeGreaterThan(bar.widthIn);
  });
  test('appliance pull uses longer heavy geometry',()=>{
    const appliance=hardwareGeometry(cabinet('Appliance Pull','Center','Appliance Size'))!;
    const bar=appliance.parts.find(part=>part.id==='appliance-bar')!;
    expect(bar.widthIn).toBeGreaterThanOrEqual(10);
    expect(bar.depthIn).toBeGreaterThan(.5);
  });
  test('No Hardware produces no geometry',()=>{
    expect(hardwareGeometry(cabinet('No Hardware'))).toBeUndefined();
  });
});
