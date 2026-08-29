import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import { addWall, closeWallLoop, connectedWallIds, continueWall, deleteWall, wallEnd } from '../domain/walls';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`wall-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Wall Drawing Test');

describe('continuous wall drawing',()=>{
  test('adds and selects a new wall with standard dimensions',()=>{
    const current=addWall(project(),{start:{x:300,y:220},lengthIn:144,heightIn:108,thicknessIn:5.5});
    const wall=current.objects.find(object=>object.id===current.selectedId)!;
    expect(wall.kind).toBe('wall');
    expect(wall).toMatchObject({x:300,y:220,widthIn:144,heightIn:108,depthIn:5.5});
  });

  test('continues exactly from the selected wall endpoint',()=>{
    let current=project();
    const source=objectDefaults('wall',{id:'source-wall',x:100,y:100,widthIn:120,rotation:0,heightIn:102,depthIn:5});
    current={...current,objects:[...current.objects,source],selectedId:source.id};
    current=continueWall(current);
    const next=current.objects.find(object=>object.id===current.selectedId)!;
    expect(next.x).toBeCloseTo(wallEnd(source).x);
    expect(next.y).toBeCloseTo(wallEnd(source).y);
    expect(next.heightIn).toBe(102);
    expect(next.depthIn).toBe(5);
  });

  test('turns left and right by ninety degrees',()=>{
    let current=project();
    const source=objectDefaults('wall',{id:'turn-source',x:100,y:100,widthIn:96,rotation:0});
    current={...current,objects:[...current.objects,source],selectedId:source.id};
    const left=continueWall(current,source.id,-90,72);
    const leftWall=left.objects.find(object=>object.id===left.selectedId)!;
    expect(leftWall.rotation).toBe(270);
    expect(leftWall.widthIn).toBe(72);
    const right=continueWall(current,source.id,90,72);
    expect(right.objects.find(object=>object.id===right.selectedId)?.rotation).toBe(90);
  });

  test('closes a wall chain toward the nearest existing endpoint',()=>{
    let current=project();
    const a=objectDefaults('wall',{id:'a',x:100,y:100,widthIn:100,rotation:0});
    const b=objectDefaults('wall',{id:'b',x:200,y:100,widthIn:80,rotation:90});
    const c=objectDefaults('wall',{id:'c',x:200,y:180,widthIn:100,rotation:180});
    current={...current,objects:[a,b,c],selectedId:c.id};
    current=closeWallLoop(current,c.id);
    const closing=current.objects.find(object=>object.id===current.selectedId)!;
    expect(wallEnd(closing).x).toBeCloseTo(100);
    expect(wallEnd(closing).y).toBeCloseTo(100);
    expect(closing.widthIn).toBeCloseTo(80);
  });

  test('detects connected wall runs',()=>{
    const a=objectDefaults('wall',{id:'a',x:0,y:0,widthIn:100,rotation:0});
    const b=objectDefaults('wall',{id:'b',x:100,y:0,widthIn:80,rotation:90});
    const c=objectDefaults('wall',{id:'c',x:400,y:400,widthIn:60,rotation:0});
    const current={...project(),objects:[a,b,c]};
    expect([...connectedWallIds(current)].sort()).toEqual(['a','b']);
  });

  test('deleting a wall deletes or detaches its openings according to policy',()=>{
    let current=project();
    current={...current,selectedId:'wall-north'};
    current=addOpening(current,'door');
    const door=current.objects.find(object=>object.kind==='door')!;
    expect(openingData(door).parentWallId).toBe('wall-north');
    const deleted=deleteWall(current,'wall-north','delete');
    expect(deleted.objects.some(object=>object.id===door.id)).toBe(false);
    const detached=deleteWall(current,'wall-north','detach');
    expect(detached.objects.some(object=>object.id===door.id)).toBe(true);
    expect(openingData(detached.objects.find(object=>object.id===door.id)!).parentWallId).toBeUndefined();
  });
});
