import { updateCountertop } from '../domain/countertops';
import { buildContinuousSceneBoxes } from '../domain/continuousScene';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`continuous-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('continuous countertop scene builder',()=>{
  test('replaces adjacent individual caps with one continuous slab',()=>{
    const objects=[
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),
      objectDefaults('drawer-base',{id:'b',x:130,y:100,widthIn:24}),
      objectDefaults('sink-base',{id:'c',x:154,y:100,widthIn:36}),
    ];
    const boxes=buildContinuousSceneBoxes(objects);
    expect(boxes.filter(box=>box.id.startsWith('countertop-run-')&&!box.id.includes('backsplash'))).toHaveLength(1);
    expect(boxes.some(box=>box.id==='a-counter-cap'||box.id==='b-counter-cap'||box.id==='c-counter-cap')).toBe(false);
    expect(boxes.some(box=>box.id==='c-sink'&&box.kind==='fixture')).toBe(true);
  });

  test('keeps separated cabinet slabs independent',()=>{
    const objects=[
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),
      objectDefaults('base-cabinet',{id:'b',x:145,y:100,widthIn:30}),
    ];
    const boxes=buildContinuousSceneBoxes(objects);
    expect(boxes.some(box=>box.id==='a-counter-cap')).toBe(true);
    expect(boxes.some(box=>box.id==='b-counter-cap')).toBe(true);
    expect(boxes.some(box=>box.id.startsWith('countertop-run-'))).toBe(false);
  });

  test('does not merge adjacent cabinets with different slab materials',()=>{
    let project=createEditorProject(room,design);
    const a=objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30});
    const b=objectDefaults('base-cabinet',{id:'b',x:130,y:100,widthIn:30});
    project={...project,objects:[a,b],selectedId:a.id};
    project=updateCountertop(project,a.id,{materialId:'quartz-white'});
    project={...project,selectedId:b.id};
    project=updateCountertop(project,b.id,{materialId:'granite-black'});
    const boxes=buildContinuousSceneBoxes(project.objects);
    expect(boxes.some(box=>box.id==='a-counter-cap')).toBe(true);
    expect(boxes.some(box=>box.id==='b-counter-cap')).toBe(true);
  });

  test('preserves non-countertop geometry',()=>{
    const wall=objectDefaults('wall',{id:'wall'});
    const cabinetA=objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30});
    const cabinetB=objectDefaults('base-cabinet',{id:'b',x:130,y:100,widthIn:30});
    const boxes=buildContinuousSceneBoxes([wall,cabinetA,cabinetB]);
    expect(boxes.some(box=>box.sourceId==='wall'&&box.kind==='wall')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='a'&&box.kind==='cabinet')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='b'&&box.kind==='cabinet')).toBe(true);
  });

  test('keeps vertical runs on the established individual geometry path for now',()=>{
    const objects=[
      objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30,rotation:90}),
      objectDefaults('base-cabinet',{id:'b',x:100,y:130,widthIn:30,rotation:90}),
    ];
    const boxes=buildContinuousSceneBoxes(objects);
    expect(boxes.some(box=>box.id==='a-counter-cap')).toBe(true);
    expect(boxes.some(box=>box.id==='b-counter-cap')).toBe(true);
  });
});
