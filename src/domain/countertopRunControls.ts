import {
  CountertopSpec,
  countertopData,
  updateCountertop,
} from './countertops';
import { CountertopRun, continuousCountertopRuns } from './countertopRuns';
import { EditorObject, EditorProject, isBaseCabinetKind } from './editor';

export type CountertopRunSummary={
  runId:string;
  sourceIds:string[];
  cabinetCount:number;
  widthIn:number;
  depthIn:number;
  rotation:number;
  materialId:string;
  thicknessIn:number;
  edgeProfile:string;
  overhangFrontIn:number;
  overhangSideIn:number;
  backsplashHeightIn:number;
  sinkCount:number;
  cooktopCount:number;
};

const singleRun=(object:EditorObject):CountertopRun=>({
  id:`single-${object.id}`,
  ids:[object.id],
  x:object.x,
  y:object.y,
  widthIn:object.widthIn,
  depthIn:object.depthIn,
  rotation:object.rotation,
  spec:countertopData(object),
  sinkSourceIds:countertopData(object).sinkCutout?[object.id]:[],
  cooktopSourceIds:countertopData(object).cooktopCutout?[object.id]:[],
});

export function countertopRunForObject(project:EditorProject,objectId:string):CountertopRun|undefined{
  const object=project.objects.find(item=>item.id===objectId);
  if(!object)return undefined;
  const run=continuousCountertopRuns(project.objects).find(item=>item.ids.includes(objectId));
  if(run)return run;
  if(object.kind==='countertop'||object.kind==='island'||isBaseCabinetKind(object.kind))return singleRun(object);
  return undefined;
}

export function countertopRunSummary(project:EditorProject,objectId:string):CountertopRunSummary|undefined{
  const run=countertopRunForObject(project,objectId);
  if(!run)return undefined;
  return{
    runId:run.id,
    sourceIds:[...run.ids],
    cabinetCount:run.ids.length,
    widthIn:run.widthIn,
    depthIn:run.depthIn,
    rotation:run.rotation,
    materialId:run.spec.materialId,
    thicknessIn:run.spec.thicknessIn,
    edgeProfile:run.spec.edgeProfile,
    overhangFrontIn:run.spec.overhangFrontIn,
    overhangSideIn:run.spec.overhangSideIn,
    backsplashHeightIn:run.spec.backsplashHeightIn,
    sinkCount:run.sinkSourceIds.length,
    cooktopCount:run.cooktopSourceIds.length,
  };
}

export function updateCountertopRun(project:EditorProject,objectId:string,patch:Partial<CountertopSpec>):EditorProject{
  const run=countertopRunForObject(project,objectId);
  if(!run)return project;
  let next=project;
  for(const id of run.ids)next=updateCountertop(next,id,patch);
  return next;
}

export function updateCountertopRunMaterial(project:EditorProject,objectId:string,materialId:string){
  return updateCountertopRun(project,objectId,{materialId});
}

export function updateCountertopRunEdge(project:EditorProject,objectId:string,edgeProfile:CountertopSpec['edgeProfile']){
  return updateCountertopRun(project,objectId,{edgeProfile});
}

export function detachCountertopFromRun(project:EditorProject,objectId:string):EditorProject{
  const object=project.objects.find(item=>item.id===objectId);
  if(!object)return project;
  const current=countertopData(object),marker=Math.round((current.thicknessIn+.01)*100)/100;
  return updateCountertop(project,objectId,{thicknessIn:marker});
}

export function normalizeCountertopRun(project:EditorProject,objectId:string):EditorProject{
  const run=countertopRunForObject(project,objectId);
  if(!run)return project;
  const source=project.objects.find(item=>item.id===objectId),spec=source?countertopData(source):run.spec;
  let next=project;
  for(const id of run.ids)next=updateCountertop(next,id,{materialId:spec.materialId,thicknessIn:spec.thicknessIn,overhangFrontIn:spec.overhangFrontIn,overhangSideIn:spec.overhangSideIn,backsplashHeightIn:spec.backsplashHeightIn,edgeProfile:spec.edgeProfile});
  return next;
}

export function countertopRunObjects(project:EditorProject,objectId:string):EditorObject[]{
  const run=countertopRunForObject(project,objectId);
  return run?run.ids.map(id=>project.objects.find(object=>object.id===id)).filter((object):object is EditorObject=>Boolean(object)):[];
}
