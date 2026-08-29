import fs from 'node:fs';

const targets=[
  {path:'src/components/EditorPanels.web.tsx',anchor:"import { LightingPanel } from './LightingPanel.web';"},
  {path:'src/components/EditorShell.tsx',anchor:"import { LightingPanel } from './LightingPanel';"},
];
const importLine="import { ApplianceToolPanel } from './ApplianceToolPanel';";

for(const target of targets){
  let source=fs.readFileSync(target.path,'utf8');
  if(!source.includes(importLine)){
    if(!source.includes(target.anchor))throw new Error(`${target.path}: LightingPanel import anchor not found`);
    source=source.replace(target.anchor,`${target.anchor}\n${importLine}`);
  }
  if(!source.includes("if(tool==='Appliances')return <ApplianceToolPanel")){
    const pattern=/  if\(tool==='Appliances'\)[\s\S]*?\n  if\(tool==='Lighting'\)/;
    if(!pattern.test(source))throw new Error(`${target.path}: Appliances tool branch not found`);
    source=source.replace(pattern,"  if(tool==='Appliances')return <ApplianceToolPanel project={project} selected={selected} apply={apply}/>;\n  if(tool==='Lighting')");
  }
  fs.writeFileSync(target.path,source);
}

for(const file of ['.github/workflows/apply-appliance-catalog-ui.yml','scripts/apply-appliance-catalog-ui.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Professional appliance catalog connected to web and native editors.');
