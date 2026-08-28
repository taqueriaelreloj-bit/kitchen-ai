import { applyAIDesignSuggestion, aiDesignSuggestions } from '../domain/aiDesign';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { validateKitchenLayout } from '../domain/designValidation';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Kitchen layout validation',()=>{
  test('flags missing sink range and refrigerator',()=>{
    const project=createEditorProject(room,design);
    const stripped={...project,objects:project.objects.filter(object=>object.kind==='wall'||object.kind==='wall-cabinet')};
    const ids=validateKitchenLayout(stripped).map(issue=>issue.id);
    expect(ids).toEqual(expect.arrayContaining(['missing-sink','missing-range','missing-refrigerator']));
  });
  test('detects overlapping floor objects',()=>{
    const project=createEditorProject(room,design);
    const a=objectDefaults('base-cabinet',{id:'a',x:150,y:150,widthIn:36,depthIn:24});
    const b=objectDefaults('appliance',{id:'b',name:'Range',x:160,y:150,widthIn:30,depthIn:28});
    const next={...project,objects:[...project.objects.filter(object=>object.kind==='wall'),a,b,objectDefaults('sink-base',{id:'sink',x:220,y:150}),objectDefaults('appliance',{id:'fridge',name:'Refrigerator',x:280,y:150})]};
    expect(validateKitchenLayout(next).some(issue=>issue.id==='overlap-a-b')).toBe(true);
  });
  test('warns when island aisle is under 36 inches',()=>{
    const project=createEditorProject(room,{...design,includesIsland:false});
    const base=objectDefaults('base-cabinet',{id:'base',x:120,y:120,widthIn:72,depthIn:24});
    const island=objectDefaults('island',{id:'island',x:120,y:170,widthIn:72,depthIn:42});
    const objects=[...project.objects.filter(object=>object.kind==='wall'),base,island,objectDefaults('sink-base',{id:'sink',x:250,y:120}),objectDefaults('appliance',{id:'range',name:'Range',x:300,y:120}),objectDefaults('appliance',{id:'fridge',name:'Refrigerator',x:340,y:120})];
    expect(validateKitchenLayout({...project,objects}).some(issue=>issue.id==='island-clearance-island')).toBe(true);
  });
  test('warns about unattached openings',()=>{
    const project=createEditorProject(room,design);
    const door=objectDefaults('door',{id:'loose-door'});
    const issues=validateKitchenLayout({...project,objects:[...project.objects,door]});
    expect(issues.some(issue=>issue.id==='opening-wall-loose-door')).toBe(true);
  });
  test('AI layout has core sink range and refrigerator checks satisfied',()=>{
    const project=createEditorProject(room,design);
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const ids=validateKitchenLayout(next).map(issue=>issue.id);
    expect(ids).not.toContain('missing-sink');
    expect(ids).not.toContain('missing-range');
    expect(ids).not.toContain('missing-refrigerator');
  });
});
