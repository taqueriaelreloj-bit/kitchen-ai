import { buildBillOfMaterials } from './billOfMaterials';
import { EditorProject, isBaseCabinetKind, isTallCabinetKind, isWallCabinetKind } from './editor';
import { isLighting } from './lighting';

export type EstimateUnit='ea'|'lin ft'|'sq ft'|'allowance'|'percent';
export type EstimateLine={
  id:string;
  category:'Cabinetry'|'Countertops'|'Hardware'|'Toe Kick'|'Wall Paint'|'Appliances'|'Lighting'|'Installation'|'Contingency'|'Overhead & Profit';
  description:string;
  quantity:number;
  unit:EstimateUnit;
  unitCost:number;
  subtotal:number;
  source:'editor'|'bill-of-materials'|'calculated';
};
export type EstimateRates={
  baseCabinetPerLinearFt:number;
  wallCabinetPerLinearFt:number;
  tallCabinetEach:number;
  islandCabinetPerLinearFt:number;
  countertopPerSqFt:number;
  hardwareEach:number;
  toeKickPerLinearFt:number;
  wallPaintPerSqFt:number;
  applianceAllowanceEach:number;
  lightingEach:number;
  installationPercent:number;
  contingencyPercent:number;
  overheadProfitPercent:number;
};
export type EstimateOptions={
  includeApplianceAllowance?:boolean;
  includeWallPaint?:boolean;
  includeInstallation?:boolean;
  includeContingency?:boolean;
  includeOverheadProfit?:boolean;
  salesTaxPercent?:number;
  regionLabel?:string;
  currency?:string;
};
export type EditorEstimate={
  projectId:string;
  projectName:string;
  regionLabel:string;
  currency:string;
  pricingMode:'configurable-editor-rates';
  generatedAt:string;
  lines:EstimateLine[];
  directCost:number;
  salesTax:number;
  total:number;
  low:number;
  high:number;
  disclaimer:string;
};

export const DEFAULT_ESTIMATE_RATES:EstimateRates={
  baseCabinetPerLinearFt:650,
  wallCabinetPerLinearFt:525,
  tallCabinetEach:1800,
  islandCabinetPerLinearFt:800,
  countertopPerSqFt:130,
  hardwareEach:14,
  toeKickPerLinearFt:18,
  wallPaintPerSqFt:2.75,
  applianceAllowanceEach:1200,
  lightingEach:225,
  installationPercent:18,
  contingencyPercent:5,
  overheadProfitPercent:20,
};

const round=(value:number,places=2)=>{const factor=10**places;return Math.round(value*factor)/factor;};
const line=(id:EstimateLine['id'],category:EstimateLine['category'],description:string,quantity:number,unit:EstimateUnit,unitCost:number,source:EstimateLine['source']='editor'):EstimateLine=>({id,category,description,quantity:round(quantity),unit,unitCost:round(unitCost),subtotal:round(quantity*unitCost),source});
const sum=(lines:EstimateLine[])=>round(lines.reduce((total,item)=>total+item.subtotal,0));

