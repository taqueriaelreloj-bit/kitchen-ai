import { countertopData, islandData } from './countertops';
import { EditorObject, EditorProject, migrateProject } from './editor';
import { isLighting, lightingData } from './lighting';
import { openingData } from './openings';

export const PROJECT_FILE_VERSION = 2;
export const PROJECT_FILE_EXTENSION = '.kitchenai.json';

export type ProjectExportSummary = {
  projectName: string;
  version: number;
  objectCount: number;
  walls: number;
  cabinets: number;
  islands: number;
  countertops: number;
  openings: number;
  appliances: number;
  lighting: number;
  updatedAt: string;
};

const isCabinetObject = (object: EditorObject) => object.kind.includes('cabinet') || object.kind === 'sink-base' || object.kind === 'drawer-base' || object.kind === 'glass-upper';

export function serializeProject(project: EditorProject): string { return JSON.stringify(project, null, 2); }
export function parseProject(serialized: string): EditorProject | undefined { try { return migrateProject(JSON.parse(serialized)); } catch { return undefined; } }
export function projectFileName(project: EditorProject): string { const base = (project.name || 'Kitchen Project').trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'Kitchen-Project'; return `${base}${PROJECT_FILE_EXTENSION}`; }

export function summarizeProject(project: EditorProject): ProjectExportSummary {
  return {
    projectName: project.name, version: project.version, objectCount: project.objects.length,
    walls: project.objects.filter(object => object.kind === 'wall').length,
    cabinets: project.objects.filter(isCabinetObject).length,
    islands: project.objects.filter(object => object.kind === 'island').length,
    countertops: project.objects.filter(object => object.kind === 'countertop').length,
    openings: project.objects.filter(object => object.kind === 'door' || object.kind === 'window').length,
    appliances: project.objects.filter(object => object.kind === 'appliance' && !isLighting(object)).length,
    lighting: project.objects.filter(isLighting).length,
    updatedAt: project.updatedAt,
  };
}

export type ScheduleRow = { id:string; category:string; name:string; widthIn:number; heightIn:number; depthIn:number; material:string; finish:string; notes:string; };
export function projectSchedule(project: EditorProject): ScheduleRow[] {
  return project.objects.map(object => {
    const opening = object.kind === 'door' || object.kind === 'window' ? openingData(object) : undefined;
    const counter = object.kind === 'countertop' || object.kind === 'island' ? countertopData(object) : undefined;
    const island = object.kind === 'island' ? islandData(object) : undefined;
    const light = isLighting(object) ? lightingData(object) : undefined;
    const notes = [
      object.toeKick?.enabled ? `Toe kick ${object.toeKick.heightIn}in high / ${object.toeKick.recessIn}in recess` : '',
      object.hardware && object.hardware.style !== 'No Hardware' ? `${object.hardware.style}, ${object.hardware.size}, ${object.hardware.finishId}` : '',
      opening?.parentWallId ? `Wall ${opening.parentWallId}, offset ${opening.wallOffsetIn ?? 0}in` : '',
      counter ? `${counter.edgeProfile}, ${counter.thicknessIn}in slab${counter.sinkCutout ? ', sink cutout' : ''}${counter.cooktopCutout ? ', cooktop cutout' : ''}` : '',
      island ? `${island.seatingCount} seats${island.dishwasher ? ', dishwasher' : ''}${island.waterfallLeft || island.waterfallRight ? ', waterfall' : ''}` : '',
      light ? `${light.type}, ${light.colorTemperatureK}K, ${light.intensityPercent}%${light.type==='Pendant'?`, ${light.dropIn}in drop`:light.type==='Under Cabinet'?`, ${light.lengthIn}in length`:` ${light.diameterIn}in diameter`}` : '',
    ].filter(Boolean).join('; ');
    return { id:object.id, category:light?'lighting':object.kind, name:object.name, widthIn:object.widthIn, heightIn:object.heightIn, depthIn:object.depthIn, material:object.material??'', finish:object.finishId??'', notes };
  });
}

const csvCell = (value:string|number) => `"${String(value).replace(/"/g, '""')}"`;
export function projectScheduleCsv(project: EditorProject): string { const header=['ID','Category','Name','Width (in)','Height (in)','Depth (in)','Material','Finish','Notes']; const rows=projectSchedule(project).map(row=>[row.id,row.category,row.name,row.widthIn,row.heightIn,row.depthIn,row.material,row.finish,row.notes]); return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\n'); }
