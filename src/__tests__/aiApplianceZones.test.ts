import { AIDesignSuggestion, applyAIDesignSuggestion } from '../domain/aiDesign';
import { createEditorProject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0],project=createEditorProject(room,design);
const suggestion=(layout:AIDesignSuggestion['layout']):AIDesignSuggestion=>({id:`test-${layout}`,name:layout,description:'test',layout,style:'modern',includesIsland:false});
const appliance=(layout:AIDesignSuggestion['layout'],id:string)=>applyAIDesignSuggestion(project,suggestion(layout)).objects.find(object=>object.id===id)!;

describe('AI appliance zones by layout',()=>{
  test('single wall keeps range and refrigerator on primary run',()=>{
    expect(appliance('Single Wall','ai-range').y).toBe(120);
    expect(appliance('Single Wall','ai-refrigerator').y).toBe(120);
  });
  test('L-shape moves range to perpendicular leg',()=>{
    const range=appliance('L-Shape','ai-range');
    expect(range.rotation).toBe(90);
    expect(range.y).toBeGreaterThan(150);
    expect(appliance('L-Shape','ai-refrigerator').rotation).toBe(0);
  });
  test('galley moves range to opposite run',()=>{
    expect(appliance('Galley','ai-range').y).toBe(240);
    expect(appliance('Galley','ai-refrigerator').y).toBe(120);
  });
  test('U-shape moves refrigerator to perpendicular leg',()=>{
    const refrigerator=appliance('U-Shape','ai-refrigerator');
    expect(refrigerator.rotation).toBe(90);
    expect(refrigerator.y).toBeGreaterThan(150);
    expect(appliance('U-Shape','ai-range').rotation).toBe(0);
  });
  test('all layouts retain a sink base',()=>{
    for(const layout of ['Single Wall','L-Shape','Galley','U-Shape'] as const){
      const next=applyAIDesignSuggestion(project,suggestion(layout));
      expect(next.objects.some(object=>object.kind==='sink-base')).toBe(true);
    }
  });
});
