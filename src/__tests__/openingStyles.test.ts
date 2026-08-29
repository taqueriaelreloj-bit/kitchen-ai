import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, attachOpening, setDoorSwing } from '../domain/openings';
import {
  applyOpeningStyle,
  doorPlanSymbol,
  openingFrontParts,
  openingStyleData,
  updateOpeningStyle,
  windowPlanSymbol,
} from '../domain/openingStyles';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`opening-style-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional door and window styles',()=>{
  test('provides safe defaults for legacy openings',()=>{
    expect(openingStyleData(objectDefaults('door'))).toMatchObject({doorStyle:'Single Panel',trimStyle:'Standard'});
    expect(openingStyleData(objectDefaults('window'))).toMatchObject({windowStyle:'Fixed',glassColor:'#91C7DC'});
  });

  test('creates distinct Shaker, glass, double, pocket and barn door fronts',()=>{
    const door=objectDefaults('door',{id:'door',widthIn:36,heightIn:80});
    const shaker=openingFrontParts({...door,openingStyleSpec:{...openingStyleData(door),doorStyle:'Shaker Door'}} as any);
    const glass=openingFrontParts({...door,openingStyleSpec:{...openingStyleData(door),doorStyle:'Full Glass Door'}} as any);
    const double=openingFrontParts({...door,openingStyleSpec:{...openingStyleData(door),doorStyle:'Double Door'}} as any);
    const pocket=openingFrontParts({...door,openingStyleSpec:{...openingStyleData(door),doorStyle:'Pocket Door'}} as any);
    const barn=openingFrontParts({...door,openingStyleSpec:{...openingStyleData(door),doorStyle:'Barn Door'}} as any);
    expect(shaker.some(part=>part.id==='center-panel')).toBe(true);
    expect(glass.some(part=>part.material==='glass')).toBe(true);
    expect(double.filter(part=>part.id.startsWith('door-'))).toHaveLength(2);
    expect(pocket.some(part=>part.id==='pocket-panel')).toBe(true);
    expect(barn.some(part=>part.id==='barn-track')).toBe(true);
  });

  test('creates window-specific rails and mullions',()=>{
    const window=objectDefaults('window',{id:'window',widthIn:48,heightIn:48});
    const hung=openingFrontParts({...window,openingStyleSpec:{...openingStyleData(window),windowStyle:'Double Hung'}} as any);
    const slider=openingFrontParts({...window,openingStyleSpec:{...openingStyleData(window),windowStyle:'Slider'}} as any);
    const custom=openingFrontParts({...window,openingStyleSpec:{...openingStyleData(window),windowStyle:'Picture',muntins:4}} as any);
    expect(hung.some(part=>part.id==='meeting-rail')).toBe(true);
    expect(slider.some(part=>part.id==='center-mullion')).toBe(true);
    expect(custom.filter(part=>part.id.startsWith('muntin-'))).toHaveLength(4);
  });

  test('updates one opening or all openings of the same kind',()=>{
    let project=createEditorProject(room,design);
    const doorA=objectDefaults('door',{id:'door-a'}),doorB=objectDefaults('door',{id:'door-b'}),window=objectDefaults('window',{id:'window'});
    project={...project,objects:[...project.objects,doorA,doorB,window],selectedId:doorA.id};
    project=updateOpeningStyle(project,doorA.id,{doorStyle:'Half Glass Door',panelColor:'#224466'});
    expect(openingStyleData(project.objects.find(object=>object.id==='door-a')!).doorStyle).toBe('Half Glass Door');
    expect(openingStyleData(project.objects.find(object=>object.id==='door-b')!).doorStyle).toBe('Single Panel');
    project=applyOpeningStyle(project,'door',{trimStyle:'Modern'});
    expect(project.objects.filter(object=>object.kind==='door').every(object=>openingStyleData(object).trimStyle==='Modern')).toBe(true);
    expect(openingStyleData(project.objects.find(object=>object.id==='window')!).trimStyle).toBe('Standard');
  });

  test('door plan symbol follows existing swing direction and special styles',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    const door=project.objects.find(object=>object.kind==='door')!;
    project=setDoorSwing(project,door.id,'Right Out');
    project=updateOpeningStyle(project,door.id,{doorStyle:'Barn Door'});
    expect(doorPlanSymbol(project.objects.find(object=>object.id===door.id)!)).toMatchObject({hinge:'right',swing:'out',barn:true,double:false,pocket:false});
  });

  test('window plan symbols expose panel orientation',()=>{
    const slider={...objectDefaults('window'),openingStyleSpec:{...openingStyleData(objectDefaults('window')),windowStyle:'Slider'}} as any;
    const hung={...objectDefaults('window'),openingStyleSpec:{...openingStyleData(objectDefaults('window')),windowStyle:'Single Hung'}} as any;
    expect(windowPlanSymbol(slider)).toMatchObject({panels:2,mullions:'vertical',openingDirection:'right'});
    expect(windowPlanSymbol(hung)).toMatchObject({panels:2,mullions:'horizontal',openingDirection:'up'});
  });

  test('preserves attachment while changing style',()=>{
    let project=createEditorProject(room,design);
    const door=objectDefaults('door',{id:'door'});
    project={...project,objects:[...project.objects,door]};
    project=attachOpening(project,door.id,'wall-north',24);
    const before=project.objects.find(object=>object.id===door.id)!;
    project=updateOpeningStyle(project,door.id,{doorStyle:'Full Glass Door',trimWidthIn:4});
    const after=project.objects.find(object=>object.id===door.id)!;
    expect(after.x).toBe(before.x);expect(after.y).toBe(before.y);expect(after.rotation).toBe(before.rotation);
  });

  test('persists opening styles through project JSON',()=>{
    let project=createEditorProject(room,design),window=objectDefaults('window',{id:'styled-window'});
    project={...project,objects:[...project.objects,window]};
    project=updateOpeningStyle(project,window.id,{windowStyle:'Casement',trimStyle:'Craftsman',trimWidthIn:4,muntins:3,frameColor:'#223344'});
    const loaded=parseProject(serializeProject(project))!,saved=loaded.objects.find(object=>object.id===window.id)!;
    expect(openingStyleData(saved)).toMatchObject({windowStyle:'Casement',trimStyle:'Craftsman',trimWidthIn:4,muntins:3,frameColor:'#223344'});
  });

  test('clamps unsafe numeric style values',()=>{
    const door={...objectDefaults('door'),openingStyleSpec:{...openingStyleData(objectDefaults('door')),trimWidthIn:-2,frameDepthIn:99,muntins:50,openPercent:-10}} as any;
    expect(openingStyleData(door)).toMatchObject({trimWidthIn:0,frameDepthIn:6,muntins:12,openPercent:0});
  });

  test('non-openings ignore updates and geometry requests',()=>{
    const project=createEditorProject(room,design),wall=project.objects.find(object=>object.id==='wall-north')!;
    expect(updateOpeningStyle(project,wall.id,{doorStyle:'Barn Door'})).toBe(project);
    expect(openingFrontParts(wall)).toEqual([]);
    expect(doorPlanSymbol(wall)).toBeUndefined();
    expect(windowPlanSymbol(wall)).toBeUndefined();
  });
});
