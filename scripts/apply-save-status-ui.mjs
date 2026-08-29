import fs from 'node:fs';

const targets=[
  'src/components/EditorShell.web.tsx',
  'src/components/EditorShell.tsx',
];

for(const file of targets){
  let source=fs.readFileSync(file,'utf8');
  const importAnchor=source.includes("import { Workspace2D } from './Workspace2D.web';")
    ? "import { Workspace2D } from './Workspace2D.web';"
    : source.includes("import { NativeWorkspace } from './NativeWorkspace';")
      ? "import { NativeWorkspace } from './NativeWorkspace';"
      : source.includes("import { LightingPanel } from './LightingPanel';")
        ? "import { LightingPanel } from './LightingPanel';"
        : undefined;
  if(!importAnchor)throw new Error(`${file}: component import anchor not found`);
  if(!source.includes("./SaveStatusBadge"))source=source.replace(importAnchor,`${importAnchor}\nimport { SaveStatusBadge } from './SaveStatusBadge';\nimport { useProjectPersistence } from '../hooks/useProjectPersistence';`);

  if(!source.includes('status:saveStatus')){
    const selectionLine=/  const selected=useMemo\([^\n]+\);/;
    const match=source.match(selectionLine);
    if(match)source=source.replace(match[0],`${match[0]}\n  const {status:saveStatus,persist,saveNow}=useProjectPersistence(onProjectChange);`);
    else{
      const compactLine=/const selected=useMemo\([^;]+\);/;
      const compactMatch=source.match(compactLine);
      if(!compactMatch)throw new Error(`${file}: selected object state anchor not found`);
      source=source.replace(compactMatch[0],`${compactMatch[0]}const {status:saveStatus,persist,saveNow}=useProjectPersistence(onProjectChange);`);
    }
  }

  source=source.replace('const publish=(next:EditorProject)=>{setProject(next);onProjectChange(next);};','const publish=(next:EditorProject)=>{setProject(next);void persist(next);};');
  source=source.replace('const apply=(next:EditorProject,record=true)=>{if(record){undo.current.push(project);if(undo.current.length>60)undo.current.shift();redo.current=[];}setProject(next);onProjectChange(next);};','const apply=(next:EditorProject,record=true)=>{if(record){undo.current.push(project);if(undo.current.length>60)undo.current.shift();redo.current=[];}setProject(next);void persist(next);};');
  source=source.replaceAll('setProject(prev);onProjectChange(prev);','setProject(prev);void persist(prev);');
  source=source.replaceAll('setProject(next);onProjectChange(next);','setProject(next);void persist(next);');
  source=source.replaceAll('label="Save" onPress={()=>onProjectChange(project)}','label="Save" onPress={()=>void saveNow(project)}');

  if(!source.includes('<SaveStatusBadge status={saveStatus}')){
    if(source.includes('<View style={s.status}><Text'))source=source.replace('<View style={s.status}><Text','<View style={s.status}><SaveStatusBadge status={saveStatus} compact/><Text');
    else throw new Error(`${file}: status bar anchor not found`);
  }

  if(!source.includes('saveStatus.state===\'error\'')){
    const statusClose='</View></View>';
    const statusIndex=source.indexOf('<View style={s.status}>');
    if(statusIndex>=0){
      const closeIndex=source.indexOf(statusClose,statusIndex);
      if(closeIndex>=0)source=source.slice(0,closeIndex)+"{saveStatus.state==='error'&&<Text style={s.saveError}>{saveStatus.error}</Text>}"+source.slice(closeIndex);
    }
  }

  if(source.includes('statusText:{')&&!source.includes('saveError:{'))source=source.replace('statusText:{','saveError:{fontSize:9,color:\'#FFD1CC\',marginLeft:8},statusText:{');
  fs.writeFileSync(file,source);
}

for(const file of ['.github/workflows/apply-save-status-ui.yml','scripts/apply-save-status-ui.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Saving, saved and error states connected to web and native editor shells.');
