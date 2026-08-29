import { summarizeBillOfMaterials } from './billOfMaterials';
import {
  EditorProject,
  isBaseCabinetKind,
  isTallCabinetKind,
  isWallCabinetKind,
} from './editor';
import { isLighting } from './lighting';

export const EDITOR_ESTIMATE_VERSION='2026-mvp-1';

export type EstimateCategory={
  id:'cabinets'|'countertops'|'hardware'|'lighting'|'wall-finishes'|'installation';
  label:string;
  low:number;
  high:number;
  basis:string;
};

export type EditorProjectEstimate={
  version:string;
  low:number;
  high:number;
  categories:EstimateCategory[];
  excludedApplianceCount:number;
  assumptions:string[];
};

const moneyRound=(value:number)=>Math.round(value/25)*25;
const category=(id:EstimateCategory['id'],label:string,low:number,high:number,basis:string):EstimateCategory=>({id,label,low:moneyRound(low),high:moneyRound(high),basis});

export function estimateEditorProject(project:EditorProject):EditorProjectEstimate{
  const materials=summarizeBillOfMaterials(project);
  const baseLinearFeet=project.objects.filter(object=>isBaseCabinetKind(object.kind)).reduce((total,object)=>total+object.widthIn/12,0);
  const wallLinearFeet=project.objects.filter(object=>isWallCabinetKind(object.kind)).reduce((total,object)=>total+object.widthIn/12,0);
  const tallCount=project.objects.filter(object=>isTallCabinetKind(object.kind)).length;
  const islands=project.objects.filter(object=>object.kind==='island');
  const islandLinearFeet=islands.reduce((total,object)=>total+object.widthIn/12,0);
  const cabinetLow=baseLinearFeet*520+wallLinearFeet*390+tallCount*1650+islandLinearFeet*650;
  const cabinetHigh=baseLinearFeet*900+wallLinearFeet*680+tallCount*3200+islandLinearFeet*1100;

  const countertopLow=materials.countertopSquareFeet*65;
  const countertopHigh=materials.countertopSquareFeet*145;
  const hardwareLow=materials.hardwareCount*8;
  const hardwareHigh=materials.hardwareCount*42;
  const lightingObjects=project.objects.filter(isLighting);
  const lightingLow=lightingObjects.length*225;
  const lightingHigh=lightingObjects.length*750;
  const wallFinishLow=materials.wallPaintSquareFeet*1.25;
  const wallFinishHigh=materials.wallPaintSquareFeet*3.25;

  const directLow=cabinetLow+countertopLow+hardwareLow+lightingLow+wallFinishLow;
  const directHigh=cabinetHigh+countertopHigh+hardwareHigh+lightingHigh+wallFinishHigh;
  const installationLow=directLow*.22;
  const installationHigh=directHigh*.38;

  const categories=[
    category('cabinets','Cabinets',cabinetLow,cabinetHigh,`${baseLinearFeet.toFixed(1)} base lf · ${wallLinearFeet.toFixed(1)} wall lf · ${tallCount} tall · ${islandLinearFeet.toFixed(1)} island lf`),
    category('countertops','Countertops',countertopLow,countertopHigh,`${materials.countertopSquareFeet.toFixed(1)} sq ft including modeled backsplash`),
    category('hardware','Cabinet Hardware',hardwareLow,hardwareHigh,`${materials.hardwareCount} pulls/knobs`),
    category('lighting','Lighting',lightingLow,lightingHigh,`${lightingObjects.length} modeled fixtures`),
    category('wall-finishes','Wall Finishes',wallFinishLow,wallFinishHigh,`${materials.wallPaintSquareFeet.toFixed(1)} net wall sq ft after openings`),
    category('installation','Installation & Coordination',installationLow,installationHigh,'Planning allowance based on modeled work'),
  ];
  const low=moneyRound(categories.reduce((total,item)=>total+item.low,0));
  const high=moneyRound(categories.reduce((total,item)=>total+item.high,0));
  const excludedApplianceCount=project.objects.filter(object=>object.kind==='appliance'&&!isLighting(object)).length;

  return{
    version:EDITOR_ESTIMATE_VERSION,
    low,
    high:Math.max(low,high),
    categories,
    excludedApplianceCount,
    assumptions:[
      'Planning estimate only; it is not a contractor quote.',
      'Cabinet ranges vary by construction, door style, finish and customization.',
      'Countertop ranges vary by material, edge profile, cutouts and fabrication.',
      'Appliances, permits, engineering, taxes and hidden-condition repairs are excluded.',
      'Confirm field dimensions, local labor and supplier pricing before purchase or construction.',
    ],
  };
}
