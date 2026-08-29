import fs from 'node:fs';

const file='src/domain/geometry.ts';
let source=fs.readFileSync(file,'utf8');

if(!source.includes("from './countertopRuns'")){
  const anchor="import { countertopData, countertopMaterial, islandData } from './countertops';";
  if(!source.includes(anchor))throw new Error('countertop import anchor not found');
  source=source.replace(anchor,`${anchor}\nimport { continuousCountertopRuns, countertopRunIds, CountertopRun } from './countertopRuns';`);
}

if(!source.includes('function addCountertopRunGeometry')){
  const anchor='function addCabinetDetails(';
  const index=source.indexOf(anchor);
  if(index<0)throw new Error('addCabinetDetails anchor not found');
  const helper=`function addCountertopRunGeometry(boxes:Box3D[],run:CountertopRun){\n  const spec=run.spec,angle=toRadians(run.rotation),front={x:Math.sin(angle),z:-Math.cos(angle)},x=inchesToScene(run.centerX+front.x*spec.overhangFrontIn/2),z=inchesToScene(run.centerY+front.z*spec.overhangFrontIn/2),rotation=-angle,width=run.widthIn+spec.overhangSideIn*2,depth=run.depthIn+spec.overhangFrontIn,top=inchesToScene(run.topIn),thickness=inchesToScene(spec.thicknessIn);\n  boxes.push({id:run.id,sourceId:run.ids[0],kind:'countertop',center:[x,top+thickness/2,z],size:[inchesToScene(width),thickness,inchesToScene(depth)],rotationY:rotation,color:run.material.color,roughness:run.material.roughness,metalness:run.material.metalness});\n  if(spec.backsplashHeightIn>0){const rearOffset=run.depthIn/2-.35;boxes.push({id:\\`${run.id}-backsplash\\`,sourceId:run.ids[0],kind:'countertop',center:[inchesToScene(run.centerX-front.x*rearOffset),top+inchesToScene(spec.backsplashHeightIn/2),inchesToScene(run.centerY-front.z*rearOffset)],size:[inchesToScene(width),inchesToScene(spec.backsplashHeightIn),inchesToScene(.7)],rotationY:rotation,color:run.material.color,roughness:run.material.roughness,metalness:run.material.metalness});}\n  for(const cutout of run.cutouts){boxes.push({id:\\`${run.id}-${cutout.type}-${cutout.sourceId}\\`,sourceId:cutout.sourceId,kind:cutout.type==='sink'?'fixture':'appliance',center:[inchesToScene(cutout.centerX),cutout.type==='sink'?top-inchesToScene(2.2):top+thickness+inchesToScene(.12),inchesToScene(cutout.centerY)],size:[inchesToScene(cutout.widthIn),cutout.type==='sink'?inchesToScene(4):inchesToScene(.2),inchesToScene(cutout.depthIn)],rotationY:rotation,color:cutout.type==='sink'?'#9AA6A8':'#252929',roughness:cutout.type==='sink'?.22:.12,metalness:cutout.type==='sink'?.8:.55});}\n}\n\n`;
  source=source.slice(0,index)+helper+source.slice(index);
}

source=source.replace('function addCabinetDetails(boxes:Box3D[],object:EditorObject,x:number,z:number,baseY:number,rotation:number){','function addCabinetDetails(boxes:Box3D[],object:EditorObject,x:number,z:number,baseY:number,rotation:number,skipCountertop=false){');
source=source.replace("if(isBaseCabinetKind(object.kind)||object.kind==='island'){const topY=baseY+inchesToScene(object.heightIn/2);countertopBox(boxes,object,x,z,topY,rotation,true);", "if((isBaseCabinetKind(object.kind)&&!skipCountertop)||object.kind==='island'){const topY=baseY+inchesToScene(object.heightIn/2);countertopBox(boxes,object,x,z,topY,rotation,true);");

if(!source.includes('const countertopRuns=continuousCountertopRuns(objects)')){
  const marker="],toeIds=new Set<string>();continuousToeKickRuns(objects)";
  if(!source.includes(marker))throw new Error('buildSceneBoxes toe kick anchor not found');
  source=source.replace(marker,"],toeIds=new Set<string>(),countertopRuns=continuousCountertopRuns(objects),counterIds=countertopRunIds(countertopRuns);countertopRuns.forEach(run=>addCountertopRunGeometry(boxes,run));continuousToeKickRuns(objects)");
}

source=source.replace('if(isCabinet(object))addCabinetDetails(boxes,object,x,z,baseY,rotation);','if(isCabinet(object))addCabinetDetails(boxes,object,x,z,baseY,rotation,counterIds.has(object.id));');

fs.writeFileSync(file,source);
for(const path of ['.github/workflows/apply-continuous-countertops.yml','scripts/apply-continuous-countertops.mjs'])if(fs.existsSync(path))fs.rmSync(path);
console.log('Continuous countertop runs connected to WebGL geometry.');
