import fs from 'node:fs';

const geometryPath='src/domain/geometry.ts';
let geometry=fs.readFileSync(geometryPath,'utf8');
const countertopAnchor="import { countertopData, countertopMaterial, islandData } from './countertops';";
if(!geometry.includes("from './cabinetFrontLayout'")){
  if(!geometry.includes(countertopAnchor))throw new Error('geometry countertop import anchor not found');
  geometry=geometry.replace(countertopAnchor,`${countertopAnchor}\nimport { CabinetFront, cabinetFrontLayout } from './cabinetFrontLayout';`);
}
if(!geometry.includes("from './cabinetDoorStyles'")){
  geometry=geometry.replace(countertopAnchor,`${countertopAnchor}\nimport { doorStyleParts } from './cabinetDoorStyles';`);
}

if(!geometry.includes('function addStyledCabinetFront')){
  const anchor='function addCabinetDetails(';
  const index=geometry.indexOf(anchor);
  if(index<0)throw new Error('addCabinetDetails anchor not found');
  const helper=`function localCabinetPoint(x:number,z:number,rotation:number,localXIn:number,localZIn:number){const c=Math.cos(rotation),s=Math.sin(rotation);return{x:x+c*inchesToScene(localXIn)+s*inchesToScene(localZIn),z:z-s*inchesToScene(localXIn)+c*inchesToScene(localZIn)};}\nfunction addStyledCabinetFront(boxes:Box3D[],object:EditorObject,front:CabinetFront,index:number,x:number,z:number,baseY:number,rotation:number){\n  if(front.id==='oven-opening')return;\n  const color=object.color??'#D8D4CA',localFrontZ=-(object.depthIn/2+.35),parts=doorStyleParts(object,front.widthIn,front.heightIn);\n  for(const part of parts){const point=localCabinetPoint(x,z,rotation,front.centerXIn+part.offsetXIn,localFrontZ-part.offsetZIn),partColor=part.colorMode==='glass'?'#B9D5DD':color;boxes.push({id:\\`${object.id}-front-${front.id}-${index}-${part.id}\\`,sourceId:object.id,kind:'cabinet-door',center:[point.x,baseY+inchesToScene(front.centerYIn+part.offsetYIn),point.z],size:[inchesToScene(part.widthIn),inchesToScene(part.heightIn),inchesToScene(part.depthIn)],rotationY:rotation,color:partColor,roughness:part.colorMode==='glass'?.1:part.colorMode==='shadow'?.56:.4,metalness:part.colorMode==='glass'?.06:.03});}\n}\nfunction addCabinetFrontHardware(boxes:Box3D[],object:EditorObject,front:CabinetFront,x:number,z:number,baseY:number,rotation:number){\n  if(!object.hardware||object.hardware.style==='No Hardware'||front.hardwareCount<1)return;\n  const localFrontZ=-(object.depthIn/2+.82),frontObject={...object,widthIn:front.widthIn,heightIn:front.heightIn},geometry=hardwareGeometry(frontObject),c=Math.cos(rotation),s=Math.sin(rotation);\n  if(!geometry)return;\n  for(let hardwareIndex=0;hardwareIndex<front.hardwareCount;hardwareIndex++){for(const part of geometry.parts){const localX=front.centerXIn+part.offsetXIn,localZ=localFrontZ+part.offsetZIn,worldX=x+c*inchesToScene(localX)+s*inchesToScene(localZ),worldZ=z-s*inchesToScene(localX)+c*inchesToScene(localZ);boxes.push({id:\\`${object.id}-front-${front.id}-hardware-${hardwareIndex}-${part.id}\\`,sourceId:object.id,kind:'hardware',center:[worldX,baseY+inchesToScene(front.centerYIn+part.offsetYIn),worldZ],size:[inchesToScene(part.widthIn),inchesToScene(part.heightIn),inchesToScene(part.depthIn)],rotationY:rotation,color:geometry.color,roughness:geometry.roughness,metalness:geometry.metalness});}}\n}\n\n`;
  geometry=geometry.slice(0,index)+helper+geometry.slice(index);
}

const functionPattern=/function addCabinetDetails\(boxes:Box3D\[\],object:EditorObject,x:number,z:number,baseY:number,rotation:number(?:,skipCountertop=false)?\)\{[\s\S]*?\n\}/;
const existing=geometry.match(functionPattern)?.[0];
if(!existing)throw new Error('addCabinetDetails function not found');
const signature=existing.startsWith('function addCabinetDetails(boxes:Box3D[],object:EditorObject,x:number,z:number,baseY:number,rotation:number,skipCountertop=false)')
  ?'function addCabinetDetails(boxes:Box3D[],object:EditorObject,x:number,z:number,baseY:number,rotation:number,skipCountertop=false)'
  :'function addCabinetDetails(boxes:Box3D[],object:EditorObject,x:number,z:number,baseY:number,rotation:number)';
const countertopBlock=existing.match(/if\(\(isBaseCabinetKind\(object\.kind\)&&!skipCountertop\)\|\|object\.kind==='island'\)[\s\S]*?(?=if\(object\.kind==='oven-cabinet'\))/)?.[0]
  ??existing.match(/if\(isBaseCabinetKind\(object\.kind\)\|\|object\.kind==='island'\)[\s\S]*?(?=if\(object\.kind==='oven-cabinet'\))/)?.[0]
  ??'';
const ovenBlock=existing.match(/if\(object\.kind==='oven-cabinet'\)[\s\S]*?(?=if\(object\.kind==='refrigerator-cabinet'\))/)?.[0]??'';
const fridgeBlock=existing.match(/if\(object\.kind==='refrigerator-cabinet'\)[\s\S]*?(?=addHardwareGeometry|\})/)?.[0]??'';
if(!countertopBlock||!ovenBlock||!fridgeBlock)throw new Error('cabinet appliance/countertop blocks not found');
const replacement=`${signature}{const fronts=cabinetFrontLayout(object);fronts.forEach((front,index)=>{addStyledCabinetFront(boxes,object,front,index,x,z,baseY,rotation);addCabinetFrontHardware(boxes,object,front,x,z,baseY,rotation);});${countertopBlock}${ovenBlock}${fridgeBlock}}`;
geometry=geometry.replace(existing,replacement);
fs.writeFileSync(geometryPath,geometry);

const bomPath='src/domain/billOfMaterials.ts';
if(fs.existsSync(bomPath)){
  let bom=fs.readFileSync(bomPath,'utf8');
  if(!bom.includes("from './cabinetFrontLayout'")){
    const anchor="import { countertopData, countertopMaterial } from './countertops';";
    if(!bom.includes(anchor))throw new Error('BOM import anchor not found');
    bom=bom.replace(anchor,`${anchor}\nimport { cabinetFrontHardwareCount } from './cabinetFrontLayout';`);
  }
  const old=/const hardwareCount=\(object:EditorObject\)=>\{[\s\S]*?\n\};/;
  if(old.test(bom))bom=bom.replace(old,'const hardwareCount=(object:EditorObject)=>cabinetFrontHardwareCount(object);');
  fs.writeFileSync(bomPath,bom);
}

for(const file of ['.github/workflows/apply-cabinet-front-layouts.yml','scripts/apply-cabinet-front-layouts.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Cabinet front layouts connected to WebGL hardware and Bill of Materials.');
