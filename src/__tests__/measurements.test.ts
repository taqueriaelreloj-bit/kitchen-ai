import { createEditorProject, objectDefaults, updateObject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import {
  addMeasurement,
  createObjectClearance,
  createObjectDimension,
  createPointMeasurement,
  deleteMeasurement,
  formatMeasurement,
  projectMeasurements,
  removeMeasurementsForDeletedObjects,
  resolveMeasurement,
  resolveProjectMeasurements,
  updateMeasurement,
} from '../domain/measurements';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`measure-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('linked plan measurement annotations',()=>{
  test('measures object width and depth using rotated anchors',()=>{
    let project=createEditorProject(room,design);
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:36,depthIn:24,rotation:90});
    project={...project,objects:[cabinet]};
    project=addMeasurement(project,createObjectDimension(cabinet.id,'width'));
    project=addMeasurement(project,createObjectDimension(cabinet.id,'depth'));
    const resolved=resolveProjectMeasurements(project);
    expect(resolved[0].distanceIn).toBeCloseTo(36);
    expect(resolved[1].distanceIn).toBeCloseTo(24);
    expect(resolved.every(item=>item.valid)).toBe(true);
  });

  test('linked measurements update automatically after movement and resize',()=>{
    let project=createEditorProject(room,design);
    const first=objectDefaults('base-cabinet',{id:'first',x:100,y:100,widthIn:30}),second=objectDefaults('base-cabinet',{id:'second',x:160,y:100,widthIn:30});
    project={...project,objects:[first,second]};
    project=addMeasurement(project,createObjectClearance(first.id,second.id));
    const before=resolveProjectMeasurements(project)[0].distanceIn;
    project=updateObject(project,second.id,{x:220,widthIn:42});
    const after=resolveProjectMeasurements(project)[0].distanceIn;
    expect(after).toBeGreaterThan(before);
    project=addMeasurement(project,createObjectDimension(second.id,'width'));
    expect(resolveProjectMeasurements(project)[1].distanceIn).toBeCloseTo(42);
  });

  test('supports direct, horizontal and vertical point measurements',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createPointMeasurement({x:0,y:0},{x:30,y:40},'direct','Direct'));
    project=addMeasurement(project,createPointMeasurement({x:0,y:0},{x:30,y:40},'horizontal','Horizontal'));
    project=addMeasurement(project,createPointMeasurement({x:0,y:0},{x:30,y:40},'vertical','Vertical'));
    const values=resolveProjectMeasurements(project).map(item=>item.distanceIn);
    expect(values).toEqual([50,30,40]);
  });

  test('formats feet and inches using configurable precision',()=>{
    expect(formatMeasurement(36)).toBe(`3' 0\"`);
    expect(formatMeasurement(30.5,.125)).toBe(`2' 6.5\"`);
    expect(formatMeasurement(7.24,.25)).toBe(`7.25\"`);
  });

  test('updates visibility, offset and deletes one annotation',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createPointMeasurement({x:0,y:0},{x:24,y:0}));
    const id=projectMeasurements(project)[0].id;
    project=updateMeasurement(project,id,{visible:false,offsetIn:8,name:'Hidden Dimension'});
    expect(projectMeasurements(project)[0]).toMatchObject({visible:false,offsetIn:8,name:'Hidden Dimension'});
    expect(resolveProjectMeasurements(project)).toEqual([]);
    project=deleteMeasurement(project,id);
    expect(projectMeasurements(project)).toEqual([]);
  });

  test('reports a missing linked object without throwing',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createObjectDimension('missing','width'));
    const annotation=projectMeasurements(project)[0],resolved=resolveMeasurement(project,annotation);
    expect(resolved.valid).toBe(false);
    expect(resolved.missingObjectIds).toEqual(['missing']);
  });

  test('removes annotations when their linked objects are deleted',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createObjectDimension('base-1','width'));
    project=addMeasurement(project,createPointMeasurement({x:0,y:0},{x:12,y:0}));
    project=removeMeasurementsForDeletedObjects(project,['base-1']);
    expect(projectMeasurements(project)).toHaveLength(1);
    expect(projectMeasurements(project)[0].start.type).toBe('point');
  });

  test('persists measurements through project JSON because metadata stays in design',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createObjectDimension('base-1','width','Base Width'));
    project=addMeasurement(project,createPointMeasurement({x:10,y:20},{x:40,y:60},'direct','Field Check'));
    const loaded=parseProject(serializeProject(project))!;
    expect(projectMeasurements(loaded)).toHaveLength(2);
    expect(projectMeasurements(loaded).map(item=>item.name)).toEqual(['Base Width','Field Check']);
    expect(resolveProjectMeasurements(loaded).every(item=>item.valid)).toBe(true);
  });

  test('zoom and camera do not alter real measurement values',()=>{
    let project=createEditorProject(room,design);
    project=addMeasurement(project,createObjectDimension('base-1','width'));
    const before=resolveProjectMeasurements(project)[0];
    const changed={...project,view2d:{...project.view2d,zoom:2,pan:{x:900,y:-600}},camera3d:{distance:1000,yaw:70,pitch:75,target:{x:800,y:700}}};
    expect(resolveProjectMeasurements(changed)[0]).toEqual(before);
  });

  test('does not mutate the source project or annotation objects',()=>{
    const project=createEditorProject(room,design),annotation=createPointMeasurement({x:0,y:0},{x:12,y:0}),before=JSON.stringify(project);
    const next=addMeasurement(project,annotation);
    expect(JSON.stringify(project)).toBe(before);
    expect(next).not.toBe(project);
    expect(projectMeasurements(next)[0].start).not.toBe(annotation.start);
  });
});
