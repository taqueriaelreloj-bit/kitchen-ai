import { EditorObject, EditorProject, isBaseCabinetKind, objectDefaults, updateObject } from './editor';

export type CountertopMaterialId = 'quartz-white'|'quartz-calacatta'|'granite-black'|'granite-white'|'marble-carrara'|'butcher-block'|'concrete';
export type EdgeProfile = 'Eased'|'Beveled'|'Bullnose'|'Half Bullnose'|'Ogee'|'Waterfall';
export type CountertopSpec = {
  materialId: CountertopMaterialId;
  thicknessIn: number;
  overhangFrontIn: number;
  overhangSideIn: number;
  edgeProfile: EdgeProfile;
  backsplashHeightIn: number;
  sinkCutout: boolean;
  cooktopCutout: boolean;
};
export type IslandSpec = {
  seatingCount: number;
  seatingOverhangIn: number;
  sink: boolean;
  dishwasher: boolean;
  cooktop: boolean;
  waterfallLeft: boolean;
  waterfallRight: boolean;
};
export type CountertopMaterial = { id:CountertopMaterialId; name:string; color:string; roughness:number; metalness:number };
export const COUNTERTOP_MATERIALS: CountertopMaterial[] = [
  {id:'quartz-white',name:'White Quartz',color:'#E9E6DF',roughness:.24,metalness:.01},
  {id:'quartz-calacatta',name:'Calacatta Quartz',color:'#EEEDE8',roughness:.22,metalness:.01},
  {id:'granite-black',name:'Black Granite',color:'#343433',roughness:.3,metalness:.02},
  {id:'granite-white',name:'White Granite',color:'#D9D7D0',roughness:.32,metalness:.02},
  {id:'marble-carrara',name:'Carrara Marble',color:'#E2E2DE',roughness:.2,metalness:.01},
  {id:'butcher-block',name:'Butcher Block',color:'#B88658',roughness:.52,metalness:0},
  {id:'concrete',name:'Concrete',color:'#9A9A94',roughness:.72,metalness:0},
];
export const EDGE_PROFILES: EdgeProfile[] = ['Eased','Beveled','Bullnose','Half Bullnose','Ogee','Waterfall'];
export const DEFAULT_COUNTERTOP: CountertopSpec = { materialId:'quartz-white', thicknessIn:1.5, overhangFrontIn:1, overhangSideIn:.5, edgeProfile:'Eased', backsplashHeightIn:0, sinkCutout:false, cooktopCutout:false };
export const DEFAULT_ISLAND: IslandSpec = { seatingCount:3, seatingOverhangIn:12, sink:false, dishwasher:false, cooktop:false, waterfallLeft:false, waterfallRight:false };

type CounterObject = EditorObject & { countertopSpec?:CountertopSpec; islandSpec?:IslandSpec };
export const countertopData = (object:EditorObject):CountertopSpec => ({...DEFAULT_COUNTERTOP,...((object as CounterObject).countertopSpec??{})});
export const islandData = (object:EditorObject):IslandSpec => ({...DEFAULT_ISLAND,...((object as CounterObject).islandSpec??{})});

export function createCountertop(partial:Partial<EditorObject>={}):EditorObject {
  return objectDefaults('countertop',{...partial,heightIn:DEFAULT_COUNTERTOP.thicknessIn,material:'White Quartz',color:COUNTERTOP_MATERIALS[0].color,countertopSpec:{...DEFAULT_COUNTERTOP}} as Partial<EditorObject>);
}
export function createIsland(partial:Partial<EditorObject>={}):EditorObject {
  return objectDefaults('island',{...partial,countertopSpec:{...DEFAULT_COUNTERTOP},islandSpec:{...DEFAULT_ISLAND}} as Partial<EditorObject>);
}
export function updateCountertop(project:EditorProject,id:string,patch:Partial<CountertopSpec>):EditorProject {
  const object=project.objects.find(x=>x.id===id);
  const supportsCountertop=object&&(object.kind==='countertop'||object.kind==='island'||isBaseCabinetKind(object.kind));
  if(!object||!supportsCountertop)return project;
  const spec={...countertopData(object),...patch};
  const material=COUNTERTOP_MATERIALS.find(x=>x.id===spec.materialId)??COUNTERTOP_MATERIALS[0];
  const objectPatch:Partial<CounterObject>={countertopSpec:spec};
  if(object.kind==='countertop')Object.assign(objectPatch,{heightIn:spec.thicknessIn,material:material.name,color:material.color});
  return updateObject(project,id,objectPatch as Partial<EditorObject>);
}
export function updateIsland(project:EditorProject,id:string,patch:Partial<IslandSpec>):EditorProject {
  const object=project.objects.find(x=>x.id===id&&x.kind==='island');
  if(!object)return project;
  const islandSpec={...islandData(object),...patch};
  const countertopSpec={...countertopData(object)};
  // One source of truth for island plumbing/cooking layout: enabling the island
  // feature also creates the required countertop cutout, and disabling removes it.
  if (patch.sink !== undefined) countertopSpec.sinkCutout = patch.sink;
  if (patch.cooktop !== undefined) countertopSpec.cooktopCutout = patch.cooktop;
  return updateObject(project,id,{islandSpec,countertopSpec} as Partial<EditorObject>);
}
export function countertopMaterial(object:EditorObject):CountertopMaterial {
  const spec=countertopData(object); return COUNTERTOP_MATERIALS.find(x=>x.id===spec.materialId)??COUNTERTOP_MATERIALS[0];
}