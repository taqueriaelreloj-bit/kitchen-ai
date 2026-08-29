import { aiDesignSuggestions, applyAIDesignSuggestion } from '../domain/aiDesign';
import { createEditorProject, EditorObject, EditorProject, isCabinetKind, isTallCabinetKind, isWallCabinetKind } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { Footprint, objectFootprint } from '../domain/layoutValidation';
import { addOpening, moveOpeningAlongWall, openingData } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`photo-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const overlaps=(a:Footprint,b:Footprint)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

function projectWithOpening(kind:'door'|'window'){
  let project:EditorProject=createEditorProject(room,design);
  project={...project,selectedId:'wall-north'};
  project=addOpening(project,kind);
  const opening=project.objects.find(object=>object.kind===kind)!;
  project=moveOpeningAlongWall(project,opening.id,40);
  return {project,opening:project.objects.find(object=>object.id===opening.id)!};
}

function openingClearance(project:EditorProject,opening:EditorObject):Footprint{
  const data=openingData(opening);
  const wall=project.objects.find(object=>object.id===data.parentWallId&&object.kind==='wall')!;
  const rotation=((wall.rotation%360)+360)%360;
  const offset=Math.max(0,Math.min(wall.widthIn-opening.widthIn,data.wallOffsetIn??0));
  const radians=rotation*Math.PI/180;
  const centerAlong=offset+opening.widthIn/2;
  const centerX=wall.x+Math.cos(radians)*centerAlong-Math.sin(radians)*(wall.depthIn/2);
  const centerY=wall.y+Math.sin(radians)*centerAlong+Math.cos(radians)*(wall.depthIn/2);
  const vertical=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
  const clearanceDepth=opening.kind==='door'?104:96;
  const clearanceWidth=opening.widthIn+6;
  return vertical
    ? {left:centerX-clearanceDepth/2,top:centerY-clearanceWidth/2,right:centerX+clearanceDepth/2,bottom:centerY+clearanceWidth/2}
    : {left:centerX-clearanceWidth/2,top:centerY-clearanceDepth/2,right:centerX+clearanceWidth/2,bottom:centerY+clearanceDepth/2};
}

describe('AI Design wall-opening clearance',()=>{
  test('door clearance contains no generated cabinetry or core appliances',()=>{
    const {project,opening}=projectWithOpening('door');
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const zone=openingClearance(next,opening);
    const blockedCabinets=next.objects.filter(object=>object.id.startsWith('ai-')&&isCabinetKind(object.kind)&&overlaps(objectFootprint(object),zone));
    const blockedAppliances=next.objects.filter(object=>(object.id==='ai-range'||object.id==='ai-refrigerator')&&overlaps(objectFootprint(object),zone));
    expect(blockedCabinets).toHaveLength(0);
    expect(blockedAppliances).toHaveLength(0);
    expect(next.objects.some(object=>object.kind==='sink-base')).toBe(true);
  });

  test('window removes upper/tall cabinets but permits a base cabinet below',()=>{
    const {project,opening}=projectWithOpening('window');
    const next=applyAIDesignSuggestion(project,aiDesignSuggestions(project)[0]);
    const zone=openingClearance(next,opening);
    const overlapping=next.objects.filter(object=>overlaps(objectFootprint(object),zone));
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
