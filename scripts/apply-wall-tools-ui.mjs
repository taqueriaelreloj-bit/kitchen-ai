import fs from 'node:fs';

const targets=[
  {path:'src/components/EditorPanels.web.tsx',importAnchor:"import { LightingPanel } from './LightingPanel.web';",importLine:"import { WallToolPanel } from './WallToolPanel';"},
  {path:'src/components/EditorShell.tsx',importAnchor:"import { LightingPanel } from './LightingPanel';",importLine:"import { WallToolPanel } from './WallToolPanel';"},
];

for(const target of targets){
  let source=fs.readFileSync(target.path,'utf8');
  if(!source.includes(target.importLine)){
    if(!source.includes(target.importAnchor))throw new Error(`${target.path}: import anchor not found`);
    source=source.replace(target.importAnchor,`${target.importAnchor}\n${target.importLine}`);
  }
  if(!source.includes("if(tool==='Walls')return <ScrollView><WallToolPanel")){
    const pattern=/  if\(tool==='Walls'\)[\s\S]*?\n  if\(tool==='Doors & Windows'\)/;
    if(!pattern.test(source))throw new Error(`${target.path}: Walls tool branch not found`);
    source=source.replace(pattern,"  if(tool==='Walls')return <ScrollView><WallToolPanel project={project} selected={selected} apply={apply}/></ScrollView>;\n  if(tool==='Doors & Windows')");
  }
  fs.writeFileSync(target.path,source);
}

for(const file of ['.github/workflows/apply-wall-tools-ui.yml','scripts/apply-wall-tools-ui.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Continuous wall tools connected to web and native editors.');
