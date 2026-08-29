import { billOfMaterialsCsv, buildBillOfMaterials, summarizeBillOfMaterials } from '../domain/billOfMaterials';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { createLighting } from '../domain/lighting';
import { addOpening } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`photo-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('editor bill of materials',()=>{
  test('summarizes cabinets, hardware, toe kick, counters and wall paint',()=>{
    const project=createEditorProject(room,design);
    const summary=summarizeBillOfMaterials(project);
    expect(summary.cabinetCount).toBeGreaterThanOrEqual(2);
    expect(summary.hardwareCount).toBeGreaterThan(0);
    expect(summary.toeKickLinearFeet).toBeGreaterThan(0);
    expect(summary.countertopSquareFeet).toBeGreaterThan(0);
    expect(summary.wallPaintSquareFeet).toBeGreaterThan(0);
  });

  test('includes appliances, lighting and attached openings',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    project={...project,objects:[...project.objects,objectDefaults('appliance',{id:'dishwasher',name:'Dishwasher',widthIn:24,heightIn:34,depthIn:24,material:'Stainless Steel'}),createLighting('Pendant',{id:'pendant'})]};
    const lines=buildBillOfMaterials(project);
    expect(lines.some(line=>line.category==='Appliances'&&line.item==='Dishwasher')).toBe(true);
    expect(lines.some(line=>line.category==='Lighting'&&line.item.includes('Pendant'))).toBe(true);
    expect(lines.some(line=>line.category==='Openings'&&line.item==='Door')).toBe(true);
  });

  test('exports a spreadsheet-ready CSV',()=>{
    const csv=billOfMaterialsCsv(createEditorProject(room,design));
    expect(csv).toContain('"Category","Item","Quantity","Unit","Notes"');
    expect(csv).toContain('"Cabinets"');
    expect(csv).toContain('"Countertops"');
    expect(csv.split('\n').length).toBeGreaterThan(3);
  });
});
