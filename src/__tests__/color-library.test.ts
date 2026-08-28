import {
  applyCabinetFinish,
  applyCustomCabinetColor,
  applyCustomWallColor,
  applyWallPaint,
  createEditorProject,
  migrateProject,
  saveCustomColor,
  toggleCabinetFinishFavorite,
  toggleCompareWallPaint,
  toggleWallPaintFavorite,
} from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos: ScanPhoto[] = [0,90,180,270].map((angle,i)=>({uri:`photo-${i}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const makeProject = () => { const room = reconstructRoom(photos); return createEditorProject(room, generateDesigns(room)[0]); };

describe('Persistent color library', () => {
  test('tracks recent wall paints and cabinet finishes', () => {
    let project = makeProject();
    project = { ...project, selectedId: 'wall-north' };
    project = applyWallPaint(project, 'naval');
    expect(project.catalogState.recentWallPaintIds[0]).toBe('naval');
    project = { ...project, selectedId: 'base-1' };
    project = applyCabinetFinish(project, 'black', 'selected');
    expect(project.catalogState.recentCabinetFinishIds[0]).toBe('black');
  });

  test('toggles favorite paint and cabinet finish ids', () => {
    let project = makeProject();
    project = toggleWallPaintFavorite(project, 'naval');
    project = toggleCabinetFinishFavorite(project, 'black');
    expect(project.catalogState.favoriteWallPaintIds).toContain('naval');
    expect(project.catalogState.favoriteCabinetFinishIds).toContain('black');
    project = toggleWallPaintFavorite(project, 'naval');
    expect(project.catalogState.favoriteWallPaintIds).not.toContain('naval');
  });

  test('comparison is limited to two wall paints', () => {
    let project = makeProject();
    project = toggleCompareWallPaint(project, 'pure-white');
    project = toggleCompareWallPaint(project, 'naval');
    project = toggleCompareWallPaint(project, 'sea-salt');
    expect(project.catalogState.compareWallPaintIds).toEqual(['naval','sea-salt']);
  });

  test('saves and applies custom wall color', () => {
    let project = makeProject();
    project = saveCustomColor(project, '#123456', 'wall', 'Client Blue');
    const id = project.catalogState.customColors[0].id;
    project = { ...project, selectedId: 'wall-north' };
    project = applyCustomWallColor(project, id);
    expect(project.objects.find(o=>o.id==='wall-north')?.color).toBe('#123456');
  });

  test('custom cabinet color follows the toe kick', () => {
    let project = makeProject();
    project = saveCustomColor(project, 'AABBCC', 'cabinet', 'Custom Cabinet');
    const id = project.catalogState.customColors[0].id;
    project = { ...project, selectedId: 'base-1' };
    project = applyCustomCabinetColor(project, id, 'selected');
    const cabinet = project.objects.find(o=>o.id==='base-1');
    expect(cabinet?.color).toBe('#AABBCC');
    expect(cabinet?.toeKick?.color).toBe('#AABBCC');
  });

  test('migration adds safe color-library defaults to older v2 projects', () => {
    const project = makeProject();
    const legacy = { ...project } as any;
    delete legacy.catalogState;
    const migrated = migrateProject(legacy);
    expect(migrated?.catalogState.favoriteWallPaintIds).toEqual([]);
    expect(migrated?.catalogState.customColors).toEqual([]);
  });
});
