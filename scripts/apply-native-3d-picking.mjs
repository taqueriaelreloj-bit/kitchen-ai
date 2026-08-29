import fs from 'node:fs';

const candidates=['src/components/NativeWorkspace.native.tsx','src/components/NativeWorkspace.tsx'];
const workspacePath=candidates.find(fs.existsSync);
if(!workspacePath)throw new Error('NativeWorkspace implementation not found');
let source=fs.readFileSync(workspacePath,'utf8');

const lines=source.split('\n');
if(!source.includes("./NativeSelectableGLViewport.native")){
  const existingIndex=lines.findIndex(line=>line.includes("./NativeGLViewport.native"));
  if(existingIndex>=0)lines[existingIndex]="import { NativeSelectableGLViewport } from './NativeSelectableGLViewport.native';";
  else{
    const lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
    if(lastImport===undefined)throw new Error('NativeWorkspace import anchor not found');
    lines.splice(lastImport+1,0,"import { NativeSelectableGLViewport } from './NativeSelectableGLViewport.native';");
  }
  source=lines.join('\n');
}
source=source.replaceAll('<NativeGLViewport project={project} camera={visual3d}/>','<NativeSelectableGLViewport project={project} camera={visual3d} onSelect={id=>apply({...project,selectedId:id},false)}/>');

if(!source.includes('<NativeSelectableGLViewport project={project}')){
  const pattern=/  if\(project\.viewMode==='3d'\)\{[\s\S]*?\n  \}\n\n  const gridLines/;
  if(!pattern.test(source))throw new Error('NativeWorkspace 3D branch not found');
  source=source.replace(pattern,`  if(project.viewMode==='3d'){\n    return <View accessibilityLabel="3D kitchen touch workspace" style={s.workspace} {...responder.panHandlers}>\n      <View style={s.previewHeader}><Text style={s.previewTitle}>3D Kitchen</Text><Text style={s.gestureHint}>Tap to select · Pinch to zoom · Two-finger drag to pan</Text></View>\n      <NativeSelectableGLViewport project={project} camera={visual3d} onSelect={id=>apply({...project,selectedId:id},false)}/>\n    </View>;\n  }\n\n  const gridLines`);
}
fs.writeFileSync(workspacePath,source);
for(const file of ['.github/workflows/apply-native-3d-picking.yml','scripts/apply-native-3d-picking.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log(`Native 3D tap selection connected through ${workspacePath}.`);
