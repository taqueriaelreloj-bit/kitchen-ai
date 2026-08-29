import fs from 'node:fs';

const candidates=['src/components/NativeWorkspace.native.tsx','src/components/NativeWorkspace.tsx'];
const workspacePath=candidates.find(fs.existsSync);
if(!workspacePath)throw new Error('NativeWorkspace implementation not found');
let source=fs.readFileSync(workspacePath,'utf8');
if(!source.includes("./NativeGLViewport.native")){
  const lines=source.split('\n'),lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
  if(lastImport===undefined)throw new Error('NativeWorkspace import anchor not found');
  lines.splice(lastImport+1,0,"import { NativeGLViewport } from './NativeGLViewport.native';");
  source=lines.join('\n');
}
if(!source.includes('<NativeGLViewport project={project} camera={visual3d}')){
  const pattern=/  if\(project\.viewMode==='3d'\)\{[\s\S]*?\n  \}\n\n  const gridLines/;
  if(!pattern.test(source))throw new Error('NativeWorkspace 3D preview branch not found');
  const replacement=`  if(project.viewMode==='3d'){\n    return <View accessibilityLabel="3D kitchen touch workspace" style={s.workspace} {...responder.panHandlers}>\n      <View style={s.previewHeader}><Text style={s.previewTitle}>3D Kitchen</Text><Text style={s.gestureHint}>Pinch to zoom · Two-finger drag to pan · Use Properties to edit selection</Text></View>\n      <NativeGLViewport project={project} camera={visual3d}/>\n    </View>;\n  }\n\n  const gridLines`;
  source=source.replace(pattern,replacement);
}
fs.writeFileSync(workspacePath,source);

for(const file of ['.github/workflows/apply-native-real-3d.yml','scripts/apply-native-real-3d.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log(`Native OpenGL viewport connected through ${workspacePath}.`);
