import fs from 'node:fs';

const panelPath='src/components/CabinetToolPanel.tsx';
let panel=fs.readFileSync(panelPath,'utf8');
if(!panel.includes("./CabinetDoorStylePanel")){
  const importLines=panel.split('\n');
  const lastImport=importLines.map((line,index)=>line.startsWith('import ')?index:-1).filter(index=>index>=0).pop();
  if(lastImport===undefined)throw new Error('CabinetToolPanel import anchor not found');
  importLines.splice(lastImport+1,0,"import { CabinetDoorStylePanel } from './CabinetDoorStylePanel';");
  panel=importLines.join('\n');
}
if(!panel.includes('<CabinetDoorStylePanel project={project}')){
  const anchor="      {isBaseLikeKind(cabinet.kind)&&<View style={s.card}>";
  if(!panel.includes(anchor))throw new Error('CabinetToolPanel toe-kick anchor not found');
  panel=panel.replace(anchor,"      <View style={s.card}><CabinetDoorStylePanel project={project} selected={cabinet} apply={next=>apply(next)}/></View>\n\n"+anchor);
}
fs.writeFileSync(panelPath,panel);

const geometryPath='src/domain/geometry.ts';
let geometry=fs.readFileSync(geometryPath,'utf8');
if(!geometry.includes("from './cabinetDoorStyles'")){
  const anchor="import { countertopData, countertopMaterial, islandData } from './countertops';";
  if(!geometry.includes(anchor))throw new Error('geometry countertop import anchor not found');
  geometry=geometry.replace(anchor,`${anchor}\nimport { doorStyleParts } from './cabinetDoorStyles';`);
}
if(!geometry.includes('function addStyledCabinetDoor')){
  const anchor='function addCabinetDetails(';
  const index=geometry.indexOf(anchor);
  if(index<0)throw new Error('addCabinetDetails anchor not found');
  const helper=`function addStyledCabinetDoor(boxes:Box3D[],object:EditorObject,doorIndex:number,doorCenterOffsetIn:number,doorWidthIn:number,doorHeightIn:number,x:number,z:number,baseY:number,rotation:number){\n  const color=object.color??'#D8D4CA',localFrontZ=-(object.depthIn/2+.35),c=Math.cos(rotation),s=Math.sin(rotation),parts=doorStyleParts(object,doorWidthIn,doorHeightIn);\n  for(const part of parts){\n    const localX=doorCenterOffsetIn+part.offsetXIn,localZ=localFrontZ-part.offsetZIn,worldX=x+c*inchesToScene(localX)+s*inchesToScene(localZ),worldZ=z-s*inchesToScene(localX)+c*inchesToScene(localZ),partColor=part.colorMode==='glass'?'#B9D5DD':part.colorMode==='shadow'?color:color;\n    boxes.push({id:\\`${object.id}-door-${doorIndex}-${part.id}\\`,sourceId:object.id,kind:'cabinet-door',center:[worldX,baseY+inchesToScene(part.offsetYIn),worldZ],size:[inchesToScene(part.widthIn),inchesToScene(part.heightIn),inchesToScene(part.depthIn)],rotationY:rotation,color:partColor,roughness:part.colorMode==='glass'?.1:part.colorMode==='shadow'?.56:.4,metalness:part.colorMode==='glass'?.06:.03});\n  }\n}\n\n`;
  geometry=geometry.slice(0,index)+helper+geometry.slice(index);
}
const flatPattern=/centers\.forEach\(\(offset,index\)=>boxes\.push\(\{id:`\$\{object\.id\}-door-\$\{index\}`[\s\S]*?\}\)\);/;
if(flatPattern.test(geometry))geometry=geometry.replace(flatPattern,"centers.forEach((offset,index)=>addStyledCabinetDoor(boxes,object,index,offset,panelWidth,panelHeight,x,z,baseY,rotation));");
else if(!geometry.includes('addStyledCabinetDoor(boxes,object,index'))throw new Error('flat cabinet door geometry anchor not found');
fs.writeFileSync(geometryPath,geometry);

for(const file of ['.github/workflows/apply-cabinet-door-styles.yml','scripts/apply-cabinet-door-styles.mjs'])if(fs.existsSync(file))fs.rmSync(file);
console.log('Cabinet door style selector and WebGL geometry connected.');
