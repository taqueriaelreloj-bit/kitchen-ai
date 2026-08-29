import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { planSvg, planSvgFileName } from '../domain/planSvg';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`svg-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('print-ready SVG plan export',()=>{
  test('creates a standalone accessible SVG with scale and objects',()=>{
    const project=createEditorProject(room,design,'Luis Kitchen');
    const svg=planSvg(project);
    expect(svg.startsWith('<?xml version="1.0"')).toBe(true);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('aria-labelledby="plan-title plan-desc"');
    expect(svg).toContain('12 in');
    expect(svg).toContain('id="wall-north"');
    expect(svg).toContain('id="base-1"');
    expect(svg).toContain('Luis Kitchen');
  });

  test('exports true dimensions independently from editor zoom and camera state',()=>{
    const project=createEditorProject(room,design);
    const changed={...project,view2d:{...project.view2d,zoom:2,pan:{x:999,y:-555}},camera3d:{distance:1000,yaw:75,pitch:70,target:{x:900,y:700}}};
    expect(planSvg(changed)).toBe(planSvg(project));
    expect(planSvg(project)).toContain('36 in × 24 in');
  });

  test('preserves object rotation and digital colors',()=>{
    const project=createEditorProject(room,design);
    const rotated=objectDefaults('base-cabinet',{id:'rotated',name:'Rotated Cabinet',x:220,y:180,widthIn:30,depthIn:24,rotation:90,color:'#334B62'});
    const svg=planSvg({...project,objects:[...project.objects,rotated]});
    expect(svg).toContain('id="rotated"');
    expect(svg).toContain('rotate(90)');
    expect(svg).toContain('#334B62');
  });

  test('escapes project and object text instead of emitting invalid XML',()=>{
    const project=createEditorProject(room,design,'Kitchen <A&B>');
    const special=objectDefaults('base-cabinet',{id:'special',name:'Sink & Prep <30"'});
    const svg=planSvg({...project,objects:[special]});
    expect(svg).toContain('Kitchen &lt;A&amp;B&gt;');
    expect(svg).toContain('Sink &amp; Prep &lt;30&quot;');
    expect(svg).not.toContain('Kitchen <A&B>');
  });

  test('supports export options without mutating project data',()=>{
    const project=createEditorProject(room,design),before=JSON.stringify(project);
    const svg=planSvg(project,{pixelsPerInch:2,marginIn:8,showLabels:false,showDimensions:false,includeRoomBoundary:false});
    expect(svg).not.toContain('id="room-boundary"><rect');
    expect(svg).not.toContain('Base Cabinet</text>');
    expect(JSON.stringify(project)).toBe(before);
  });

  test('generates a safe SVG filename',()=>{
    const project=createEditorProject(room,design,'  My Kitchen / 2026  ');
    expect(planSvgFileName(project)).toBe('My-Kitchen-2026-plan.svg');
  });
});
