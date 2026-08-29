import { EditorObject } from './editor';

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

type Bounds = { left:number; right:number; top:number; bottom:number; centerX:number; centerY:number };

type Candidate = {
  delta: number;
  guide: AlignmentGuide;
};

const normalizedRotation=(value:number)=>((value%360)+360)%360;
const isQuarterTurn=(rotation:number)=>{
  const value=normalizedRotation(rotation);
  return Math.abs(value-90)<.01||Math.abs(value-270)<.01;
};

export function objectPlanBounds(object:EditorObject,x=object.x,y=object.y):Bounds{
  const vertical=isQuarterTurn(object.rotation);
  const width=vertical?object.depthIn:object.widthIn;
  const depth=vertical?object.widthIn:object.depthIn;
  const centerX=x+object.widthIn/2;
  const centerY=y+object.depthIn/2;
  return {
    left:centerX-width/2,
    right:centerX+width/2,
    top:centerY-depth/2,
    bottom:centerY+depth/2,
    centerX,
    centerY,
  };
}

const axisCandidates=(moving:Bounds,target:Bounds,targetId:string,axis:'x'|'y'):Candidate[]=>{
  if(axis==='x'){
    return [
      {delta:target.left-moving.left,guide:{axis,value:target.left,kind:'edge',targetId}},
      {delta:target.right-moving.right,guide:{axis,value:target.right,kind:'edge',targetId}},
      {delta:target.left-moving.right,guide:{axis,value:target.left,kind:'edge',targetId}},
      {delta:target.right-moving.left,guide:{axis,value:target.right,kind:'edge',targetId}},
      {delta:target.centerX-moving.centerX,guide:{axis,value:target.centerX,kind:'center',targetId}},
    ];
  }
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
  .sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0];

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
  return{x:Math.round(x*100)/100,y:Math.round(y*100)/100,guides};
}

export function guideExtent(objects:EditorObject[],axis:'x'|'y'){
  if(!objects.length)return{start:0,end:900};
  const values=objects.flatMap(object=>{
    const bounds=objectPlanBounds(object);
    return axis==='x'?[bounds.top,bounds.bottom]:[bounds.left,bounds.right];
  });
  return{start:Math.min(...values)-36,end:Math.max(...values)+36};
}
