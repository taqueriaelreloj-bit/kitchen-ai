import { applyCabinetDoorStyle, cabinetDoorStyleId } from '../domain/cabinetDoorStyles';
import { createEditorProject, duplicateObject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`door-style-save-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('cabinet door style persistence',()=>{
  test('preserves selected style after save and load',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'client-cabinet'});
    let project=createEditorProject(room,design);
    project={...project,objects:[cabinet],selectedId:cabinet.id};
    project=applyCabinetDoorStyle(project,'raised-panel','selected');
    const loaded=parseProject(serializeProject(project))!;
    expect(cabinetDoorStyleId(loaded.objects[0])).toBe('raised-panel');
  });

  test('duplicate retains independent door-style metadata',()=>{
    const cabinet=objectDefaults('wall-cabinet',{id:'upper'});
    let project=createEditorProject(room,design);
    project={...project,objects:[cabinet],selectedId:cabinet.id};
    project=applyCabinetDoorStyle(project,'glass-frame','selected');
    project=duplicateObject(project,cabinet.id);
    const original=project.objects.find(object=>object.id===cabinet.id)!;
    const copy=project.objects.find(object=>object.id===project.selectedId)!;
    expect(cabinetDoorStyleId(original)).toBe('glass-frame');
    expect(cabinetDoorStyleId(copy)).toBe('glass-frame');
    const changed=applyCabinetDoorStyle(project,'slab','selected');
    expect(cabinetDoorStyleId(changed.objects.find(object=>object.id===cabinet.id)!)).toBe('glass-frame');
    expect(cabinetDoorStyleId(changed.objects.find(object=>object.id===copy.id)!)).toBe('slab');
  });

  test('older cabinets without metadata receive safe Shaker default',()=>{
    const cabinet=objectDefaults('base-cabinet',{id:'legacy'});
    expect(cabinetDoorStyleId(cabinet)).toBe('shaker');
  });
});
