import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { addOpening, setDoorSwing } from '../domain/openings';
import { planBounds, planObjectBounds, projectPlanFileName, projectPlanSvg } from '../domain/planExport';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`svg-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Luis Kitchen Plan');

describe('professional SVG plan export',()=>{
  test('computes rotated bounds without changing object dimensions',()=>{
    const object=objectDefaults('base-cabinet',{x:100,y:100,widthIn:36,depthIn:24,rotation:90});
    const bounds=planObjectBounds(object);
    expect(bounds.right-bounds.left).toBeCloseTo(24);
    expect(bounds.bottom-bounds.top).toBeCloseTo(36);
    expect(object.widthIn).toBe(36);
    expect(object.depthIn).toBe(24);
  });

  test('exports a valid SVG with grid, title, labels and measurements',()=>{
    const svg=projectPlanSvg(project());
    expect(svg.startsWith('<?xml version="1.0"')).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Luis Kitchen Plan');
    expect(svg).toContain('class="grid-line"');
    expect(svg).toContain('class="dimension-text"');
    expect(svg).toContain('Kitchen AI plan');
    expect(svg).toContain('</svg>');
  });

  test('exports door leaf and swing arc from saved swing direction',()=>{
    let current=project();
    current={...current,selectedId:'wall-north'};
    current=addOpening(current,'door');
    const door=current.objects.find(object=>object.kind==='door')!;
    current=setDoorSwing(current,door.id,'Right Out');
    const svg=projectPlanSvg(current);
    expect(svg).toContain('class="door-leaf"');
    expect(svg).toContain('class="door-arc"');
    expect(svg).toContain(`id="${door.id}"`);
  });

  test('can hide grid, labels, title and dimensions independently',()=>{
    const svg=projectPlanSvg(project(),{grid:false,labels:false,measurements:false,titleBlock:false});
    expect(svg).not.toContain('class="grid-line"');
    expect(svg).not.toContain('class="object-label"');
    expect(svg).not.toContain('class="dimension-text"');
    expect(svg).not.toContain('class="title-block"');
  });

  test('project bounds contain every exported object',()=>{
    const current=project();
    const bounds=planBounds(current,24);
    for(const object of current.objects){
      if(object.kind==='hardware')continue;
      const objectBounds=planObjectBounds(object);
      expect(objectBounds.left).toBeGreaterThanOrEqual(bounds.left);
      expect(objectBounds.right).toBeLessThanOrEqual(bounds.right);
      expect(objectBounds.top).toBeGreaterThanOrEqual(bounds.top);
      expect(objectBounds.bottom).toBeLessThanOrEqual(bounds.bottom);
    }
  });

  test('creates a safe descriptive SVG file name',()=>{
    expect(projectPlanFileName(project())).toBe('luis-kitchen-plan-2d-plan.svg');
  });
});
