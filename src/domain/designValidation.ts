import { islandData } from './countertops';
import { EditorObject, EditorProject, isBaseLikeKind, isCabinetKind } from './editor';
import { footprintGap, objectFootprint } from './layoutValidation';
import { isLighting } from './lighting';
import { openingData } from './openings';

export type LayoutIssueSeverity='error'|'warning'|'info';
export type LayoutIssue={
  id:string;
  severity:LayoutIssueSeverity;
  title:string;
  detail:string;
  objectIds:string[];
};

const inches=(meters:number)=>meters*39.3701;
const isFloorBlocker=(object:EditorObject)=>!isLighting(object)&&(isBaseLikeKind(object.kind)||(object.kind==='appliance'&&(object.elevationIn??0)<16));
const overlapArea=(a:ReturnType<typeof objectFootprint>,b:ReturnType<typeof objectFootprint>)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const label=(object:EditorObject)=>object.name||object.kind;

export function validateKitchenLayout(project:EditorProject):LayoutIssue[]{
  const issues:LayoutIssue[]=[];
  const objects=project.objects;
  const floorObjects=objects.filter(isFloorBlocker);
  const roomBounds={left:120,top:120,right:120+inches(project.room.widthM),bottom:120+inches(project.room.lengthM)};

  const hasSink=objects.some(object=>object.kind==='sink-base'||(object.kind==='island'&&islandData(object).sink));
  const hasRange=objects.some(object=>object.kind==='appliance'&&!isLighting(object)&&/(range|stove|cooktop|oven)/i.test(object.name))||objects.some(object=>object.kind==='oven-cabinet');
  const hasRefrigerator=objects.some(object=>object.kind==='appliance'&&!isLighting(object)&&/(refrigerator|fridge)/i.test(object.name))||objects.some(object=>object.kind==='refrigerator-cabinet');
  if(!hasSink)issues.push({id:'missing-sink',severity:'error',title:'Sink missing',detail:'Add a sink base or enable a sink in the island before finalizing the kitchen.',objectIds:[]});
  if(!hasRange)issues.push({id:'missing-range',severity:'error',title:'Range or cooktop missing',detail:'Add a range, cooktop or oven cooking zone.',objectIds:[]});
  if(!hasRefrigerator)issues.push({id:'missing-refrigerator',severity:'error',title:'Refrigerator missing',detail:'Add a refrigerator or refrigerator cabinet.',objectIds:[]});

  for(let i=0;i<floorObjects.length;i++)for(let j=i+1;j<floorObjects.length;j++){
    const a=floorObjects[i],b=floorObjects[j];
    if(a.kind==='island'&&b.kind==='appliance'&&b.id.startsWith(`${a.id}-`))continue;
    const area=overlapArea(objectFootprint(a),objectFootprint(b));
    if(area>4)issues.push({id:`overlap-${a.id}-${b.id}`,severity:'error',title:'Objects overlap',detail:`${label(a)} overlaps ${label(b)} by about ${Math.round(area)} sq in. Move one object before building.`,objectIds:[a.id,b.id]});
  }

  const islands=objects.filter(object=>object.kind==='island');
  for(const island of islands){
    const islandFootprint=objectFootprint(island);
    const blockers=floorObjects.filter(object=>object.id!==island.id&&object.kind!=='island');
    const nearest=blockers.map(object=>({object,gap:footprintGap(islandFootprint,objectFootprint(object))})).sort((a,b)=>a.gap-b.gap)[0];
    if(nearest&&nearest.gap<36)issues.push({id:`island-clearance-${island.id}`,severity:'warning',title:'Island aisle is too tight',detail:`Only ${Math.round(nearest.gap)} in between ${label(island)} and ${label(nearest.object)}. Target at least 36 in.`,objectIds:[island.id,nearest.object.id]});
  }

  for(const object of floorObjects){
    const footprint=objectFootprint(object);
    const outside=footprint.left<roomBounds.left-1||footprint.top<roomBounds.top-1||footprint.right>roomBounds.right+1||footprint.bottom>roomBounds.bottom+1;
    if(outside)issues.push({id:`outside-${object.id}`,severity:'warning',title:'Object extends outside room',detail:`${label(object)} extends beyond the confirmed room footprint.`,objectIds:[object.id]});
  }

  for(const opening of objects.filter(object=>object.kind==='door'||object.kind==='window')){
    if(!openingData(opening).parentWallId)issues.push({id:`opening-wall-${opening.id}`,severity:'warning',title:'Opening is not attached to a wall',detail:`Attach ${label(opening)} to a wall so 2D/3D geometry stays coordinated.`,objectIds:[opening.id]});
  }

  if(!issues.length)issues.push({id:'layout-good',severity:'info',title:'Layout check passed',detail:'No basic collisions, missing core fixtures or island aisle problems were found.',objectIds:[]});
  return issues;
}

export function layoutIssueCounts(issues:LayoutIssue[]){return {errors:issues.filter(issue=>issue.severity==='error').length,warnings:issues.filter(issue=>issue.severity==='warning').length,info:issues.filter(issue=>issue.severity==='info').length};}