export function estimateKitchenProject(
  project:EditorProject,
  rates:EstimateRates=DEFAULT_ESTIMATE_RATES,
  options:EstimateOptions={},
):EditorEstimate{
  const includeAppliances=options.includeApplianceAllowance??false;
  const includePaint=options.includeWallPaint??true;
  const includeInstallation=options.includeInstallation??true;
  const includeContingency=options.includeContingency??true;
  const includeOverhead=options.includeOverheadProfit??true;
  const lines:EstimateLine[]=[];

  const baseLinearFt=project.objects.filter(object=>isBaseCabinetKind(object.kind)).reduce((total,object)=>total+object.widthIn/12,0);
  const wallLinearFt=project.objects.filter(object=>isWallCabinetKind(object.kind)).reduce((total,object)=>total+object.widthIn/12,0);
  const tallCount=project.objects.filter(object=>isTallCabinetKind(object.kind)).length;
  const islandLinearFt=project.objects.filter(object=>object.kind==='island').reduce((total,object)=>total+object.widthIn/12,0);
  if(baseLinearFt)lines.push(line('cabinet-base','Cabinetry','Base cabinets',baseLinearFt,'lin ft',rates.baseCabinetPerLinearFt));
  if(wallLinearFt)lines.push(line('cabinet-wall','Cabinetry','Wall cabinets',wallLinearFt,'lin ft',rates.wallCabinetPerLinearFt));
  if(tallCount)lines.push(line('cabinet-tall','Cabinetry','Tall / pantry / appliance cabinets',tallCount,'ea',rates.tallCabinetEach));
  if(islandLinearFt)lines.push(line('cabinet-island','Cabinetry','Island cabinetry',islandLinearFt,'lin ft',rates.islandCabinetPerLinearFt));

  const materials=buildBillOfMaterials(project);
  const countertopSqFt=materials.filter(item=>item.category==='Countertops'&&item.unit==='sq ft').reduce((total,item)=>total+item.quantity,0);
  const hardwareEach=materials.filter(item=>item.category==='Hardware'&&item.unit==='ea').reduce((total,item)=>total+item.quantity,0);
  const toeKickFt=materials.filter(item=>item.category==='Toe Kick'&&item.unit==='lin ft').reduce((total,item)=>total+item.quantity,0);
  const paintSqFt=materials.filter(item=>item.category==='Wall Paint'&&item.unit==='sq ft').reduce((total,item)=>total+item.quantity,0);
  if(countertopSqFt)lines.push(line('countertops','Countertops','Countertop and backsplash allowance',countertopSqFt,'sq ft',rates.countertopPerSqFt,'bill-of-materials'));
  if(hardwareEach)lines.push(line('hardware','Hardware','Cabinet pulls and knobs',hardwareEach,'ea',rates.hardwareEach,'bill-of-materials'));
  if(toeKickFt)lines.push(line('toe-kick','Toe Kick','Cabinet toe kick',toeKickFt,'lin ft',rates.toeKickPerLinearFt,'bill-of-materials'));
  if(includePaint&&paintSqFt)lines.push(line('wall-paint','Wall Paint','Wall preparation and paint',paintSqFt,'sq ft',rates.wallPaintPerSqFt,'bill-of-materials'));

  const applianceCount=project.objects.filter(object=>object.kind==='appliance'&&!isLighting(object)).length;
  const lightingCount=project.objects.filter(isLighting).length;
  if(includeAppliances&&applianceCount)lines.push(line('appliances','Appliances','Appliance purchase allowance',applianceCount,'ea',rates.applianceAllowanceEach));
  if(lightingCount)lines.push(line('lighting','Lighting','Lighting fixture and installation allowance',lightingCount,'ea',rates.lightingEach));

  const directBeforeCalculated=sum(lines);
  if(includeInstallation&&rates.installationPercent>0)lines.push(line('installation','Installation','Installation labor coordination',rates.installationPercent,'percent',directBeforeCalculated/100,'calculated'));
  const beforeContingency=sum(lines);
  if(includeContingency&&rates.contingencyPercent>0)lines.push(line('contingency','Contingency','Project contingency',rates.contingencyPercent,'percent',beforeContingency/100,'calculated'));
  const beforeOverhead=sum(lines);
  if(includeOverhead&&rates.overheadProfitPercent>0)lines.push(line('overhead-profit','Overhead & Profit','Contractor overhead and profit',rates.overheadProfitPercent,'percent',beforeOverhead/100,'calculated'));

  const directCost=sum(lines),salesTax=round(directCost*Math.max(0,options.salesTaxPercent??0)/100),total=round(directCost+salesTax);
  return{
    projectId:project.id,
    projectName:project.name,
    regionLabel:options.regionLabel??'User-configurable rates',
    currency:options.currency??'USD',
    pricingMode:'configurable-editor-rates',
    generatedAt:new Date().toISOString(),
    lines,
    directCost,
    salesTax,
    total,
    low:round(total*.9),
    high:round(total*1.15),
    disclaimer:'Planning estimate only. Confirm field conditions, labor scope, local pricing, taxes, permits, product selections and subcontractor quotes before contract.',
  };
}

const csvCell=(value:string|number)=>`"${String(value).replace(/"/g,'""')}"`;
export function editorEstimateCsv(estimate:EditorEstimate){
  const rows:[string|number,string|number,string|number,string|number,string|number,string|number][]=[
    ['Category','Description','Quantity','Unit','Unit Cost','Subtotal'],
    ...estimate.lines.map(item=>[item.category,item.description,item.quantity,item.unit,item.unitCost,item.subtotal] as [string|number,string|number,string|number,string|number,string|number,string|number]),
    ['Summary','Sales Tax',1,'allowance',estimate.salesTax,estimate.salesTax],
    ['Summary','Total',1,'allowance',estimate.total,estimate.total],
    ['Summary','Low Range',1,'allowance',estimate.low,estimate.low],
    ['Summary','High Range',1,'allowance',estimate.high,estimate.high],
  ];
  return rows.map(row=>row.map(csvCell).join(',')).join('\n');
}
