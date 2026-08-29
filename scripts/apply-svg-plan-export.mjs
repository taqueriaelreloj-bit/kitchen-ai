import fs from 'node:fs';

const previewPath='src/components/PlanExportPanel.web.tsx';
let preview=fs.readFileSync(previewPath,'utf8');
if(!preview.includes('const HtmlView=View as any;')){
  const anchor="import { projectPlanFileName, projectPlanSvg } from '../domain/planExport';";
  if(!preview.includes(anchor))throw new Error('PlanExportPanel import anchor not found');
  preview=preview.replace(anchor,`${anchor}\n\nconst HtmlView=View as any;`);
}
preview=preview.replace('<View style={s.preview} dangerouslySetInnerHTML={{__html:svg}}/>','<HtmlView style={s.preview} dangerouslySetInnerHTML={{__html:svg}}/>');
fs.writeFileSync(previewPath,preview);

const exportPath='src/components/ProjectExportPanel.web.tsx';
let source=fs.readFileSync(exportPath,'utf8');
if(!source.includes("./PlanExportPanel.web")){
  const lines=source.split('\n'),lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
  if(lastImport===undefined)throw new Error('ProjectExportPanel import anchor not found');
  lines.splice(lastImport+1,0,"import { PlanExportPanel } from './PlanExportPanel.web';");
  source=lines.join('\n');
}
if(!source.includes('<PlanExportPanel project={project}')){
  const marker='export function ExportPanel';
  const functionIndex=source.indexOf(marker);
  if(functionIndex<0)throw new Error('ExportPanel function not found');
  const returnIndex=source.indexOf('return <View>',functionIndex);
  if(returnIndex<0)throw new Error('ExportPanel return anchor not found');
  source=source.slice(0,returnIndex)+source.slice(returnIndex).replace('return <View>','return <View><PlanExportPanel project={project} onMessage={onMessage}/>',1);
}
fs.writeFileSync(exportPath,source);

for(const file of ['.github/workflows/apply-svg-plan-export.yml','scripts/apply-svg-plan-export.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('2D SVG plan preview and download connected to Export.');
