import {
  applyCabinetStyle,
  cabinetFrontCount,
  cabinetFrontParts,
  cabinetStyleData,
  DEFAULT_CABINET_STYLE,
  updateCabinetStyle,
} from '../domain/cabinetStyles';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`cabinet-style-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('cabinet door styles',()=>{
  test('provides safe Shaker defaults for existing cabinets',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'base'});
    expect(cabinetStyleData(cabinet)).toEqual(DEFAULT_CABINET_STYLE);
    expect(cabinetFrontParts(cabinet).length).toBeGreaterThan(4);
  });

  test('Slab, Shaker and Glass Frame create distinct front geometry',()=>{
    const cabinet=objectDefaults('wall-cabinet',{id:'upper',widthIn:36,heightIn:30});
    const slab=cabinetFrontParts({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Slab'}} as any);
    const shaker=cabinetFrontParts({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Shaker'}} as any);
    const glass=cabinetFrontParts({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Glass Frame'}} as any);
    expect(slab).toHaveLength(2);
    expect(shaker.length).toBeGreaterThan(slab.length);
    expect(glass.some(part=>part.material==='glass')).toBe(true);
    expect(shaker.some(part=>part.material==='glass')).toBe(false);
  });

  test('Beadboard and Louvered styles create decorative parts',()=>{
    const cabinet=objectDefaults('base-cabinet',{widthIn:36,heightIn:34.5});
    const beadboard=cabinetFrontParts({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Beadboard'}} as any);
    const louvered=cabinetFrontParts({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,doorStyle:'Louvered'}} as any);
    expect(beadboard.some(part=>part.material==='shadow')).toBe(true);
    expect(louvered.some(part=>part.id.includes('slat'))).toBe(true);
  });

  test('drawer bases expose three fronts and islands scale by width',()=>{
    expect(cabinetFrontCount(objectDefaults('drawer-base',{widthIn:30}))).toBe(3);
    expect(cabinetFrontCount(objectDefaults('island',{widthIn:84}))).toBeGreaterThanOrEqual(3);
  });

  test('updates a selected cabinet without mutating unrelated objects',()=>{
    let project=createEditorProject(room,design);
    const second=objectDefaults('base-cabinet',{id:'second'});
    project={...project,objects:[...project.objects,second],selectedId:'base-1'};
    const before=project.objects.find(object=>object.id==='second');
    const next=updateCabinetStyle(project,'base-1',{doorStyle:'Raised Panel',overlay:'Inset'});
    expect(cabinetStyleData(next.objects.find(object=>object.id==='base-1')!)).toMatchObject({doorStyle:'Raised Panel',overlay:'Inset'});
    expect(next.objects.find(object=>object.id==='second')).toBe(before);
  });

  test('applies a style by cabinet scope',()=>{
    let project=createEditorProject(room,design);
    const tall=objectDefaults('pantry-cabinet',{id:'tall'}),upper=objectDefaults('wall-cabinet',{id:'upper'}),island=objectDefaults('island',{id:'island'});
    project={...project,objects:[...project.objects,tall,upper,island],selectedId:'base-1'};
    const baseStyled=applyCabinetStyle(project,{doorStyle:'Recessed Panel'},'base');
    expect(cabinetStyleData(baseStyled.objects.find(object=>object.id==='base-1')!).doorStyle).toBe('Recessed Panel');
    expect(cabinetStyleData(baseStyled.objects.find(object=>object.id==='tall')!).doorStyle).toBe('Recessed Panel');
    expect(cabinetStyleData(baseStyled.objects.find(object=>object.id==='upper')!).doorStyle).toBe('Shaker');
    expect(cabinetStyleData(baseStyled.objects.find(object=>object.id==='island')!).doorStyle).toBe('Shaker');
  });

  test('preserves cabinet style through project save and load',()=>{
    let project=createEditorProject(room,design);
    project=updateCabinetStyle(project,'base-1',{doorStyle:'Glass Frame',glassOpacity:.25,railIn:3});
    const loaded=parseProject(serializeProject(project))!;
    expect(cabinetStyleData(loaded.objects.find(object=>object.id==='base-1')!)).toMatchObject({doorStyle:'Glass Frame',glassOpacity:.25,railIn:3});
  });

  test('clamps unsafe custom dimensions to usable limits',()=>{
    const cabinet=objectDefaults('base-cabinet');
    const spec=cabinetStyleData({...cabinet,cabinetStyleSpec:{...DEFAULT_CABINET_STYLE,railIn:-10,stileIn:99,revealIn:-2,panelDepthIn:50,glassOpacity:5}} as any);
    expect(spec.railIn).toBe(.75);
    expect(spec.stileIn).toBe(6);
    expect(spec.revealIn).toBe(0);
    expect(spec.panelDepthIn).toBe(1.5);
    expect(spec.glassOpacity).toBe(.95);
  });

  test('non-cabinet objects return no front geometry and unchanged projects',()=>{
    const wall=objectDefaults('wall',{id:'wall'}),project=createEditorProject(room,design);
    expect(cabinetFrontParts(wall)).toEqual([]);
    expect(updateCabinetStyle(project,'wall-north',{doorStyle:'Slab'})).toBe(project);
  });
});
