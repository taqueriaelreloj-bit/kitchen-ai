import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { createLighting } from '../domain/lighting';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('AI Design editor suggestions',()=>{
  test('reuses room/design generator and returns three practical layouts',()=>{
    const project=createEditorProject(room,design); const suggestions=aiDesignSuggestions(project);
    expect(suggestions).toHaveLength(3);
    expect(new Set(suggestions.map(x=>x.style))).toEqual(new Set(['warm','modern','classic']));
    expect(suggestions.every(x=>x.layout.length>0)).toBe(true);
  });
  test('preserves walls, openings and lighting while replacing cabinetry',()=>{
    let project=createEditorProject(room,design);
    const door=objectDefaults('door',{id:'client-door',name:'Client Door'});
    const light=createLighting('Pendant',{id:'client-light',name:'Client Pendant'});
    project={...project,objects:[...project.objects,door,light]};
    const suggestion=aiDesignSuggestions(project)[0]; const next=applyAIDesignSuggestion(project,suggestion);
    expect(next.objects.some(x=>x.id==='wall-north')).toBe(true);
    expect(next.objects.some(x=>x.id==='client-door')).toBe(true);
    expect(next.objects.some(x=>x.id==='client-light')).toBe(true);
    expect(next.objects.some(x=>x.id.startsWith('ai-')&&x.kind.includes('cabinet'))).toBe(true);
  });
  test('does not mutate source project',()=>{
    const project=createEditorProject(room,design); const before=project.objects.map(x=>x.id).join(',');
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[1]);
    expect(project.objects.map(x=>x.id).join(',')).toBe(before);
    expect(next).not.toBe(project);
  });
  test('style drives cabinet finish and optional island',()=>{
    const project=createEditorProject(room,design); const suggestion=aiDesignSuggestions(project).find(x=>x.includesIsland)??aiDesignSuggestions(project)[0]; const next=applyAIDesignSuggestion(project,suggestion);
    const cabinet=next.objects.find(x=>x.kind==='base-cabinet'||x.kind==='sink-base'||x.kind==='drawer-base');
    expect(cabinet?.finishId).toBeTruthy();
    if(suggestion.includesIsland)expect(next.objects.some(x=>x.id==='ai-island')).toBe(true);
  });
});
