import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, attachOpening, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import {
  connectedWallIds,
  continueWall,
  continueWallToPoint,
  createWallSegment,
  moveWallEnd,
  moveWallStart,
  snapWallEndpoint,
  wallConnections,
  wallEndpoints,
} from '../domain/wallDrawing';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`wall-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('connected wall drawing',()=>{
  test('creates a wall from two plan points with real length and angle',()=>{
    const wall=createWallSegment({x:10,y:20},{x:40,y:60},{id:'segment',heightIn:108,thicknessIn:6});
    expect(wall).toMatchObject({id:'segment',kind:'wall',x:10,y:20,widthIn:50,heightIn:108,depthIn:6});
    expect(wall.rotation).toBeCloseTo(53.13,2);
    expect(wallEndpoints(wall).end.x).toBeCloseTo(40,1);
    expect(wallEndpoints(wall).end.y).toBeCloseTo(60,1);
  });

  test('continues from the exact end of a selected wall',()=>{
    const project=createEditorProject(room,design);
    const source=project.objects.find(object=>object.id==='wall-north')!;
    const sourceEnd=wallEndpoints(source).end;
    const next=continueWall(project,source.id,72,90);
    const continued=next.objects.find(object=>object.id===next.selectedId)!;
    expect(continued.name).toBe('Continued Wall');
    expect(continued.x).toBeCloseTo(sourceEnd.x);
    expect(continued.y).toBeCloseTo(sourceEnd.y);
    expect(continued.rotation).toBeCloseTo(source.rotation+90);
    expect(continued.widthIn).toBe(72);
  });

  test('continues to a snapped orthogonal or diagonal point',()=>{
    const project=createEditorProject(room,design);
    const source=project.objects.find(object=>object.id==='wall-north')!;
    const start=wallEndpoints(source).end;
    const raw={x:start.x+40,y:start.y+12};
    const snapped=snapWallEndpoint(start,raw,45);
    const next=continueWallToPoint(project,source.id,raw,45);
    const wall=next.objects.find(object=>object.id===next.selectedId)!;
    expect(wallEndpoints(wall).end.x).toBeCloseTo(snapped.x);
    expect(wallEndpoints(wall).end.y).toBeCloseTo(snapped.y);
    expect(Math.abs(wall.rotation)%45).toBeCloseTo(0);
  });

  test('moving a wall end recalculates length and reclamps attached openings',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=attachOpening(project,window.id,'wall-north',10_000);
    const wall=project.objects.find(object=>object.id==='wall-north')!;
    const start=wallEndpoints(wall).start;
    project=moveWallEnd(project,wall.id,{x:start.x+90,y:start.y});
    const changed=project.objects.find(object=>object.id===wall.id)!;
    const changedWindow=project.objects.find(object=>object.id===window.id)!;
    expect(changed.widthIn).toBe(90);
    expect(openingData(changedWindow).wallOffsetIn).toBeLessThanOrEqual(90-changedWindow.widthIn);
    expect(changedWindow.rotation).toBe(changed.rotation);
  });

  test('moving a wall start keeps the old end fixed and shifts opening offset',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    project=attachOpening(project,door.id,'wall-north',48);
    const wall=project.objects.find(object=>object.id==='wall-north')!;
    const oldEnd=wallEndpoints(wall).end;
    project=moveWallStart(project,wall.id,{x:wall.x+12,y:wall.y});
    const changed=project.objects.find(object=>object.id===wall.id)!;
    const changedDoor=project.objects.find(object=>object.id===door.id)!;
    expect(wallEndpoints(changed).end.x).toBeCloseTo(oldEnd.x);
    expect(wallEndpoints(changed).end.y).toBeCloseTo(oldEnd.y);
    expect(openingData(changedDoor).wallOffsetIn).toBeCloseTo(36);
  });

  test('detects wall junctions and connected chains',()=>{
    const a=createWallSegment({x:0,y:0},{x:100,y:0},{id:'a'});
    const b=createWallSegment({x:100,y:0},{x:100,y:80},{id:'b'});
    const c=createWallSegment({x:100,y:80},{x:30,y:80},{id:'c'});
    const isolated=createWallSegment({x:500,y:500},{x:550,y:500},{id:'isolated'});
    expect(wallConnections(a,[a,b,c,isolated]).some(connection=>connection.wallId==='b')).toBe(true);
    expect(new Set(connectedWallIds('a',[a,b,c,isolated]))).toEqual(new Set(['a','b','c']));
  });

  test('rejects a zero-length wall without changing the project',()=>{
    expect(()=>createWallSegment({x:10,y:10},{x:10,y:10})).toThrow('0.25 inches');
    const project=createEditorProject(room,design);
    expect(continueWall(project,'wall-north',0)).toBe(project);
    expect(continueWallToPoint(project,'wall-north',wallEndpoints(project.objects.find(object=>object.id==='wall-north')!).end)).toBe(project);
  });

  test('wall endpoints reject non-wall objects',()=>{
    expect(()=>wallEndpoints(objectDefaults('base-cabinet'))).toThrow('wall object');
  });
});
