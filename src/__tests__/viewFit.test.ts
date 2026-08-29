import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import { centerProject2D, fitCurrentView, fitProject2D, fitProject3D, objectVisualBounds, projectVisualBounds } from '../domain/viewFit';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`fit-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('dynamic Fit Plan and Fit View',()=>{
  test('fits the real 2D object bounds inside a viewport',()=>{
    const project=createEditorProject(room,design);
    const viewport={width:1200,height:760};
    const fitted=fitProject2D(project,viewport,40);
    const bounds=projectVisualBounds(project.objects);
    const left=bounds.left*fitted.view2d.zoom+fitted.view2d.pan.x;
    const right=bounds.right*fitted.view2d.zoom+fitted.view2d.pan.x;
    const top=bounds.top*fitted.view2d.zoom+fitted.view2d.pan.y;
    const bottom=bounds.bottom*fitted.view2d.zoom+fitted.view2d.pan.y;
    expect(left).toBeGreaterThanOrEqual(39);
    expect(right).toBeLessThanOrEqual(viewport.width-39);
    expect(top).toBeGreaterThanOrEqual(39);
    expect(bottom).toBeLessThanOrEqual(viewport.height-39);
  });

  test('center plan preserves zoom while moving the visual center',()=>{
    const project={...createEditorProject(room,design),view2d:{...createEditorProject(room,design).view2d,zoom:1.4,pan:{x:300,y:-200}}};
    const viewport={width:900,height:600};
    const centered=centerProject2D(project,viewport);
    const bounds=projectVisualBounds(project.objects);
    expect(centered.view2d.zoom).toBe(1.4);
    expect(bounds.centerX*1.4+centered.view2d.pan.x).toBeCloseTo(viewport.width/2);
    expect(bounds.centerY*1.4+centered.view2d.pan.y).toBeCloseTo(viewport.height/2);
  });

  test('rotated visual bounds account for quarter-turn dimensions',()=>{
    const object=objectDefaults('base-cabinet',{widthIn:36,depthIn:24,rotation:90,x:100,y:100});
    const bounds=objectVisualBounds(object);
    expect(bounds.height).toBeCloseTo(36*.45);
    expect(bounds.width).toBeCloseTo(24*.45);
  });

  test('3D fit targets scene geometry instead of the fixed floor',()=>{
    const project=createEditorProject(room,design);
    const fitted=fitProject3D(project);
    expect(fitted.camera3d.target).not.toEqual({x:0,y:0});
    expect(fitted.camera3d.distance).toBeGreaterThanOrEqual(220);
    expect(fitted.camera3d.distance).toBeLessThanOrEqual(1100);
    expect(fitted.objects).toBe(project.objects);
  });

  test('a larger modeled kitchen requires a farther 3D camera',()=>{
    const small={...createEditorProject(room,design),objects:[objectDefaults('base-cabinet',{x:100,y:100,widthIn:24})]};
    const large={...small,objects:[...small.objects,objectDefaults('wall',{id:'long-wall',x:50,y:50,widthIn:300}),objectDefaults('island',{id:'large-island',x:300,y:300,widthIn:120,depthIn:60})]};
    expect(fitProject3D(large).camera3d.distance).toBeGreaterThan(fitProject3D(small).camera3d.distance);
  });

  test('Fit Current View dispatches to the active viewport only',()=>{
    const project=createEditorProject(room,design);
    const twoD=fitCurrentView({...project,viewMode:'2d'},{width:800,height:600});
    const threeD=fitCurrentView({...project,viewMode:'3d'},{width:800,height:600});
    expect(twoD.view2d).not.toEqual(project.view2d);
    expect(twoD.camera3d).toEqual(project.camera3d);
    expect(threeD.camera3d).not.toEqual(project.camera3d);
    expect(threeD.view2d).toEqual(project.view2d);
  });
});
