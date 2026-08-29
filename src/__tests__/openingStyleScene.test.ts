import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, attachOpening, setDoorSwing } from '../domain/openings';
import { buildOpeningStyleSceneBoxes } from '../domain/openingStyleScene';
import { updateOpeningStyle } from '../domain/openingStyles';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`opening-scene-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('styled doors and windows in the 3D scene',()=>{
  test('replaces a generic door panel and trim with Shaker geometry',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    project=updateOpeningStyle(project,door.id,{doorStyle:'Shaker Door',trimStyle:'Craftsman'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects).filter(box=>box.sourceId===door.id);
    expect(boxes.some(box=>box.id===door.id)).toBe(false);
    expect(boxes.some(box=>box.id.includes('styled-center-panel'))).toBe(true);
    expect(boxes.filter(box=>box.kind==='trim').length).toBeGreaterThanOrEqual(3);
  });

  test('renders Full Glass Door glass and selectable hardware',()=>{
    let project=createEditorProject(room,design),door=objectDefaults('door',{id:'glass-door'});
    project={...project,objects:[...project.objects,door]};
    project=attachOpening(project,door.id,'wall-north',24);
    project=setDoorSwing(project,door.id,'Left In');
    project=updateOpeningStyle(project,door.id,{doorStyle:'Full Glass Door',glassColor:'#A7D4E0'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects).filter(box=>box.sourceId===door.id);
    expect(boxes.some(box=>box.id.includes('styled-door-glass')&&box.color==='#A7D4E0')).toBe(true);
    expect(boxes.some(box=>box.kind==='hardware')).toBe(true);
    expect(boxes.every(box=>box.sourceId===door.id)).toBe(true);
  });

  test('renders Barn Door track outside the opening',()=>{
    let project=createEditorProject(room,design),door=objectDefaults('door',{id:'barn'});
    project={...project,objects:[...project.objects,door]};
    project=attachOpening(project,door.id,'wall-north',12);
    project=updateOpeningStyle(project,door.id,{doorStyle:'Barn Door'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects).filter(box=>box.sourceId===door.id);
    expect(boxes.some(box=>box.id.includes('barn-track')&&box.kind==='hardware')).toBe(true);
    expect(boxes.some(box=>box.id.includes('barn-panel'))).toBe(true);
  });

  test('renders window frame, glass, mullions and keeps sill elevation',()=>{
    let project=createEditorProject(room,design),window=objectDefaults('window',{id:'window',heightIn:48,elevationIn:36});
    project={...project,objects:[...project.objects,window]};
    project=attachOpening(project,window.id,'wall-north',48);
    project=updateOpeningStyle(project,window.id,{windowStyle:'Picture',muntins:4,trimStyle:'Modern'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects).filter(box=>box.sourceId===window.id);
    expect(boxes.some(box=>box.id.includes('styled-glass'))).toBe(true);
    expect(boxes.filter(box=>box.id.includes('muntin-'))).toHaveLength(4);
    const glass=boxes.find(box=>box.id.includes('styled-glass'))!;
    expect(glass.center[1]).toBeGreaterThan(36/24);
  });

  test('follows the attached wall rotation',()=>{
    let project=createEditorProject(room,design),door=objectDefaults('door',{id:'door'});
    project={...project,objects:[...project.objects,door]};
    project=attachOpening(project,door.id,'wall-west',24);
    project=updateOpeningStyle(project,door.id,{doorStyle:'Half Glass Door'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects).filter(box=>box.sourceId===door.id);
    expect(boxes.length).toBeGreaterThan(3);
    expect(boxes.every(box=>box.rotationY).toBe(-Math.PI/2));
  });

  test('preserves wall geometry around styled openings',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'window');
    const window=project.objects.find(object=>object.kind==='window')!;
    project=updateOpeningStyle(project,window.id,{windowStyle:'Slider'});
    const boxes=buildOpeningStyleSceneBoxes(project.objects);
    expect(boxes.some(box=>box.sourceId==='wall-north'&&box.kind==='wall')).toBe(true);
    expect(boxes.some(box=>box.sourceId===window.id&&box.kind==='opening')).toBe(true);
  });
});
