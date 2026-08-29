import fs from 'node:fs';

const targets=[
  {path:'src/components/EditorPanels.web.tsx',anchor:"import { LightingPanel } from './LightingPanel.web';"},
  {path:'src/components/EditorShell.tsx',anchor:"import { LightingPanel } from './LightingPanel';"},
];
const importLine="import { CabinetToolPanel } from './CabinetToolPanel';";
for(const target of targets){
  let source=fs.readFileSync(target.path,'utf8');
  if(!source.includes(importLine)){
    if(!source.includes(target.anchor))throw new Error(`${target.path}: import anchor not found`);
    source=source.replace(target.anchor,`${target.anchor}\n${importLine}`);
  }
  if(!source.includes("if(tool==='Cabinets')return <CabinetToolPanel")){
    const pattern=/  if\(tool==='Cabinets'\)[\s\S]*?\n  if\(tool==='Appliances'\)/;
    if(!pattern.test(source))throw new Error(`${target.path}: Cabinets tool branch not found`);
    source=source.replace(pattern,"  if(tool==='Cabinets')return <CabinetToolPanel project={project} selected={selected} apply={apply}/>;\n  if(tool==='Appliances')");
  }
  fs.writeFileSync(target.path,source);
}
for(const file of ['.github/workflows/apply-cabinet-placement-ui.yml','scripts/apply-cabinet-placement-ui.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Wall-aware cabinet controls connected to web and native editors.');
