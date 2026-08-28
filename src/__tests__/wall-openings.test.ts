import { addOpening, attachOpening, moveOpeningAlongWall, openingData, setWindowSillHeight } from '../domain/openings';
import { buildSceneBoxes, wallSegmentsForOpenings } from '../domain/geometry';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const makeProject = () => { const room = reconstructRoom(photos); return createEditorProject(room, generateDesigns(room)[0]); };

describe('Wall openings', () => {
  test('new door attaches to the selected wall', () => {
    let project = makeProject();
    project = { ...project, selectedId: 'wall-north' };
    project = addOpening(project, 'door');
    const door = project.objects.find(o=>o.id===project.selectedId)!;
    expect(door.kind).toBe('door');
    expect(openingData(door).parentWallId).toBe('wall-north');
    expect(openingData(door).wallOffsetIn).toBeGreaterThanOrEqual(0);
  });

  test('window sill height is synchronized with elevation', () => {
    let project = makeProject();
    project = { ...project, selectedId: 'wall-north' };
    project = addOpening(project, 'window');
    const id = project.selectedId!;
    project = setWindowSillHeight(project, id, 42);
    const window = project.objects.find(o=>o.id===id)!;
    expect(openingData(window).sillHeightIn).toBe(42);
    expect(window.elevationIn).toBe(42);
  });

  test('moving opening along wall clamps it within wall width', () => {
    let project = makeProject();
    project = { ...project, selectedId: 'wall-north' };
    project = addOpening(project, 'door');
    const id = project.selectedId!;
    const wall = project.objects.find(o=>o.id==='wall-north')!;
    project = moveOpeningAlongWall(project, id, 9999);
    const door = project.objects.find(o=>o.id===id)!;
    expect(openingData(door).wallOffsetIn).toBe(wall.widthIn - door.widthIn);
  });

  test('wall is segmented around a door and remains above it', () => {
    const wall = objectDefaults('wall', { id:'wall', widthIn:144, heightIn:96, x:0, y:0 });
    const door = objectDefaults('door', { id:'door', widthIn:36, heightIn:80 });
    const project = { ...makeProject(), objects:[wall,door] };
    const attached = attachOpening(project, 'door', 'wall', 30);
    const actualWall = attached.objects.find(o=>o.id==='wall')!;
    const segments = wallSegmentsForOpenings(actualWall, attached.objects);
    expect(segments.some(x=>x.id.includes('above-door'))).toBe(true);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  test('window creates wall below and above the opening', () => {
    const wall = objectDefaults('wall', { id:'wall', widthIn:144, heightIn:96, x:0, y:0 });
    const window = objectDefaults('window', { id:'window', widthIn:48, heightIn:36, elevationIn:36 });
    let project = { ...makeProject(), objects:[wall,window] };
    project = attachOpening(project, 'window', 'wall', 36);
    project = setWindowSillHeight(project, 'window', 36);
    const segments = wallSegmentsForOpenings(project.objects[0], project.objects);
    expect(segments.some(x=>x.id.includes('below-window'))).toBe(true);
    expect(segments.some(x=>x.id.includes('above-window'))).toBe(true);
  });

  test('3D scene contains segmented wall and opening geometry', () => {
    let project = makeProject();
    project = { ...project, selectedId: 'wall-north' };
    project = addOpening(project, 'window');
    const boxes = buildSceneBoxes(project.objects);
    expect(boxes.some(x=>x.kind==='opening'&&x.sourceId===project.selectedId)).toBe(true);
    expect(boxes.filter(x=>x.kind==='wall'&&x.sourceId==='wall-north').length).toBeGreaterThan(1);
  });
});
