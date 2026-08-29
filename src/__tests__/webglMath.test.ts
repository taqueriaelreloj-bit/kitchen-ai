import { buildSceneBoxes } from '../domain/geometry';
import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';
import { fit3DCamera } from '../domain/viewFitting';
import {
  Vec3,
  lookAtMatrix,
  multiplyMat4,
  perspectiveMatrix,
  scaleMatrix,
  sceneBounds3D,
  transformPoint,
  translationMatrix,
} from '../domain/webglMath';

describe('WebGL matrix and camera projection',()=>{
  test('column-major multiplication applies scale before translation',()=>{
    const model=multiplyMat4(translationMatrix(10,20,30),scaleMatrix(2,3,4));
    expect(transformPoint(model,[1,1,1])).toEqual([12,23,34,1]);
  });

  test('look-at and perspective place the target in the center of clip space',()=>{
    const eye:Vec3=[0,2,10],target:Vec3=[0,2,0];
    const viewProjection=multiplyMat4(perspectiveMatrix(Math.PI/4,16/9,.05,100),lookAtMatrix(eye,target));
    const clip=transformPoint(viewProjection,target);
    expect(clip[3]).toBeGreaterThan(0);
    expect(clip[0]/clip[3]).toBeCloseTo(0,6);
    expect(clip[1]/clip[3]).toBeCloseTo(0,6);
    expect(Math.abs(clip[2]/clip[3])).toBeLessThanOrEqual(1);
  });

  test('the fitted Luis 10 by 11 kitchen projects into the visible 3D viewport',()=>{
    const project=createLuisTenByElevenKitchen();
    const boxes=buildSceneBoxes(project.objects).filter(box=>box.kind!=='floor');
    const bounds=sceneBounds3D(boxes);
    const camera=fit3DCamera(project,{width:960,height:640});
    const yaw=camera.yaw*Math.PI/180,pitch=camera.pitch*Math.PI/180,distance=camera.distance/24;
    const target:Vec3=[camera.target.x/24,bounds.center[1],camera.target.y/24];
    const eye:Vec3=[target[0]+Math.cos(pitch)*Math.sin(yaw)*distance,target[1]+Math.sin(pitch)*distance,target[2]+Math.cos(pitch)*Math.cos(yaw)*distance];
    const viewProjection=multiplyMat4(perspectiveMatrix(Math.PI/4,960/640,.03,120),lookAtMatrix(eye,target));
    const visible=boxes.filter(box=>{
      const clip=transformPoint(viewProjection,box.center);
      if(clip[3]<=0)return false;
      const x=clip[0]/clip[3],y=clip[1]/clip[3],z=clip[2]/clip[3];
      return [x,y,z].every(Number.isFinite)&&Math.abs(x)<=1.15&&Math.abs(y)<=1.15&&z>=-1.15&&z<=1.15;
    });
    expect(boxes.length).toBeGreaterThan(10);
    expect(visible.length).toBeGreaterThan(boxes.length*.55);
  });
});
