import { cabinetFrontHardwareCount, cabinetFrontLayout } from '../domain/cabinetFrontLayout';
import { objectDefaults } from '../domain/editor';

const totalHeight=(kind:Parameters<typeof objectDefaults>[0])=>cabinetFrontLayout(objectDefaults(kind)).reduce((total,front)=>total+front.heightIn,0);

describe('cabinet front layout engine',()=>{
  test('drawer base creates three graduated drawer fronts',()=>{
    const fronts=cabinetFrontLayout(objectDefaults('drawer-base',{widthIn:30,heightIn:34.5}));
    expect(fronts).toHaveLength(3);
    expect(fronts.every(front=>front.role==='drawer')).toBe(true);
    expect(fronts[0].heightIn).toBeLessThan(fronts[2].heightIn);
    expect(fronts.every(front=>front.hardwareOrientation==='horizontal')).toBe(true);
  });

  test('sink base creates a false front and cabinet doors',()=>{
    const fronts=cabinetFrontLayout(objectDefaults('sink-base',{widthIn:36}));
    expect(fronts.some(front=>front.role==='false-front'&&front.hardwareCount===0)).toBe(true);
    expect(fronts.filter(front=>front.role==='door')).toHaveLength(2);
  });

  test('standard base combines one drawer with doors',()=>{
    const fronts=cabinetFrontLayout(objectDefaults('base-cabinet',{widthIn:30}));
    expect(fronts.filter(front=>front.role==='drawer')).toHaveLength(1);
    expect(fronts.filter(front=>front.role==='door')).toHaveLength(2);
  });

  test('wall and glass cabinets use full-height upper doors',()=>{
    const upper=cabinetFrontLayout(objectDefaults('wall-cabinet',{widthIn:24}));
    const glass=cabinetFrontLayout(objectDefaults('glass-upper',{widthIn:36}));
    expect(upper).toHaveLength(1);
    expect(upper[0].role).toBe('upper-door');
    expect(glass).toHaveLength(2);
    expect(glass.every(front=>front.role==='upper-door')).toBe(true);
  });

  test('tall and pantry cabinets split upper and lower sections',()=>{
    for(const kind of ['tall-cabinet','pantry-cabinet'] as const){
      const fronts=cabinetFrontLayout(objectDefaults(kind,{widthIn:30,heightIn:84}));
      expect(fronts.some(front=>front.role==='upper-door')).toBe(true);
      expect(fronts.some(front=>front.role==='lower-door')).toBe(true);
      expect(fronts).toHaveLength(4);
    }
  });

  test('oven cabinet leaves a protected appliance opening',()=>{
    const fronts=cabinetFrontLayout(objectDefaults('oven-cabinet',{heightIn:84}));
    const opening=fronts.find(front=>front.id==='oven-opening');
    expect(opening).toBeDefined();
    expect(opening?.hardwareCount).toBe(0);
    expect(fronts.some(front=>front.role==='drawer')).toBe(true);
  });

  test('refrigerator cabinet only adds overhead cabinet doors',()=>{
    const fronts=cabinetFrontLayout(objectDefaults('refrigerator-cabinet',{widthIn:36,heightIn:84}));
    expect(fronts).toHaveLength(2);
    expect(fronts.every(front=>front.role==='upper-door')).toBe(true);
    expect(fronts.every(front=>front.centerYIn>0)).toBe(true);
  });

  test('front heights fit inside each cabinet face',()=>{
    for(const kind of ['base-cabinet','sink-base','drawer-base','wall-cabinet','tall-cabinet','pantry-cabinet','oven-cabinet'] as const){
      const cabinet=objectDefaults(kind);
      expect(totalHeight(kind)).toBeLessThanOrEqual(cabinet.heightIn);
    }
  });

  test('hardware quantity follows actual front layout',()=>{
    const drawer=objectDefaults('drawer-base',{hardware:{style:'Bar Pull',size:'5 inches',finishId:'matte-black',position:'Center'}} as any);
    const sink=objectDefaults('sink-base',{widthIn:36,hardware:{style:'Bar Pull',size:'5 inches',finishId:'matte-black',position:'Center'}} as any);
    expect(cabinetFrontHardwareCount(drawer)).toBe(3);
    expect(cabinetFrontHardwareCount(sink)).toBe(2);
  });
});
