import { aiDesignSuggestions } from '../domain/aiDesign';
import { buildAIDesignPreview, previewBounds, previewObjectStyle } from '../domain/aiDesignPreview';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`preview-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('AI Design visual previews',()=>{
  test('builds preview metrics without mutating the source project',()=>{
    const project=createEditorProject(room,design);
    const before=project.objects.map(object=>object.id).join(',');
    const preview=buildAIDesignPreview(project,aiDesignSuggestions(project)[0]);
    expect(project.objects.map(object=>object.id).join(',')).toBe(before);
    expect(preview.cabinetCount).toBeGreaterThan(0);
    expect(preview.applianceCount).toBeGreaterThanOrEqual(2);
    expect(preview.wallCount).toBeGreaterThan(0);
    expect(preview.sinkCount).toBeGreaterThan(0);
  });

  test('returns finite padded bounds for rotated objects',()=>{
    const objects=[
      objectDefaults('wall',{id:'wall',x:100,y:100,widthIn:144,rotation:0}),
      objectDefaults('base-cabinet',{id:'cabinet',x:220,y:150,widthIn:36,depthIn:24,rotation:90}),
    ];
    const bounds=previewBounds(objects,20);
    expect(bounds.width).toBeGreaterThan(144);
    expect(bounds.height).toBeGreaterThan(24);
    expect(Number.isFinite(bounds.left+bounds.top+bounds.right+bounds.bottom)).toBe(true);
  });

  test('scales every object into a preview viewport',()=>{
    const object=objectDefaults('island',{id:'island',x:200,y:200,widthIn:84,depthIn:42});
    const bounds=previewBounds([object]);
    const style=previewObjectStyle(object,bounds,{width:254,height:150});
    expect(style.left).toBeGreaterThanOrEqual(0);
    expect(style.top).toBeGreaterThanOrEqual(0);
    expect(style.left+style.width).toBeLessThanOrEqual(254);
    expect(style.top+style.height).toBeLessThanOrEqual(150);
  });

  test('reflects whether each generated option can contain an island',()=>{
    const project=createEditorProject(room,design);
    for(const suggestion of aiDesignSuggestions(project)){
      const preview=buildAIDesignPreview(project,suggestion);
      expect(preview.hasIsland).toBe(preview.project.objects.some(object=>object.kind==='island'));
    }
  });
});
