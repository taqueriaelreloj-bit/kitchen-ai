import fs from 'node:fs';

const webPath='src/components/EditorShell.web.tsx';
let web=fs.readFileSync(webPath,'utf8');
if(!web.includes("./SafeWebGLViewport.web")){
  const anchor="import { WebGLViewport } from './WebGLViewport.web';";
  if(web.includes(anchor))web=web.replace(anchor,`${anchor}\nimport { SafeWebGLViewport } from './SafeWebGLViewport.web';\nimport { centerCameraOnProject, fitCameraToProject, sanitizeCamera } from '../domain/cameraSafety';`);
  else{
    const lines=web.split('\n'),lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
    if(lastImport===undefined)throw new Error('web editor import anchor not found');
    lines.splice(lastImport+1,0,"import { SafeWebGLViewport } from './SafeWebGLViewport.web';","import { centerCameraOnProject, fitCameraToProject, sanitizeCamera } from '../domain/cameraSafety';");
    web=lines.join('\n');
  }
}
web=web.replaceAll('<WebGLViewport project={project} preview={preview}/>','<SafeWebGLViewport project={project} preview={preview}/>');
if(!web.includes('const safeFit3D=')){
  const anchor=/  const reset=\(\)=>[^;]+;/;
  const match=web.match(anchor);
  if(!match)throw new Error('web reset function anchor not found');
  web=web.replace(match[0],`${match[0]}\n  const safeFit3D=()=>preview({...project,camera3d:fitCameraToProject(project,project.camera3d)});\n  const safeCenter3D=()=>preview({...project,camera3d:centerCameraOnProject(project,project.camera3d)});`);
}
web=web.replaceAll('<Button label="Fit" onPress={fit}/>','<Button label="Fit" onPress={project.viewMode===\'3d\'?safeFit3D:fit}/><Button label="Center" onPress={project.viewMode===\'3d\'?safeCenter3D:fit}/>');
web=web.replaceAll('<Button label="Fit View" onPress={fit}/>','<Button label="Fit View" onPress={project.viewMode===\'3d\'?safeFit3D:fit}/>');
fs.writeFileSync(webPath,web);

const nativePath='src/components/EditorShell.tsx';
if(fs.existsSync(nativePath)){
  let native=fs.readFileSync(nativePath,'utf8');
  if(!native.includes("from '../domain/cameraSafety'")){
    const lines=native.split('\n'),lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
    if(lastImport===undefined)throw new Error('native editor import anchor not found');
    lines.splice(lastImport+1,0,"import { sanitizeCamera } from '../domain/cameraSafety';");
    native=lines.join('\n');
  }
  native=native.replaceAll('<NativeWorkspace project={project} apply={apply}/>','<NativeWorkspace project={project} apply={(next,record)=>apply(next.viewMode===\'3d\'?{...next,camera3d:sanitizeCamera(next,next.camera3d).camera}:next,record)}/>');
  fs.writeFileSync(nativePath,native);
}

for(const file of ['.github/workflows/apply-camera-safety.yml','scripts/apply-camera-safety.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Camera safety connected to WebGL and native editor boundaries.');
