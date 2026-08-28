import { createIsland, updateIsland } from '../domain/countertops';
import { createEditorProject, migrateProject } from '../domain/editor';
import { addOpening } from '../domain/openings';
import { parseProject, projectFileName, projectScheduleCsv, serializeProject, summarizeProject } from '../domain/projectIO';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Project IO and exports',()=>{
  test('canonical JSON round trips through migration',()=>{
    let project=createEditorProject(room,design,'Client Kitchen');
    const island=createIsland({id:'island-export'}); project={...project,objects:[...project.objects,island],selectedId:island.id};
    project=updateIsland(project,island.id,{sink:true,dishwasher:true,seatingCount:4});
    const restored=parseProject(serializeProject(project));
    expect(restored?.name).toBe('Client Kitchen');
    expect(restored?.objects.find(o=>o.id==='island-export')).toBeTruthy();
  });
  test('old project JSON remains importable',()=>{
    const current=createEditorProject(room,design); const legacy={room:current.room,design:current.design};
    expect(migrateProject(legacy)?.version).toBe(2);
    expect(parseProject(JSON.stringify(legacy))?.objects.length).toBeGreaterThan(0);
  });
  test('creates safe project filenames',()=>{
    const project=createEditorProject(room,design,'Smith / Kitchen #1');
    expect(projectFileName(project)).toBe('Smith-Kitchen-1.kitchenai.json');
  });
  test('summary counts major design objects',()=>{
    let project=createEditorProject(room,design); project=addOpening(project,'door');
    const summary=summarizeProject(project);
    expect(summary.walls).toBeGreaterThan(0);
    expect(summary.openings).toBe(1);
    expect(summary.objectCount).toBe(project.objects.length);
  });
  test('CSV schedule contains dimensions and professional detail notes',()=>{
    let project=createEditorProject(room,design); const island=createIsland({id:'schedule-island'}); project={...project,objects:[island]}; project=updateIsland(project,island.id,{sink:true,seatingCount:4,waterfallLeft:true});
    const csv=projectScheduleCsv(project);
    expect(csv).toContain('Width (in)');
    expect(csv).toContain('schedule-island');
    expect(csv).toContain('4 seats');
    expect(csv).toContain('sink cutout');
  });
});
