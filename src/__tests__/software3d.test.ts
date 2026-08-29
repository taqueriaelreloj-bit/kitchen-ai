import { createLuisTenByElevenKitchen } from '../domain/luisKitchenDemo';
import { buildProfessional3DScene, professionalCameraForView } from '../domain/professional3d';
import { buildSoftware3DFrame, pickSoftware3DSource } from '../domain/software3d';

describe('compatible professional 3D renderer',()=>{
  test('projects a complete 10 by 11 kitchen into visible faces',()=>{
    const project=createLuisTenByElevenKitchen();
    const viewport={width:1100,height:720};
    const scene=buildProfessional3DScene(project);
    const camera=professionalCameraForView(project,'dollhouse',viewport);
    const frame=buildSoftware3DFrame(scene,camera,'dollhouse',viewport);
    expect(frame.faces.length).toBeGreaterThan(80);
    expect(frame.lines.length).toBeGreaterThan(30);
    expect(frame.faces.some(face=>face.surface==='wood-floor')).toBe(true);
    expect(frame.faces.some(face=>face.surface==='wall'&&face.opacity<.5)).toBe(true);
    expect(frame.faces.some(face=>face.sourceId==='refrigerator-far-right')).toBe(true);
    expect(frame.faces.some(face=>face.sourceId==='range-centered')).toBe(true);
    expect(frame.faces.some(face=>face.sourceId==='sink-island')).toBe(true);
    expect(frame.faces.every(face=>face.points.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)))).toBe(true);
  });

  test('selected objects receive visible face emphasis and remain pickable',()=>{
    const project={...createLuisTenByElevenKitchen(),selectedId:'sink-island'};
    const viewport={width:1000,height:680};
    const scene=buildProfessional3DScene(project);
    const camera=professionalCameraForView(project,'dollhouse',viewport);
    const frame=buildSoftware3DFrame(scene,camera,'dollhouse',viewport,project.selectedId);
    const selectedFaces=frame.faces.filter(face=>face.sourceId==='sink-island'&&face.selected);
    expect(selectedFaces.length).toBeGreaterThan(0);
    const face=selectedFaces.sort((a,b)=>a.depth-b.depth)[0];
    const x=face.points.reduce((sum,point)=>sum+point.x,0)/face.points.length;
    const y=face.points.reduce((sum,point)=>sum+point.y,0)/face.points.length;
    expect(pickSoftware3DSource(frame,x,y)).toBeTruthy();
  });
});
