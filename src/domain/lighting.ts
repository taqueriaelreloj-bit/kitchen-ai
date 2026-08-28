import { EditorObject, EditorProject, objectDefaults, updateObject } from './editor';

export type LightingType = 'Recessed'|'Pendant'|'Under Cabinet';
export type ColorTemperature = 2700|3000|3500|4000|5000;
export type LightingSpec = {
  type: LightingType;
  colorTemperatureK: ColorTemperature;
  intensityPercent: number;
  diameterIn: number;
  lengthIn: number;
  dropIn: number;
  enabled: boolean;
};

type LightingObject = EditorObject & { lightingSpec?: LightingSpec };
export const DEFAULT_LIGHTING: Record<LightingType,LightingSpec> = {
  Recessed:{type:'Recessed',colorTemperatureK:3000,intensityPercent:80,diameterIn:6,lengthIn:6,dropIn:0,enabled:true},
  Pendant:{type:'Pendant',colorTemperatureK:3000,intensityPercent:80,diameterIn:10,lengthIn:10,dropIn:30,enabled:true},
  'Under Cabinet':{type:'Under Cabinet',colorTemperatureK:3000,intensityPercent:70,diameterIn:1,lengthIn:24,dropIn:0,enabled:true},
};
export const COLOR_TEMPERATURES: ColorTemperature[] = [2700,3000,3500,4000,5000];

export function isLighting(object:EditorObject): boolean {
  return Boolean((object as LightingObject).lightingSpec) || object.material === 'Kitchen Lighting';
}
export function lightingData(object:EditorObject): LightingSpec {
  const current=(object as LightingObject).lightingSpec;
  const type=current?.type??'Recessed';
  return {...DEFAULT_LIGHTING[type],...(current??{})};
}
export function createLighting(type:LightingType,partial:Partial<EditorObject>={}):EditorObject {
  const spec={...DEFAULT_LIGHTING[type]};
  const dimensions=type==='Recessed'?{widthIn:6,depthIn:6,heightIn:2,elevationIn:94}:type==='Pendant'?{widthIn:10,depthIn:10,heightIn:spec.dropIn,elevationIn:96-spec.dropIn}:{widthIn:spec.lengthIn,depthIn:2,heightIn:1,elevationIn:52};
  return objectDefaults('appliance',{name:`${type} Light`,material:'Kitchen Lighting',color:'#FFE5B0',...dimensions,...partial,lightingSpec:spec} as Partial<EditorObject>);
}
export function updateLighting(project:EditorProject,id:string,patch:Partial<LightingSpec>):EditorProject {
  const object=project.objects.find(item=>item.id===id);
  if(!object||!isLighting(object))return project;
  const spec={...lightingData(object),...patch};
  const dimensions:Partial<EditorObject>={};
  if(spec.type==='Recessed'){dimensions.widthIn=spec.diameterIn;dimensions.depthIn=spec.diameterIn;dimensions.heightIn=2;}
  if(spec.type==='Pendant'){dimensions.widthIn=spec.diameterIn;dimensions.depthIn=spec.diameterIn;dimensions.heightIn=spec.dropIn;}
  if(spec.type==='Under Cabinet'){dimensions.widthIn=spec.lengthIn;dimensions.depthIn=2;dimensions.heightIn=1;}
  return updateObject(project,id,{...dimensions,lightingSpec:spec} as Partial<EditorObject>);
}
export function kelvinColor(k:number):string {
  if(k<=2700)return '#FFD6A1';
  if(k<=3000)return '#FFE2B8';
  if(k<=3500)return '#FFF0D1';
  if(k<=4000)return '#FFF7E8';
  return '#EEF5FF';
}
