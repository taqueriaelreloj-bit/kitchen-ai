import { countertopData, islandData } from './countertops';
import { EditorObject, EditorProject } from './editor';
import { isLighting } from './lighting';

export type WorkZone='sink'|'range'|'refrigerator';
export type WorkPoint={zone:WorkZone;objectId:string;xIn:number;yIn:number;label:string};
export type WorkTriangleLeg={from:WorkZone;to:WorkZone;distanceFt:number};
export type WorkTriangleRule='short-leg'|'long-leg'|'total-short'|'total-long';
export type WorkTriangleWarning={rule:WorkTriangleRule;message:string;valueFt:number;recommendedFt:string;objectIds:string[]};
export type WorkTriangleResult={
  complete:boolean;
  missing:WorkZone[];
  points:Partial<Record<WorkZone,WorkPoint>>;
  legs:WorkTriangleLeg[];
  totalFt:number;
  warnings:WorkTriangleWarning[];
};
export type WorkTriangleOptions={minLegFt?:number;maxLegFt?:number;minTotalFt?:number;maxTotalFt?:number};

const round=(value:number)=>Math.round(value*10)/10;
const center=(object:EditorObject)=>({xIn:object.x+object.widthIn/2,yIn:object.y+object.depthIn/2});
const normalized=(value:string|undefined)=>(value??'').toLowerCase();

function point(zone:WorkZone,object:EditorObject):WorkPoint{
  const position=center(object);
  return{zone,objectId:object.id,label:object.name,xIn:position.xIn,yIn:position.yIn};
}

function sinkCandidate(object:EditorObject){
  if(object.kind==='sink-base')return 1;
  if(object.kind==='island'&&islandData(object).sink)return 2;
  if((object.kind==='countertop'||object.kind==='island')&&countertopData(object).sinkCutout)return 3;
  return 0;
}
function rangeCandidate(object:EditorObject){
  const name=normalized(object.name),material=normalized(object.material);
  if(object.kind==='appliance'&&!isLighting(object)&&(name.includes('range')||name.includes('cooktop')||name.includes('stove')))return 1;
  if(object.kind==='oven-cabinet')return 2;
  if(object.kind==='island'&&islandData(object).cooktop)return 3;
  if((object.kind==='countertop'||object.kind==='island')&&countertopData(object).cooktopCutout)return 4;
  if(object.kind==='appliance'&&!isLighting(object)&&(name.includes('oven')||material.includes('oven')))return 5;
  return 0;
}
function refrigeratorCandidate(object:EditorObject){
  const name=normalized(object.name),material=normalized(object.material);
  if(object.kind==='appliance'&&!isLighting(object)&&(name.includes('refriger')||name.includes('fridge')))return 1;
  if(object.kind==='refrigerator-cabinet')return 2;
  if(object.kind==='appliance'&&!isLighting(object)&&material.includes('refriger'))return 3;
  return 0;
}

function choose(objects:EditorObject[],zone:WorkZone):WorkPoint|undefined{
  const score=zone==='sink'?sinkCandidate:zone==='range'?rangeCandidate:refrigeratorCandidate;
  const candidate=objects.map(object=>({object,score:score(object)})).filter(item=>item.score>0).sort((a,b)=>a.score-b.score||a.object.id.localeCompare(b.object.id))[0];
  return candidate?point(zone,candidate.object):undefined;
}

const distance=(a:WorkPoint,b:WorkPoint)=>round(Math.hypot(a.xIn-b.xIn,a.yIn-b.yIn)/12);

export function analyzeWorkTriangle(project:EditorProject,options:WorkTriangleOptions={}):WorkTriangleResult{
  const minLeg=options.minLegFt??4,maxLeg=options.maxLegFt??9,minTotal=options.minTotalFt??13,maxTotal=options.maxTotalFt??26;
  const sink=choose(project.objects,'sink'),range=choose(project.objects,'range'),refrigerator=choose(project.objects,'refrigerator');
  const points:Partial<Record<WorkZone,WorkPoint>>={sink,range,refrigerator};
  const missing=(['sink','range','refrigerator'] as WorkZone[]).filter(zone=>!points[zone]);
  if(missing.length)return{complete:false,missing,points,legs:[],totalFt:0,warnings:[]};
  const completePoints={sink:sink!,range:range!,refrigerator:refrigerator!};
  const legs:WorkTriangleLeg[]=[
    {from:'sink',to:'range',distanceFt:distance(completePoints.sink,completePoints.range)},
    {from:'range',to:'refrigerator',distanceFt:distance(completePoints.range,completePoints.refrigerator)},
    {from:'refrigerator',to:'sink',distanceFt:distance(completePoints.refrigerator,completePoints.sink)},
  ];
  const warnings:WorkTriangleWarning[]=[];
  for(const leg of legs){
    const ids=[completePoints[leg.from].objectId,completePoints[leg.to].objectId];
    if(leg.distanceFt<minLeg)warnings.push({rule:'short-leg',message:`${leg.from} to ${leg.to} is only ${leg.distanceFt} ft.`,valueFt:leg.distanceFt,recommendedFt:`${minLeg}-${maxLeg} ft`,objectIds:ids});
    if(leg.distanceFt>maxLeg)warnings.push({rule:'long-leg',message:`${leg.from} to ${leg.to} is ${leg.distanceFt} ft.`,valueFt:leg.distanceFt,recommendedFt:`${minLeg}-${maxLeg} ft`,objectIds:ids});
  }
  const totalFt=round(legs.reduce((total,leg)=>total+leg.distanceFt,0));
  const allIds=[completePoints.sink.objectId,completePoints.range.objectId,completePoints.refrigerator.objectId];
  if(totalFt<minTotal)warnings.push({rule:'total-short',message:`The work triangle totals ${totalFt} ft.`,valueFt:totalFt,recommendedFt:`${minTotal}-${maxTotal} ft total`,objectIds:allIds});
  if(totalFt>maxTotal)warnings.push({rule:'total-long',message:`The work triangle totals ${totalFt} ft.`,valueFt:totalFt,recommendedFt:`${minTotal}-${maxTotal} ft total`,objectIds:allIds});
  return{complete:true,missing:[],points:completePoints,legs,totalFt,warnings};
}

export function workTriangleLayoutIssues(project:EditorProject){
  const result=analyzeWorkTriangle(project);
  const missing=result.missing.map(zone=>({
    id:`work-triangle-missing-${zone}`,
    severity:'warning' as const,
    code:`missing-${zone}`,
    title:`Missing ${zone} work zone`,
    message:`Add or identify a ${zone} before relying on the work-triangle check.`,
    objectIds:[] as string[],
  }));
  const warnings=result.warnings.map((warning,index)=>({
    id:`work-triangle-${warning.rule}-${index}`,
    severity:'warning' as const,
    code:warning.rule,
    title:'Work triangle needs review',
    message:`${warning.message} Recommended planning range: ${warning.recommendedFt}.`,
    objectIds:warning.objectIds,
    value:warning.valueFt,
  }));
  const info=result.complete&&!warnings.length?[{
    id:'work-triangle-passed',
    severity:'info' as const,
    code:'work-triangle-passed',
    title:'Work triangle is within the planning range',
    message:`The three work-triangle legs total ${result.totalFt} ft.`,
    objectIds:[result.points.sink!.objectId,result.points.range!.objectId,result.points.refrigerator!.objectId],
    value:result.totalFt,
  }]:[];
  return[...missing,...warnings,...info];
}
