import { applyAIDesignSuggestion, aiDesignSuggestions } from '../domain/aiDesign';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { buildDesignReview, designReviewFileName, designReviewHtml } from '../domain/designReview';
import { addOpening } from '../domain/openings';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`review-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('Kitchen AI printable design review',()=>{
  test('combines issues, materials, estimate and work triangle',()=>{
    const base=createEditorProject(room,design,'Review Kitchen');
    const project=applyAIDesignSuggestion(base,aiDesignSuggestions(base)[0]);
    const review=buildDesignReview(project);
    expect(review.projectName).toBe('Review Kitchen');
    expect(['blocked','review','ready']).toContain(review.status);
    expect(review.materials.cabinetCount).toBeGreaterThan(0);
    expect(review.estimate.low).toBeGreaterThan(0);
    expect(review.estimate.high).toBeGreaterThan(review.estimate.low);
    expect(review.workTriangle.complete).toBe(true);
    expect(review.counts.errors+review.counts.warnings+review.counts.info).toBe(review.issues.length);
  });

  test('integrity errors block the review',()=>{
    const project=createEditorProject(room,design);
    const duplicate={...project.objects[0]};
    const review=buildDesignReview({...project,objects:[...project.objects,duplicate]});
    expect(review.status).toBe('blocked');
    expect(review.issues.some(issue=>issue.code==='duplicate-object-id'&&issue.severity==='error')).toBe(true);
  });

  test('includes unattached or orphan opening review items',()=>{
    let project=createEditorProject(room,design);
    project={...project,selectedId:'wall-north'};
    project=addOpening(project,'door');
    project={...project,objects:project.objects.filter(object=>object.id!=='wall-north')};
    const review=buildDesignReview(project);
    expect(review.issues.some(issue=>issue.code==='orphan-opening'||issue.code==='unattached-opening')).toBe(true);
  });

  test('produces a self-contained printable HTML report',()=>{
    const project=createEditorProject(room,design,'Client <Kitchen & 2026>');
    const html=designReviewHtml({...project,objects:[...project.objects,objectDefaults('appliance',{id:'range',name:'Range'})]});
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Design issues');
    expect(html).toContain('Work triangle');
    expect(html).toContain('Planning estimate');
    expect(html).toContain('Bill of materials');
    expect(html).toContain('Client &lt;Kitchen &amp; 2026&gt;');
    expect(html).not.toContain('Client <Kitchen & 2026>');
    expect(html).toContain('@media print');
  });

  test('camera and zoom changes do not change review quantities or estimate',()=>{
    const project=createEditorProject(room,design);
    const changed={...project,view2d:{...project.view2d,zoom:2,pan:{x:800,y:-500}},camera3d:{distance:1000,yaw:80,pitch:70,target:{x:900,y:800}}};
    const a=buildDesignReview(project),b=buildDesignReview(changed);
    expect(b.materials).toEqual(a.materials);
    expect(b.estimate).toEqual(a.estimate);
    expect(b.workTriangle).toEqual(a.workTriangle);
  });

  test('creates a safe report filename',()=>{
    expect(designReviewFileName(createEditorProject(room,design,'  Luna Kitchen / 2026 '))).toBe('Luna-Kitchen-2026-design-review.html');
  });
});
