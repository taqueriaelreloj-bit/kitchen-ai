import { countertopData, CountertopSpec } from './countertops';
import { EditorObject, isBaseCabinetKind } from './editor';

export type CountertopRun = {
  ids:string[];
  x:number;
  y:number;
  widthIn:number;
  depthIn:number;
  rotation:number;
  spec:CountertopSpec;
  sinkSourceIds:string[];
  cooktopSourceIds:string[];
};

type Candidate={object:EditorObject;spec:CountertopSpec;axisStart:number;axisEnd:number;line:number;rotation:number};

const normalizedRotation=(value:number)=>((value%360)+360)%360;
const horizontal=(rotation:number)=>{
  const value=normalizedRotation(rotation);
  return Math.abs(value)<.01||Math.abs(value-180)<.01;
};
const specKey=(spec:CountertopSpec)=>[
  spec.materialId,
  spec.thicknessIn,
  spec.overhangFrontIn,
  spec.overhangSideIn,
  spec.backsplashHeightIn,
  spec.edgeProfile,
].join('|');

const candidateFor=(object:EditorObject):Candidate=>{
  const rotation=normalizedRotation(object.rotation),isHorizontal=horizontal(rotation),spec=countertopData(object);
  const axisStart=isHorizontal?object.x:object.y;
  return {
    object,
    spec,
    axisStart,
    axisEnd:axisStart+object.widthIn,
    line:isHorizontal?object.y:object.x,
    rotation,
  };
};

export function continuousCountertopRuns(objects:EditorObject[],toleranceIn=2):CountertopRun[]{
  const candidates=objects
    .filter(object=>isBaseCabinetKind(object.kind)&&object.kind!=='corner-cabinet')
    .map(candidateFor);
  const used=new Set<string>(),runs:CountertopRun[]=[];

  for(const seed of candidates){
    if(used.has(seed.object.id))continue;
    const seedKey=specKey(seed.spec),seedHorizontal=horizontal(seed.rotation);
    const compatible=candidates
      .filter(candidate=>!used.has(candidate.object.id))
      .filter(candidate=>horizontal(candidate.rotation)===seedHorizontal)
      .filter(candidate=>Math.abs(candidate.rotation-seed.rotation)<.01)
      .filter(candidate=>Math.abs(candidate.line-seed.line)<=toleranceIn)
      .filter(candidate=>specKey(candidate.spec)===seedKey)
      .sort((a,b)=>a.axisStart-b.axisStart);

    let current:Candidate[]=[];
    const flush=()=>{
      if(!current.length)return;
      current.forEach(candidate=>used.add(candidate.object.id));
      const first=current[0],last=current[current.length-1];
      const start=first.axisStart,end=Math.max(...current.map(candidate=>candidate.axisEnd)),span=Math.max(first.object.widthIn,end-start);
      const depths=current.map(candidate=>candidate.object.depthIn);
      const run:CountertopRun={
        ids:current.map(candidate=>candidate.object.id),
        x:seedHorizontal?start:first.object.x,
        y:seedHorizontal?first.object.y:start,
        widthIn:span,
        depthIn:Math.max(...depths),
        rotation:first.rotation,
        spec:{...first.spec},
        sinkSourceIds:current.filter(candidate=>candidate.spec.sinkCutout||candidate.object.kind==='sink-base').map(candidate=>candidate.object.id),
        cooktopSourceIds:current.filter(candidate=>candidate.spec.cooktopCutout).map(candidate=>candidate.object.id),
      };
      runs.push(run);
      current=[];
    };

    for(const candidate of compatible){
      if(!current.length){current.push(candidate);continue;}
      const currentEnd=Math.max(...current.map(item=>item.axisEnd));
      if(candidate.axisStart-currentEnd<=toleranceIn)current.push(candidate);
      else{flush();current.push(candidate);}
    }
    flush();
  }
  return runs;
}

export function countertopRunObject(run:CountertopRun):EditorObject{
  const firstId=run.ids[0]??'run';
  return {
    id:`countertop-run-${firstId}`,
    kind:'countertop',
    name:'Continuous Countertop',
    x:run.x,
    y:run.y,
    widthIn:run.widthIn,
    depthIn:run.depthIn,
    heightIn:run.spec.thicknessIn,
    rotation:run.rotation,
    material:run.spec.materialId,
    countertopSpec:{...run.spec},
  } as EditorObject;
}
