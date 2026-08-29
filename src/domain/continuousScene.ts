import { countertopMaterial } from './countertops';
import { continuousCountertopRuns, countertopRunObject } from './countertopRuns';
import { EditorObject } from './editor';
import { Box3D, buildSceneBoxes } from './geometry';

const inchesToScene=(value:number)=>value/24;
const radians=(degrees:number)=>degrees*Math.PI/180;
const normalizedRotation=(value:number)=>((value%360)+360)%360;
const supportedStraightRun=(rotation:number)=>{
  const value=normalizedRotation(rotation);
  return Math.abs(value)<.01||Math.abs(value-180)<.01;
};

function cabinetTopIn(object:EditorObject){
  const toe=object.toeKick?.enabled?object.toeKick.heightIn:0;
  return(object.elevationIn??0)+object.heightIn+toe;
}

function runGeometry(run:ReturnType<typeof continuousCountertopRuns>[number],objects:EditorObject[],index:number):Box3D[]{
  const sourceObjects=run.ids.map(id=>objects.find(object=>object.id===id)).filter((value):value is EditorObject=>Boolean(value));
  if(!sourceObjects.length)return[];
  const runObject=countertopRunObject(run),material=countertopMaterial(runObject),spec=run.spec;
  const rotation=radians(run.rotation),depthX=-Math.sin(rotation),depthZ=Math.cos(rotation);
  const baseX=run.x+run.widthIn/2,baseZ=run.y+run.depthIn/2;
  const topIn=Math.max(...sourceObjects.map(cabinetTopIn));
  const slabCenterX=baseX-depthX*spec.overhangFrontIn/2;
  const slabCenterZ=baseZ-depthZ*spec.overhangFrontIn/2;
  const boxes:Box3D[]=[{
    id:`countertop-run-${index}`,
    sourceId:run.ids[0],
    kind:'countertop',
    center:[inchesToScene(slabCenterX),inchesToScene(topIn+spec.thicknessIn/2),inchesToScene(slabCenterZ)],
    size:[inchesToScene(run.widthIn+spec.overhangSideIn*2),inchesToScene(spec.thicknessIn),inchesToScene(run.depthIn+spec.overhangFrontIn)],
    rotationY:-rotation,
    color:material.color,
    roughness:material.roughness,
    metalness:material.metalness,
  }];
  if(spec.backsplashHeightIn>0){
    const backX=baseX+depthX*(run.depthIn/2-.35);
    const backZ=baseZ+depthZ*(run.depthIn/2-.35);
    boxes.push({
      id:`countertop-run-${index}-backsplash`,
      sourceId:run.ids[0],
      kind:'countertop',
      center:[inchesToScene(backX),inchesToScene(topIn+spec.backsplashHeightIn/2),inchesToScene(backZ)],
      size:[inchesToScene(run.widthIn+spec.overhangSideIn*2),inchesToScene(spec.backsplashHeightIn),inchesToScene(.7)],
      rotationY:-rotation,
      color:material.color,
      roughness:material.roughness,
      metalness:material.metalness,
    });
  }
  return boxes;
}

function missingSinkFixture(sourceId:string,boxes:Box3D[]){
  return!boxes.some(box=>box.id===`${sourceId}-sink`);
}

function sinkFixture(object:EditorObject):Box3D{
  const top=cabinetTopIn(object),x=object.x+object.widthIn/2,z=object.y+object.depthIn/2;
  return{
    id:`${object.id}-sink`,sourceId:object.id,kind:'fixture',
    center:[inchesToScene(x),inchesToScene(top-2.2),inchesToScene(z)],
    size:[inchesToScene(Math.min(30,object.widthIn*.55)),inchesToScene(4),inchesToScene(Math.min(20,object.depthIn*.65))],
    rotationY:-radians(object.rotation),color:'#9AA6A8',roughness:.22,metalness:.8,
  };
}

export function buildContinuousSceneBoxes(objects:EditorObject[]):Box3D[]{
  const original=buildSceneBoxes(objects);
  const runs=continuousCountertopRuns(objects).filter(run=>run.ids.length>1&&supportedStraightRun(run.rotation));
  if(!runs.length)return original;
  const replacedIds=new Set(runs.flatMap(run=>run.ids));
  const boxes=original.filter(box=>{
    for(const id of replacedIds){
      if(box.id===`${id}-counter-cap`||box.id===`${id}-backsplash`)return false;
    }
    return true;
  });
  runs.forEach((run,index)=>boxes.push(...runGeometry(run,objects,index)));
  for(const run of runs){
    for(const sourceId of run.sinkSourceIds){
      if(!missingSinkFixture(sourceId,boxes))continue;
      const object=objects.find(item=>item.id===sourceId);
      if(object)boxes.push(sinkFixture(object));
    }
  }
  return boxes;
}
