import fs from 'node:fs';

const editorPath='src/components/EditorShell.web.tsx';
const workflowPath='.github/workflows/apply-estimate-ui.yml';
const selfPath='scripts/apply-estimate-ui.mjs';
let source=fs.readFileSync(editorPath,'utf8');
const original=source;

const requireChange=(next,label)=>{
  if(next===source)throw new Error(`Estimate UI integration could not find: ${label}`);
  source=next;
};

if(!source.includes("./EstimatePanel.web")){
  if(source.includes("import { LayoutCheckPanel } from './LayoutCheckPanel.web';")){
    source=source.replace("import { LayoutCheckPanel } from './LayoutCheckPanel.web';","import { LayoutCheckPanel } from './LayoutCheckPanel.web';\nimport { EstimatePanel } from './EstimatePanel.web';");
  }else if(source.includes("import { AIDesignPanel } from './AIDesignPanel.web';")){
    source=source.replace("import { AIDesignPanel } from './AIDesignPanel.web';","import { AIDesignPanel } from './AIDesignPanel.web';\nimport { EstimatePanel } from './EstimatePanel.web';");
  }else throw new Error('Estimate UI integration could not find an editor panel import anchor.');
}

if(!source.includes('const [estimateOpen,setEstimateOpen]=useState(false);')){
  if(source.includes('const [layoutCheckOpen,setLayoutCheckOpen]=useState(false);')){
    source=source.replace('const [layoutCheckOpen,setLayoutCheckOpen]=useState(false);','const [layoutCheckOpen,setLayoutCheckOpen]=useState(false);\n  const [estimateOpen,setEstimateOpen]=useState(false);');
  }else if(source.includes('const [aiOpen,setAiOpen]=useState(false);')){
    source=source.replace('const [aiOpen,setAiOpen]=useState(false);','const [aiOpen,setAiOpen]=useState(false);\n  const [estimateOpen,setEstimateOpen]=useState(false);');
  }else throw new Error('Estimate UI integration could not find editor panel state.');
}

if(!source.includes('setEstimateOpen(false);setTool(next);')){
  if(source.includes('setLayoutCheckOpen(false);setTool(next);'))source=source.replace('setLayoutCheckOpen(false);setTool(next);','setLayoutCheckOpen(false);setEstimateOpen(false);setTool(next);');
  else if(source.includes('setAiOpen(false);setTool(next);'))source=source.replace('setAiOpen(false);setTool(next);','setAiOpen(false);setEstimateOpen(false);setTool(next);');
  else throw new Error('Estimate UI integration could not extend chooseTool.');
}

if(!source.includes('const openEstimate=')){
  const anchor=/const openLayoutCheck=\(\)=>\{[^;]+;[^;]+;[^;]+;\};/;
  const match=source.match(anchor);
  if(match)source=source.replace(match[0],`${match[0]}\n  const openEstimate=()=>{setAiOpen(false);setLayoutCheckOpen(false);setEstimateOpen(true);};`);
  else if(source.includes('const chooseTool=')){
    const choose=/const chooseTool=\(next:Tool\)=>\{[^}]+\};/;
    const chooseMatch=source.match(choose);
    if(!chooseMatch)throw new Error('Estimate UI integration could not create openEstimate.');
    source=source.replace(chooseMatch[0],`${chooseMatch[0]}\n  const openEstimate=()=>{setAiOpen(false);setEstimateOpen(true);};`);
  }else throw new Error('Estimate UI integration could not create openEstimate.');
}

if(!source.includes('label="Project Estimate"')){
  const marker='<Button label="2D"';
  if(!source.includes(marker))throw new Error('Estimate UI integration could not find 2D button anchor.');
  source=source.replace(marker,'<Button label="Project Estimate" active={estimateOpen} onPress={openEstimate}/><Button label="2D"');
}

source=source.replaceAll('!aiOpen&&!layoutCheckOpen&&tool===item','!aiOpen&&!layoutCheckOpen&&!estimateOpen&&tool===item');
source=source.replaceAll('!aiOpen&&tool===item','!aiOpen&&!estimateOpen&&tool===item');

if(!source.includes('estimateOpen?<EstimatePanel')){
  const exact='{layoutCheckOpen?<LayoutCheckPanel project={project} onSelectObject={id=>preview({...project,selectedId:id})}/>:aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}';
  if(source.includes(exact)){
    source=source.replace(exact,'{estimateOpen?<EstimatePanel project={project}/>:layoutCheckOpen?<LayoutCheckPanel project={project} onSelectObject={id=>preview({...project,selectedId:id})}/>:aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}');
  }else{
    const simple='{aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}';
    if(source.includes(simple))source=source.replace(simple,'{estimateOpen?<EstimatePanel project={project}/>:aiOpen?<AIDesignPanel project={project} apply={next=>apply(next)}/>:<ToolPanel tool={tool} project={project} selected={selected} apply={apply} onHome={onExit}/>}');
    else throw new Error('Estimate UI integration could not find the left contextual panel expression.');
  }
}

if(source.includes('setLayoutCheckOpen(false);preview({...project,selectedId:undefined});')&&!source.includes('setEstimateOpen(false);preview({...project,selectedId:undefined});')){
  source=source.replace('setLayoutCheckOpen(false);preview({...project,selectedId:undefined});','setLayoutCheckOpen(false);setEstimateOpen(false);preview({...project,selectedId:undefined});');
}

if(source===original)throw new Error('Estimate UI integration made no changes.');
fs.writeFileSync(editorPath,source);
for(const file of [workflowPath,selfPath])if(fs.existsSync(file))fs.rmSync(file);
console.log('Project Estimate panel connected to the professional web editor.');
