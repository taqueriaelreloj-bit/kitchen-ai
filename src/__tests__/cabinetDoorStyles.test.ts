import {
  applyCabinetDoorStyle, cabinetDoorFaces, cabinetDoorGeometry, cabinetDoorStyle,
  cabinetDoorStyleId, CABINET_DOOR_STYLES,
} from '../domain/cabinetDoorStyles';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`doors-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('cabinet door styles',()=>{
  test('provides common professional styles with Shaker default',()=>{
    expect(CABINET_DOOR_STYLES.map(style=>style.id)).toEqual(expect.arrayContaining(['slab','shaker','slim-shaker','raised-panel','recessed-panel','glass-frame']));
    expect(cabinetDoorStyle().id).toBe('shaker');
  });

  test('creates a flat single part for each slab face',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'cabinet',widthIn:30,cabinetDoorStyleId:'slab'} as any);
    const geometry=cabinetDoorGeometry(cabinet)!;
    expect(geometry.style.id).toBe('slab');
    expect(geometry.parts).toHaveLength(geometry.faces.length);
    expect(geometry.parts.every(part=>part.kind==='slab')).toBe(true);
  });

  test('creates rails, stiles and center panel for Shaker doors',()=>{
    const cabinet=objectDefaults('wall-cabinet',{id:'upper',widthIn:36,cabinetDoorStyleId:'shaker'} as any);
    const geometry=cabinetDoorGeometry(cabinet)!;
    expect(geometry.faces).toHaveLength(2);
    expect(geometry.parts.filter(part=>part.kind==='rail')).toHaveLength(4);
    expect(geometry.parts.filter(part=>part.kind==='stile')).toHaveLength(4);
    expect(geometry.parts.filter(part=>part.kind==='center-panel')).toHaveLength(2);
  });

  test('glass frame uses transparent center parts',()=>{
    const cabinet=objectDefaults('glass-upper',{id:'glass',widthIn:30,cabinetDoorStyleId:'glass-frame'} as any);
    const geometry=cabinetDoorGeometry(cabinet)!;
    const glass=geometry.parts.filter(part=>part.kind==='glass');
    expect(glass.length).toBeGreaterThan(0);
    expect(glass.every(part=>part.opacity<1)).toBe(true);
    expect(geometry.parts.some(part=>part.kind==='center-panel')).toBe(false);
  });

  test('drawer base produces three drawer faces',()=>{
    const cabinet=objectDefaults('drawer-base',{id:'drawers',widthIn:30});
    const faces=cabinetDoorFaces(cabinet);
    expect(faces).toHaveLength(3);
    expect(faces.every(face=>face.role==='drawer')).toBe(true);
    expect(new Set(faces.map(face=>face.offsetYIn)).size).toBe(3);
  });

  test('tall cabinets split into upper and lower door banks',()=>{
    const cabinet=objectDefaults('pantry-cabinet',{id:'pantry',widthIn:36,heightIn:84});
    const faces=cabinetDoorFaces(cabinet);
    expect(faces.some(face=>face.id.startsWith('lower-'))).toBe(true);
    expect(faces.some(face=>face.id.startsWith('upper-'))).toBe(true);
  });

  test('applies style by selected, base, wall, island and all scopes',()=>{
    const base=objectDefaults('base-cabinet',{id:'base'});
    const upper=objectDefaults('wall-cabinet',{id:'upper'});
    const island=objectDefaults('island',{id:'island'});
    let project=createEditorProject(room,design);
    project={...project,objects:[base,upper,island],selectedId:'upper'};
    project=applyCabinetDoorStyle(project,'slim-shaker','selected');
    expect(cabinetDoorStyleId(project.objects.find(object=>object.id==='upper')!)).toBe('slim-shaker');
    expect(cabinetDoorStyleId(project.objects.find(object=>object.id==='base')!)).toBe('shaker');
    project=applyCabinetDoorStyle(project,'raised-panel','base');
    expect(cabinetDoorStyleId(project.objects.find(object=>object.id==='base')!)).toBe('raised-panel');
    project=applyCabinetDoorStyle(project,'glass-frame','wall');
    expect(cabinetDoorStyleId(project.objects.find(object=>object.id==='upper')!)).toBe('glass-frame');
    project=applyCabinetDoorStyle(project,'slab','island');
    expect(cabinetDoorStyleId(project.objects.find(object=>object.id==='island')!)).toBe('slab');
    project=applyCabinetDoorStyle(project,'recessed-panel','all');
    expect(project.objects.every(object=>cabinetDoorStyleId(object)==='recessed-panel')).toBe(true);
  });

  test('beadboard and louvered styles create repeated detail parts',()=>{
    const beadboard=cabinetDoorGeometry(objectDefaults('wall-cabinet',{id:'bead',widthIn:30,cabinetDoorStyleId:'beadboard'} as any))!;
    const louvered=cabinetDoorGeometry(objectDefaults('wall-cabinet',{id:'louver',widthIn:30,cabinetDoorStyleId:'louvered'} as any))!;
    expect(beadboard.parts.filter(part=>part.kind==='bead').length).toBeGreaterThan(2);
    expect(louvered.parts.filter(part=>part.kind==='louver').length).toBeGreaterThan(2);
  });
});
