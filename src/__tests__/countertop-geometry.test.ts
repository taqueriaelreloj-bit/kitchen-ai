import { createCountertop, createIsland, updateCountertop, updateIsland } from '../domain/countertops';
import { createEditorProject } from '../domain/editor';
import { buildSceneBoxes } from '../domain/geometry';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Countertop and island 3D geometry',()=>{
  test('standalone countertop uses selected thickness and material',()=>{
    const counter=createCountertop({id:'counter',widthIn:60,depthIn:25});let project=createEditorProject(room,design);project={...project,objects:[counter]};project=updateCountertop(project,'counter',{materialId:'granite-black',thicknessIn:2,backsplashHeightIn:4});
    const boxes=buildSceneBoxes(project.objects),slab=boxes.find(x=>x.id==='counter')!;
    expect(slab.kind).toBe('countertop');
    expect(slab.color).toBe('#343433');
    expect(slab.size[1]).toBeCloseTo(2/24);
    expect(boxes.some(x=>x.id==='counter-backsplash')).toBe(true);
  });
  test('sink and cooktop inserts appear when enabled',()=>{
    const counter=createCountertop({id:'counter'});let project=createEditorProject(room,design);project={...project,objects:[counter]};project=updateCountertop(project,'counter',{sinkCutout:true,cooktopCutout:true});const boxes=buildSceneBoxes(project.objects);
    expect(boxes.some(x=>x.id==='counter-sink')).toBe(true);
    expect(boxes.some(x=>x.id==='counter-cooktop')).toBe(true);
  });
  test('island renders seating dishwasher and waterfall sides',()=>{
    const island=createIsland({id:'island',widthIn:84,depthIn:42});let project=createEditorProject(room,design);project={...project,objects:[island]};project=updateIsland(project,'island',{seatingCount:4,dishwasher:true,waterfallLeft:true,waterfallRight:true});
    const boxes=buildSceneBoxes(project.objects);
    expect(boxes.filter(x=>x.id.startsWith('island-seat-'))).toHaveLength(4);
    expect(boxes.some(x=>x.id==='island-dishwasher')).toBe(true);
    expect(boxes.some(x=>x.id==='island-waterfall-left')).toBe(true);
    expect(boxes.some(x=>x.id==='island-waterfall-right')).toBe(true);
  });
});
