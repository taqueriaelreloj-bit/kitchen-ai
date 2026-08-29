import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { createEditorProject, isTallCabinetKind, isWallCabinetKind } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, moveOpeningAlongWall, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`photo-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const spanOverlaps=(x:number,width:number,left:number,right:number)=>x<right&&x+width>left;

function projectWithOpening(kind:'door'|'window'){
  let project=createEditorProject(room,design);
  project={...project,selectedId:'wall-north'};
  project=addOpening(project,kind);
  const opening=project.objects.find(object=>object.kind===kind)!;
  project=moveOpeningAlongWall(project,opening.id,40);
  return {project,opening:project.objects.find(object=>object.id===opening.id)!};
}

describe('AI Design wall-opening clearance',()=>{
  test('door span contains no generated cabinetry',()=>{
    const {project,opening}=projectWithOpening('door');
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const wall=next.objects.find(object=>object.id===openingData(opening).parentWallId)!;
    const left=wall.x+(openingData(opening).wallOffsetIn??0)-3,right=left+opening.widthIn+6;
    const blocked=next.objects.filter(object=>object.id.startsWith('ai-')&&object.kind!=='appliance'&&spanOverlaps(object.x,object.widthIn,left,right));
    expect(blocked).toHaveLength(0);
    expect(next.objects.some(object=>object.kind==='sink-base')).toBe(true);
  });

  test('window removes upper/tall cabinets but permits a base cabinet below',()=>{
    const {project,opening}=projectWithOpening('window');
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const wall=next.objects.find(object=>object.id===openingData(opening).parentWallId)!;
    const left=wall.x+(openingData(opening).wallOffsetIn??0)-3,right=left+opening.widthIn+6;
    const overlapping=next.objects.filter(object=>spanOverlaps(object.x,object.widthIn,left,right));
    expect(overlapping.some(object=>isWallCabinetKind(object.kind)||isTallCabinetKind(object.kind))).toBe(false);
    expect(overlapping.some(object=>object.kind==='base-cabinet'||object.kind==='sink-base'||object.kind==='drawer-base')).toBe(true);
  });

  test('opening-aware layouts still include core work zones',()=>{
    const {project}=projectWithOpening('door');
    for(const suggestion of aiDesignSuggestions(project)){
      const next=applyAIDesignSuggestion(project,suggestion);
      expect(next.objects.some(object=>object.kind==='sink-base')).toBe(true);
      expect(next.objects.some(object=>object.id==='ai-range')).toBe(true);
      expect(next.objects.some(object=>object.id==='ai-refrigerator')).toBe(true);
    }
  });
});
