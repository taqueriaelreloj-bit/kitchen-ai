import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';
import {
  buildProfessional3DScene,
  professionalCameraForView,
  professionalRoomBounds,
  professionalWallOpacity,
} from '../domain/professional3d';

describe('professional dollhouse 3D',()=>{
  test('builds a room-sized floor, site grid, complete wall shell and contact shadows',()=>{
    const project=createLuisTenByElevenKitchen();
    const bounds=professionalRoomBounds(project);
    const scene=buildProfessional3DScene(project);
    expect(bounds.width).toBeGreaterThanOrEqual(120);
    expect(bounds.height).toBeGreaterThanOrEqual(132);
    expect(scene.areaSqFt).toBe(110);
    expect(scene.boxes.some(box=>box.surface==='site-grid')).toBe(true);
    expect(scene.boxes.some(box=>box.surface==='wood-floor')).toBe(true);
    expect(scene.boxes.some(box=>box.surface==='shadow')).toBe(true);
    expect(scene.boxes.some(box=>box.id==='professional-room-wall-east')).toBe(true);
    expect(scene.boxes.some(box=>box.id==='professional-room-wall-south')).toBe(true);
    expect(scene.boxes.filter(box=>box.id.startsWith('professional-baseboard-'))).toHaveLength(4);
    const floor=scene.boxes.find(box=>box.surface==='wood-floor')!;
    expect(floor.size[0]*24).toBeCloseTo(bounds.width,4);
    expect(floor.size[2]*24).toBeCloseTo(bounds.height,4);
  });

  test('creates camera presets that match design-review workflows',()=>{
    const project=createLuisTenByElevenKitchen();
    const viewport={width:1000,height:680};
    const dollhouse=professionalCameraForView(project,'dollhouse',viewport);
    const visit=professionalCameraForView(project,'visit',viewport);
    const wall=professionalCameraForView(project,'wall',viewport);
    const top=professionalCameraForView(project,'top',viewport);
    expect(dollhouse.yaw).toBe(-42);
    expect(dollhouse.pitch).toBe(36);
    expect(top.pitch).toBe(76);
    expect(visit.pitch).toBeLessThan(20);
    expect(wall.pitch).toBeLessThan(12);
    for(const camera of [dollhouse,visit,wall,top]){
      expect(camera.distance).toBeGreaterThanOrEqual(120);
      expect(camera.distance).toBeLessThanOrEqual(1100);
      expect(Number.isFinite(camera.target.x)).toBe(true);
      expect(Number.isFinite(camera.target.y)).toBe(true);
    }
  });

  test('dollhouse mode fades camera-side walls while preserving rear kitchen walls',()=>{
    const project=createLuisTenByElevenKitchen();
    const scene=buildProfessional3DScene(project);
    const walls=scene.boxes.filter(box=>box.surface==='wall');
    const opacities=walls.map(box=>professionalWallOpacity(box,-42,'dollhouse',scene.sceneCenter));
    expect(opacities.some(value=>value<.5)).toBe(true);
    expect(opacities.some(value=>value>.8)).toBe(true);
    const north=walls.find(box=>box.roomSide==='north');
    const south=walls.find(box=>box.roomSide==='south');
    expect(north&&professionalWallOpacity(north,-42,'dollhouse',scene.sceneCenter)).toBeGreaterThan(.8);
    expect(south&&professionalWallOpacity(south,-42,'dollhouse',scene.sceneCenter)).toBeLessThan(.5);
  });
});
