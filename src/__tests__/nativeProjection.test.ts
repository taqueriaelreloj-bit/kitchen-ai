import { Camera3DState } from '../domain/editor';
import { Box3D } from '../domain/geometry';
import { clampNativeCameraDistance, clampNativeCameraPitch, focusNativeCamera, projectSceneBoxes } from '../domain/nativeProjection';

const camera:Camera3DState={distance:520,yaw:-28,pitch:30,target:{x:220,y:170}};
const boxes:Box3D[]=[
  {id:'floor',kind:'floor',center:[5,0,5],size:[16,.1,16],rotationY:0,color:'#D8D2C7',roughness:.76,metalness:0},
  {id:'cabinet',sourceId:'cabinet',kind:'cabinet',center:[7,1,5],size:[1.5,3,1],rotationY:0,color:'#EFE9DC',roughness:.45,metalness:0},
  {id:'hardware',sourceId:'cabinet',kind:'hardware',center:[7,1.4,4.45],size:[.35,.08,.08],rotationY:0,color:'#222222',roughness:.2,metalness:1},
];

describe('native isometric projection',()=>{
  test('projects every finite scene box in stable depth order',()=>{
    const projected=projectSceneBoxes(boxes,camera,{width:400,height:600});
    expect(projected).toHaveLength(boxes.length);
    expect(projected.every(item=>Number.isFinite(item.x)&&Number.isFinite(item.y)&&item.width>0&&item.height>0)).toBe(true);
    expect(projected.every((item,index)=>index===0||projected[index-1].depth<=item.depth)).toBe(true);
  });

  test('camera zoom changes projected object size without changing source geometry',()=>{
    const far=projectSceneBoxes(boxes,{...camera,distance:800},{width:400,height:600}).find(item=>item.id==='cabinet')!;
    const near=projectSceneBoxes(boxes,{...camera,distance:260},{width:400,height:600}).find(item=>item.id==='cabinet')!;
    expect(near.width).toBeGreaterThan(far.width);
    expect(near.height).toBeGreaterThan(far.height);
    expect(boxes.find(item=>item.id==='cabinet')?.size).toEqual([1.5,3,1]);
  });

  test('orbit yaw moves a box across the viewport',()=>{
    const left=projectSceneBoxes(boxes,{...camera,yaw:-55},{width:400,height:600}).find(item=>item.id==='cabinet')!;
    const right=projectSceneBoxes(boxes,{...camera,yaw:35},{width:400,height:600}).find(item=>item.id==='cabinet')!;
    expect(left.x).not.toBe(right.x);
    expect(left.rotationDeg).not.toBe(right.rotationDeg);
  });

  test('focus targets the selected scene box and moves closer safely',()=>{
    const focused=focusNativeCamera(camera,boxes[1]);
    expect(focused.target).toEqual({x:168,y:120});
    expect(focused.distance).toBeLessThan(camera.distance);
    expect(focused.distance).toBeGreaterThanOrEqual(180);
  });

  test('camera safety clamps prevent unusable angles and distances',()=>{
    expect(clampNativeCameraDistance(10)).toBe(180);
    expect(clampNativeCameraDistance(5000)).toBe(1100);
    expect(clampNativeCameraPitch(-20)).toBe(8);
    expect(clampNativeCameraPitch(120)).toBe(78);
  });
});
