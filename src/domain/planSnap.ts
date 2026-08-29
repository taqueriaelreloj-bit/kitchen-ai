import { EditorObject } from './editor';
import { Bounds2D, objectPlanBounds as objectBoundsInches } from './viewFitting';

export type AlignmentGuide = {
  axis: 'x' | 'y';
  value: number;
  kind: 'edge' | 'center';
  targetId: string;
};

export type SnapResult = {
  x: number;
  y: number;
  guides: AlignmentGuide[];
};

type Candidate = {
  delta: number;
  guide: AlignmentGuide;
};

const precise=(value:number)=>Math.round(value*1_000_000_000)/1_000_000_000;
const preciseBounds=(bounds:Bounds2D):Bounds2D=>({
  left:precise(bounds.left),top:precise(bounds.top),right:precise(bounds.right),bottom:precise(bounds.bottom),
  width:precise(bounds.width),height:precise(bounds.height),centerX:precise(bounds.centerX),centerY:precise(bounds.centerY),
});

export function objectPlanBounds(object:EditorObject,x=object.x,y=object.y):Bounds2D{
  return preciseBounds(objectBoundsInches(x===object.x&&y===object.y?object:{...object,x,y}));
}

const rangesNear=(aStart:number,aEnd:number,bStart:number,bEnd:number,maximumGap=36)=>Math.max(aStart,bStart)-Math.min(aEnd,bEnd)<=maximumGap;

const axisCandidates=(moving:Bounds2D,target:Bounds2D,targetId:string,axis:'x'|'y'):Candidate[]=>{
  if(axis==='x'){
    if(!rangesNear(moving.top,moving.bottom,target.top,target.bottom))return[];
    return [
      {delta:target.left-moving.left,guide:{axis,value:target.left,kind:'edge',targetId}},
      {delta:target.right-moving.right,guide:{axis,value:target.right,kind:'edge',targetId}},
      {delta:target.left-moving.right,guide:{axis,value:target.left,kind:'edge',targetId}},
      {delta:target.right-moving.left,guide:{axis,value:target.right,kind:'edge',targetId}},
      {delta:target.centerX-moving.centerX,guide:{axis,value:target.centerX,kind:'center',targetId}},
    ];
  }
  if(!rangesNear(moving.left,moving.right,target.left,target.right))return[];
  return [
    {delta:target.top-moving.top,guide:{axis,value:target.top,kind:'edge',targetId}},
    {delta:target.bottom-moving.bottom,guide:{axis,value:target.bottom,kind:'edge',targetId}},
    {delta:target.top-moving.bottom,guide:{axis,value:target.top,kind:'edge',targetId}},
    {delta:target.bottom-moving.top,guide:{axis,value:target.bottom,kind:'edge',targetId}},
    {delta:target.centerY-moving.centerY,guide:{axis,value:target.centerY,kind:'center',targetId}},
  ];
};

const nearest=(candidates:Candidate[],tolerance:number)=>candidates
  .filter(candidate=>Math.abs(candidate.delta)<=tolerance)
  .sort((a,b)=>{
    const alignmentPriority=(a.guide.kind==='center'?0:1)-(b.guide.kind==='center'?0:1);
    return alignmentPriority||Math.abs(a.delta)-Math.abs(b.delta);
  })[0];

export function snapPlanObject(
  moving:EditorObject,
  proposed:{x:number;y:number},
  objects:EditorObject[],
  options:{grid?:boolean;gridSizeIn?:number;alignment?:boolean;toleranceIn?:number}={},
):SnapResult{
  const gridSize=Math.max(.25,options.gridSizeIn??5);
  const tolerance=Math.max(0,options.toleranceIn??4);
  let x=options.grid===false?proposed.x:Math.round(proposed.x/gridSize)*gridSize;
  let y=options.grid===false?proposed.y:Math.round(proposed.y/gridSize)*gridSize;
  const guides:AlignmentGuide[]=[];
  if(options.alignment===false)return{x,y,guides};

  const movingBounds=objectPlanBounds(moving,x,y);
  const xCandidates:Candidate[]=[],yCandidates:Candidate[]=[];
  for(const target of objects){
    if(target.id===moving.id)continue;
    const targetBounds=objectPlanBounds(target);
    xCandidates.push(...axisCandidates(movingBounds,targetBounds,target.id,'x'));
    yCandidates.push(...axisCandidates(movingBounds,targetBounds,target.id,'y'));
  }
  const xSnap=nearest(xCandidates,tolerance),ySnap=nearest(yCandidates,tolerance);
  if(xSnap){x+=xSnap.delta;guides.push(xSnap.guide);}
  if(ySnap){y+=ySnap.delta;guides.push(ySnap.guide);}
  return{x:precise(x),y:precise(y),guides};
}

export function guideExtent(objects:EditorObject[],axis:'x'|'y'){
  if(!objects.length)return{start:0,end:900};
  const values=objects.flatMap(object=>{
    const bounds=objectPlanBounds(object);
    return axis==='x'?[bounds.top,bounds.bottom]:[bounds.left,bounds.right];
  });
  return{start:Math.min(...values)-36,end:Math.max(...values)+36};
}
