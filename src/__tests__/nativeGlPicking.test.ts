import { objectDefaults } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { boxModelMatrix, nativeGlFrame } from '../domain/nativeGlScene';
import { pickNativeGlObject, projectPoint, projectedBoxBounds } from '../domain/nativeGlPicking';

const camera={distance:520,yaw:-28,pitch:30,target:{x:220,y:170}};

describe('native OpenGL picking',()=>{
  test('projects world points into finite screen coordinates',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'project-cabinet',x:220,y:170,widthIn:30});
    const box=buildSceneBoxes([cabinet]).find(item=>item.id===cabinet.id)!;
    const frame=nativeGlFrame([box],camera,400/300);
    const point=projectPoint(frame.viewProjection,box.center,400,300);
    expect(point.visible).toBe(true);
    expect(point.x).toBeGreaterThan(0);
    expect(point.x).toBeLessThan(400);
    expect(point.y).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(300);
  });

  test('calculates projected bounds for a rotated box',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'bounds-cabinet',x:220,y:170,widthIn:36,rotation:90});
    const box=buildSceneBoxes([cabinet]).find(item=>item.id===cabinet.id)!;
    const frame=nativeGlFrame([box],camera,1.4);
    const bounds=projectedBoxBounds(frame.viewProjection,boxModelMatrix(box),420,300);
    expect(bounds).toBeDefined();
    expect((bounds?.right??0)-(bounds?.left??0)).toBeGreaterThan(0);
    expect((bounds?.bottom??0)-(bounds?.top??0)).toBeGreaterThan(0);
  });

  test('selects the source cabinet when a detailed door or handle is touched',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'pick-cabinet',x:220,y:170,widthIn:30});
    const boxes=buildSceneBoxes([cabinet]);
    const frame=nativeGlFrame(boxes,camera,400/300);
    const detailIndex=boxes.findIndex(box=>box.sourceId===cabinet.id&&box.kind==='cabinet-door');
    const detail=boxes[detailIndex];
    const point=projectPoint(frame.viewProjection,detail.center,400,300);
    const picked=pickNativeGlObject(boxes,camera,400,300,point.x,point.y);
    expect(picked?.id).toBe(cabinet.id);
    expect(picked?.sourceId).toBe(cabinet.id);
  });

  test('does not return the floor when empty floor space is touched',()=>{
    const floorOnly=buildSceneBoxes([]);
    expect(pickNativeGlObject(floorOnly,camera,400,300,200,150)).toBeUndefined();
  });

  test('returns undefined for invalid viewport dimensions',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'invalid-size'});
    expect(pickNativeGlObject(buildSceneBoxes([cabinet]),camera,0,300,20,20)).toBeUndefined();
  });
});
