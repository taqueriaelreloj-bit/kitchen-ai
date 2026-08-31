import fs from 'node:fs';

const geometryPath='src/domain/geometry.ts';
let geometry=fs.readFileSync(geometryPath,'utf8');
if(!geometry.includes("from './doorSwing'")){
  const anchor="import { EditorObject, isBaseCabinetKind, isBaseLikeKind, isCabinetKind } from './editor';";
  if(!geometry.includes(anchor))throw new Error('geometry editor import anchor not found');
  geometry=geometry.replace(anchor,`${anchor}\nimport { doorSwingGeometry } from './doorSwing';`);
}

const replacement=`function addDoorGeometry(boxes:Box3D[],opening:EditorObject,objects:EditorObject[]){\n  const pose=openingPose(opening,objects),swing=doorSwingGeometry(opening),wallAngle=toRadians(pose.rotation),worldPoint=(alongIn:number,normalIn:number)=>({x:pose.x+Math.cos(wallAngle)*alongIn-Math.sin(wallAngle)*normalIn,z:pose.z+Math.sin(wallAngle)*alongIn+Math.cos(wallAngle)*normalIn}),leaf=worldPoint(swing.leafCenterAlongIn,swing.leafCenterNormalIn),handle=worldPoint(swing.handleAlongIn,swing.handleNormalIn),height=inchesToScene(opening.heightIn),trim=2.25,closedRotation=-toRadians(pose.rotation),leafRotation=-toRadians(pose.rotation+swing.leafRotationDeg),x=inchesToScene(pose.x),z=inchesToScene(pose.z);\n  boxes.push({id:opening.id,sourceId:opening.id,kind:'opening',center:[inchesToScene(leaf.x),height/2,inchesToScene(leaf.z)],size:[inchesToScene(opening.widthIn-1),height,inchesToScene(1.25)],rotationY:leafRotation,color:opening.color??'#8A664B',roughness:.52,metalness:.02});\n  boxes.push({id:\\`${opening.id}-handle\\`,sourceId:opening.id,kind:'hardware',center:[inchesToScene(handle.x),inchesToScene(Math.min(40,opening.heightIn*.48)),inchesToScene(handle.z)],size:[inchesToScene(.8),inchesToScene(5),inchesToScene(.8)],rotationY:leafRotation,color:'#B5AA92',roughness:.3,metalness:.82});\n  const hinge=worldPoint(swing.hinge==='left'?-opening.widthIn/2:opening.widthIn/2,0);\n  boxes.push({id:\\`${opening.id}-hinge\\`,sourceId:opening.id,kind:'hardware',center:[inchesToScene(hinge.x),height*.5,inchesToScene(hinge.z)],size:[inchesToScene(.6),inchesToScene(Math.min(18,opening.heightIn*.24)),inchesToScene(.6)],rotationY:closedRotation,color:'#777B79',roughness:.42,metalness:.75});\n  boxes.push({id:\\`${opening.id}-trim-left\\`,sourceId:opening.id,kind:'trim',center:[x-inchesToScene(opening.widthIn/2+trim/2),height/2,z],size:[inchesToScene(trim),height+inchesToScene(trim),inchesToScene(1.5)],rotationY:closedRotation,color:'#F0EEE8',roughness:.68,metalness:0},{id:\\`${opening.id}-trim-right\\`,sourceId:opening.id,kind:'trim',center:[x+inchesToScene(opening.widthIn/2+trim/2),height/2,z],size:[inchesToScene(trim),height+inchesToScene(trim),inchesToScene(1.5)],rotationY:closedRotation,color:'#F0EEE8',roughness:.68,metalness:0},{id:\\`${opening.id}-trim-top\\`,sourceId:opening.id,kind:'trim',center:[x,height+inchesToScene(trim/2),z],size:[inchesToScene(opening.widthIn+trim*2),inchesToScene(trim),inchesToScene(1.5)],rotationY:closedRotation,color:'#F0EEE8',roughness:.68,metalness:0});\n}\n`;
const doorPattern=/function addDoorGeometry\([\s\S]*?\nfunction addWindowGeometry/;
if(!doorPattern.test(geometry))throw new Error('addDoorGeometry block not found');
geometry=geometry.replace(doorPattern,`${replacement}function addWindowGeometry`);
fs.writeFileSync(geometryPath,geometry);

const workspaceTargets=['src/components/Workspace2D.web.tsx','src/components/NativeWorkspace.tsx','src/components/NativeWorkspace.native.tsx'].filter(fs.existsSync);
for(const file of workspaceTargets){
  let source=fs.readFileSync(file,'utf8');
  if(!source.includes("./DoorPlanSymbol")){
    const lines=source.split('\n');
    const lastImport=lines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
    if(lastImport===undefined)throw new Error(`${file}: no import anchor`);
    lines.splice(lastImport+1,0,"import { DoorPlanSymbol } from './DoorPlanSymbol';");
    source=lines.join('\n');
  }
  if(!source.includes('<DoorPlanSymbol door={object}')){
    const candidates=[
      '<Text numberOfLines={1} style={s.label}>{object.name}</Text>',
      '<Text numberOfLines={1} style={s.objectLabel}>{object.name}</Text>',
      '<Text numberOfLines={1} style={s.objLabel}>{object.name}</Text>',
    ];
    const anchor=candidates.find(candidate=>source.includes(candidate));
    if(!anchor)throw new Error(`${file}: object label anchor not found`);
    source=source.replace(anchor,`${anchor}{object.kind==='door'&&<DoorPlanSymbol door={object} scale={${file.includes('Workspace2D')?'.45':'.38'}}/>}`);
  }
  fs.writeFileSync(file,source);
}

for(const file of ['.github/workflows/apply-door-swing-visuals.yml','scripts/apply-door-swing-visuals.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Door swing direction now renders in 2D and WebGL 3D.');
