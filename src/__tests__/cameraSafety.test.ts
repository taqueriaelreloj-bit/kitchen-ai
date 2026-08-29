import { cameraDistanceLimits, cameraWorldPosition, centerCameraOnProject, fitCameraToProject, focusCameraOnObject, sanitizeCamera } from '../domain/cameraSafety';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`camera-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Camera Safety');

describe('3D camera safety',()=>{
  test('clamps unsafe pitch, distance and target values',()=>{
    const current=project();
    const result=sanitizeCamera(current,{distance:99999,yaw:725,pitch:-30,target:{x:-99999,y:99999}});
    const limits=cameraDistanceLimits(current);
    expect(result.corrected).toBe(true);
    expect(result.reasons).toEqual(expect.arrayContaining(['pitch','distance','target']));
    expect(result.camera.pitch).toBe(8);
    expect(result.camera.distance).toBeLessThanOrEqual(limits.maximum);
    expect(result.camera.yaw).toBe(5);
    expect(cameraWorldPosition(result.camera).y).toBeGreaterThan(0);
  });

  test('keeps normal camera values stable',()=>{
    const current=project();
    const result=sanitizeCamera(current,current.camera3d);
    expect(result.camera.pitch).toBe(current.camera3d.pitch);
    expect(result.camera.yaw).toBe(current.camera3d.yaw);
    expect(result.camera.target).toEqual(current.camera3d.target);
    expect(result.camera.distance).toBeGreaterThan(0);
  });

  test('fit view targets the center of real project bounds',()=>{
    let current=project();
    const island=objectDefaults('island',{id:'far-island',x:600,y:480,widthIn:84,depthIn:42});
    current={...current,objects:[...current.objects,island]};
    const fit=fitCameraToProject(current);
    expect(fit.target.x).toBeGreaterThan(300);
    expect(fit.target.y).toBeGreaterThan(200);
    expect(fit.distance).toBeGreaterThan(cameraDistanceLimits(current).minimum);
    expect(fit.distance).toBeLessThanOrEqual(cameraDistanceLimits(current).maximum);
  });

  test('center preserves distance while retargeting the project',()=>{
    let current=project();
    current={...current,camera3d:{distance:640,yaw:10,pitch:35,target:{x:999,y:999}}};
    const centered=centerCameraOnProject(current,current.camera3d);
    expect(centered.distance).toBe(640);
    expect(centered.target).not.toEqual({x:999,y:999});
  });

  test('focus targets a selected object and chooses a reasonable distance',()=>{
    let current=project();
    const pantry=objectDefaults('pantry-cabinet',{id:'focus-pantry',x:430,y:320,widthIn:36,heightIn:84,depthIn:24});
    current={...current,objects:[...current.objects,pantry]};
    const focused=focusCameraOnObject(current,pantry.id);
    expect(focused.target).toEqual({x:448,y:332});
    expect(focused.distance).toBeGreaterThanOrEqual(cameraDistanceLimits(current).minimum);
    expect(focused.pitch).toBeGreaterThanOrEqual(18);
  });

  test('returns a safe camera when focus target is missing',()=>{
    const current=project();
    const focused=focusCameraOnObject(current,'missing-object',{distance:5,yaw:0,pitch:95,target:{x:0,y:0}});
    expect(focused.distance).toBeGreaterThanOrEqual(cameraDistanceLimits(current).minimum);
    expect(focused.pitch).toBe(76);
  });
});
