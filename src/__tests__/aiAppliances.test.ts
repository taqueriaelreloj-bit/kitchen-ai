import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { createEditorProject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('AI appliance layout',()=>{
  test('every applied suggestion includes refrigerator and range',()=>{
    const project=createEditorProject(room,design);
    for(const suggestion of aiDesignSuggestions(project)){
      const next=applyAIDesignSuggestion(project,suggestion);
      expect(next.objects.some(object=>object.id==='ai-refrigerator'&&object.name==='Refrigerator')).toBe(true);
      expect(next.objects.some(object=>object.id==='ai-range'&&object.name==='Range')).toBe(true);
    }
  });
  test('generated appliances use stainless appliance geometry',()=>{
    const project=createEditorProject(room,design);
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const refrigerator=next.objects.find(object=>object.id==='ai-refrigerator')!;
    const range=next.objects.find(object=>object.id==='ai-range')!;
    expect(refrigerator.kind).toBe('appliance');
    expect(refrigerator.heightIn).toBeGreaterThan(60);
    expect(refrigerator.material).toBe('Stainless Steel');
    expect(range.widthIn).toBe(30);
  });
  test('cabinet objects do not overlap appliance footprints on main run',()=>{
    const project=createEditorProject(room,design);
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const refrigerator=next.objects.find(object=>object.id==='ai-refrigerator')!;
    const range=next.objects.find(object=>object.id==='ai-range')!;
    const overlaps=(a:any,b:any)=>a.x<b.x+b.widthIn&&a.x+a.widthIn>b.x&&a.y<b.y+b.depthIn&&a.y+a.depthIn>b.y;
    const cabinets=next.objects.filter(object=>object.id.startsWith('ai-')&&object.kind.includes('cabinet'));
    expect(cabinets.some(object=>overlaps(object,refrigerator))).toBe(false);
    expect(cabinets.some(object=>overlaps(object,range))).toBe(false);
  });
});
