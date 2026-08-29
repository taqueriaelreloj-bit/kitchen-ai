import { applyCabinetRun, generateCabinetRun } from '../domain/cabinetRun';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, moveOpeningAlongWall, setWindowSillHeight } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`run-fill-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

function projectWithWall(widthIn=144,rotation=0){
  let project=createEditorProject(room,design);
  const wall=objectDefaults('wall',{id:'fill-wall',name:'Fill Wall',x:100,y:100,widthIn,depthIn:4.5,heightIn:96,rotation});
  project={...project,objects:[wall],selectedId:wall.id};
  return project;
}

describe('Fill Wall cabinet generator',()=>{
  test('fills a standard wall with standard widths and high utilization',()=>{
    const project=projectWithWall(120);
    const run=generateCabinetRun(project,'fill-wall',{level:'base'});
    expect(run.generated.length).toBeGreaterThan(0);
    expect(run.generated.every(object=>[36,33,30,27,24,21,18,15,12,9].includes(object.widthIn))).toBe(true);
    expect(run.totalCabinetIn).toBe(120);
    expect(run.utilizationPercent).toBe(100);
    expect(run.generated.some(object=>object.kind==='sink-base')).toBe(true);
  });

  test('keeps all base and wall cabinets clear of a door opening',()=>{
    let project=projectWithWall(144);
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    project=moveOpeningAlongWall(project,door.id,48);
    for(const level of ['base','wall'] as const){
      const run=generateCabinetRun(project,'fill-wall',{level,sideClearanceIn:3});
      const blockedStart=45,blockedEnd=48+door.widthIn+3;
      const wall=project.objects.find(object=>object.id==='fill-wall')!;
      const angle=wall.rotation*Math.PI/180,unit={x:Math.cos(angle),y:Math.sin(angle)};
      const along=(object:any)=>{
        const center={x:object.x+object.widthIn/2,y:object.y+object.depthIn/2};
        return(center.x-wall.x)*unit.x+(center.y-wall.y)*unit.y;
      };
      expect(run.generated.some(object=>{
        const center=along(object);
        return center-object.widthIn/2<blockedEnd&&center+object.widthIn/2>blockedStart;
      })).toBe(false);
    }
  });

  test('allows base cabinets below a high window but blocks wall cabinets',()=>{
    let project=projectWithWall(144);
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=moveOpeningAlongWall(project,window.id,42);
    project=setWindowSillHeight(project,window.id,44);
    const base=generateCabinetRun(project,'fill-wall',{level:'base'});
    const upper=generateCabinetRun(project,'fill-wall',{level:'wall'});
    expect(base.totalCabinetIn).toBeGreaterThan(upper.totalCabinetIn);
    expect(base.availableIntervals).toHaveLength(1);
    expect(upper.availableIntervals.length).toBeGreaterThanOrEqual(1);
  });

  test('blocks base cabinets when the window sill is below counter height',()=>{
    let project=projectWithWall(144);
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=moveOpeningAlongWall(project,window.id,42);
    project=setWindowSillHeight(project,window.id,30);
    const run=generateCabinetRun(project,'fill-wall',{level:'base',windowBaseSillMinimumIn:38});
    expect(run.totalCabinetIn).toBeLessThan(144);
  });

  test('aligns generated cabinets to an angled wall',()=>{
    const project=projectWithWall(120,45);
    const run=generateCabinetRun(project,'fill-wall',{level:'base'});
    expect(run.generated.every(object=>object.rotation===45)).toBe(true);
    expect(new Set(run.generated.map(object=>`${object.x},${object.y}`)).size).toBe(run.generated.length);
  });

  test('creates wall cabinets with standard elevation and no toe kick',()=>{
    const project=projectWithWall(96);
    const run=generateCabinetRun(project,'fill-wall',{level:'wall'});
    expect(run.generated.every(object=>object.kind==='wall-cabinet')).toBe(true);
    expect(run.generated.every(object=>object.elevationIn===54)).toBe(true);
    expect(run.generated.every(object=>object.toeKick===undefined)).toBe(true);
  });

  test('applies the generated run through the shared project model',()=>{
    const project=projectWithWall(96);
    const run=generateCabinetRun(project,'fill-wall',{level:'base',idPrefix:'client-run'});
    const next=applyCabinetRun(project,run);
    expect(next.objects.length).toBe(project.objects.length+run.generated.length);
    expect(next.selectedId).toBe(run.generated[0].id);
    expect(next.updatedAt).not.toBe(project.updatedAt);
  });

  test('respects a user-defined start and end range',()=>{
    const project=projectWithWall(144);
    const run=generateCabinetRun(project,'fill-wall',{level:'base',startOffsetIn:24,endOffsetIn:120});
    expect(run.totalAvailableIn).toBe(96);
    expect(run.totalCabinetIn).toBe(96);
  });
});
