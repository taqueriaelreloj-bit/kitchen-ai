import { createIsland, updateIsland } from '../domain/countertops';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import { analyzeWorkTriangle, workTriangleLayoutIssues } from '../domain/workTriangle';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`triangle-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

function triangleProject(){
  const base=createEditorProject(room,design);
  return{
    ...base,
    objects:[
      objectDefaults('sink-base',{id:'sink',name:'Sink Base',x:0,y:0,widthIn:36,depthIn:24}),
      objectDefaults('appliance',{id:'range',name:'Range',x:72,y:0,widthIn:30,depthIn:28}),
      objectDefaults('appliance',{id:'fridge',name:'Refrigerator',x:72,y:72,widthIn:36,depthIn:30}),
    ],
  };
}

describe('kitchen work-triangle validation',()=>{
  test('identifies sink, range and refrigerator work points',()=>{
    const result=analyzeWorkTriangle(triangleProject());
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.points.sink?.objectId).toBe('sink');
    expect(result.points.range?.objectId).toBe('range');
    expect(result.points.refrigerator?.objectId).toBe('fridge');
    expect(result.legs).toHaveLength(3);
    expect(result.totalFt).toBeGreaterThan(0);
  });

  test('reports missing work zones without crashing',()=>{
    const project=createEditorProject(room,design);
    const result=analyzeWorkTriangle({...project,objects:[objectDefaults('sink-base',{id:'sink'})]});
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['range','refrigerator']);
    expect(workTriangleLayoutIssues({...project,objects:[objectDefaults('sink-base',{id:'sink'})]}).map(issue=>issue.code)).toEqual(['missing-range','missing-refrigerator']);
  });

  test('warns when a leg is too short',()=>{
    const project=triangleProject();
    const short={...project,objects:project.objects.map(object=>object.id==='range'?{...object,x:24,y:0}:object)};
    const result=analyzeWorkTriangle(short);
    expect(result.warnings.some(warning=>warning.rule==='short-leg'&&warning.objectIds.includes('range'))).toBe(true);
  });

  test('warns when a leg or total is too long',()=>{
    const project=triangleProject();
    const long={...project,objects:project.objects.map(object=>object.id==='fridge'?{...object,x:360,y:360}:object)};
    const result=analyzeWorkTriangle(long);
    expect(result.warnings.some(warning=>warning.rule==='long-leg')).toBe(true);
    expect(result.warnings.some(warning=>warning.rule==='total-long')).toBe(true);
  });

  test('recognizes a sink and cooktop configured in an island',()=>{
    let project=createEditorProject(room,{...design,includesIsland:false});
    const island=createIsland({id:'island-sink',x:120,y:120,widthIn:84,depthIn:42});
    project={...project,objects:[island,objectDefaults('appliance',{id:'fridge',name:'Refrigerator',x:260,y:120})],selectedId:island.id};
    project=updateIsland(project,island.id,{sink:true,cooktop:true});
    const result=analyzeWorkTriangle(project);
    expect(result.complete).toBe(true);
    expect(result.points.sink?.objectId).toBe(island.id);
    expect(result.points.range?.objectId).toBe(island.id);
  });

  test('prefers a real appliance over an appliance cabinet',()=>{
    const project=triangleProject();
    const withCabinets={...project,objects:[objectDefaults('oven-cabinet',{id:'oven-cabinet'}),objectDefaults('refrigerator-cabinet',{id:'fridge-cabinet'}),...project.objects]};
    const result=analyzeWorkTriangle(withCabinets);
    expect(result.points.range?.objectId).toBe('range');
    expect(result.points.refrigerator?.objectId).toBe('fridge');
  });

  test('camera and zoom state do not change work-triangle measurements',()=>{
    const project=triangleProject();
    const changed={...project,view2d:{...project.view2d,zoom:2,pan:{x:800,y:-600}},camera3d:{distance:1000,yaw:75,pitch:70,target:{x:900,y:700}}};
    expect(analyzeWorkTriangle(changed)).toEqual(analyzeWorkTriangle(project));
  });

  test('returns a passed info issue for a valid configurable triangle',()=>{
    const project=triangleProject();
    const issues=workTriangleLayoutIssues(project);
    if(analyzeWorkTriangle(project).warnings.length===0)expect(issues.some(issue=>issue.code==='work-triangle-passed')).toBe(true);
    else expect(issues.some(issue=>issue.code==='work-triangle-passed')).toBe(false);
  });
});
