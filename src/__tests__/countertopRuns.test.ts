import { updateCountertop } from '../domain/countertops';
import { continuousCountertopRuns, countertopRunObject } from '../domain/countertopRuns';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`counter-run-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('continuous countertop runs',()=>{
  test('joins adjacent base cabinets into one slab run',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'base-a',x:100,y:100,widthIn:30,depthIn:24}),
      objectDefaults('drawer-base',{id:'base-b',x:130,y:100,widthIn:24,depthIn:24}),
      objectDefaults('sink-base',{id:'base-c',x:154,y:100,widthIn:36,depthIn:24}),
    ];
    const runs=continuousCountertopRuns(cabinets);
    expect(runs).toHaveLength(1);
    expect(runs[0].ids).toEqual(['base-a','base-b','base-c']);
    expect(runs[0].widthIn).toBe(90);
    expect(runs[0].sinkSourceIds).toContain('base-c');
  });

  test('splits a run when the cabinet gap is too large',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),
      objectDefaults('base-cabinet',{id:'b',x:138,y:100,widthIn:30}),
    ];
    expect(continuousCountertopRuns(cabinets,2)).toHaveLength(2);
  });

  test('does not merge different countertop materials',()=>{
    let project=createEditorProject(room,design);
    const a=objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30});
    const b=objectDefaults('base-cabinet',{id:'b',x:130,y:100,widthIn:30});
    project={...project,objects:[a,b],selectedId:a.id};
    project=updateCountertop(project,a.id,{materialId:'quartz-white'});
    project={...project,selectedId:b.id};
    project=updateCountertop(project,b.id,{materialId:'granite-black'});
    expect(continuousCountertopRuns(project.objects)).toHaveLength(2);
  });

  test('groups a vertical cabinet run using rotation',()=>{
    const cabinets=[
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30,rotation:90}),
      objectDefaults('base-cabinet',{id:'b',x:100,y:130,widthIn:36,rotation:90}),
    ];
    const runs=continuousCountertopRuns(cabinets);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({x:100,y:100,widthIn:66,rotation:90});
  });

  test('keeps corner cabinets and islands out of straight runs',()=>{
    const objects=[
      objectDefaults('corner-cabinet',{id:'corner'}),
      objectDefaults('island',{id:'island'}),
      objectDefaults('base-cabinet',{id:'base'}),
    ];
    const runs=continuousCountertopRuns(objects);
    expect(runs).toHaveLength(1);
    expect(runs[0].ids).toEqual(['base']);
  });

  test('creates a serializable countertop object for rendering/export',()=>{
    const run=continuousCountertopRuns([
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),
      objectDefaults('base-cabinet',{id:'b',x:130,y:100,widthIn:30}),
    ])[0];
    const object=countertopRunObject(run);
    expect(object.kind).toBe('countertop');
    expect(object.widthIn).toBe(60);
    expect(object.heightIn).toBe(run.spec.thicknessIn);
    expect(JSON.parse(JSON.stringify(object)).id).toBe('countertop-run-a');
  });
});
