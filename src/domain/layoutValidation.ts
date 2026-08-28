import { EditorObject, isBaseLikeKind, isCabinetKind } from './editor';
import { isLighting } from './lighting';

export type Footprint={left:number;top:number;right:number;bottom:number};
export type Position={x:number;y:number};

export function objectFootprint(object:EditorObject):Footprint{
  const rotation=((object.rotation%360)+360)%360;
  const quarterTurn=Math.abs(rotation-90)<1||Math.abs(rotation-270)<1;
  const width=quarterTurn?object.depthIn:object.widthIn;
  const depth=quarterTurn?object.widthIn:object.depthIn;
  const centerX=object.x+object.widthIn/2;
  const centerY=object.y+object.depthIn/2;
  return {left:centerX-width/2,top:centerY-depth/2,right:centerX+width/2,bottom:centerY+depth/2};
}

export function footprintGap(a:Footprint,b:Footprint):number{
  const xGap=Math.max(0,Math.max(a.left,b.left)-Math.min(a.right,b.right));
  const yGap=Math.max(0,Math.max(a.top,b.top)-Math.min(a.bottom,b.bottom));
  return Math.hypot(xGap,yGap);
}

export function islandBlockers(objects:EditorObject[]):EditorObject[]{
  return objects.filter(object=>{
    if(isLighting(object))return false;
    if(object.kind==='appliance')return true;
    return isCabinetKind(object.kind)&&object.kind!=='island'&&isBaseLikeKind(object.kind);
  });
}

function candidateFootprint(position:Position,widthIn:number,depthIn:number):Footprint{
  return {left:position.x,top:position.y,right:position.x+widthIn,bottom:position.y+depthIn};
}

export function hasIslandClearance(position:Position,widthIn:number,depthIn:number,blockers:EditorObject[],minimumClearanceIn=36):boolean{
  const candidate=candidateFootprint(position,widthIn,depthIn);
  return blockers.every(object=>footprintGap(candidate,objectFootprint(object))>=minimumClearanceIn);
}

export function findIslandPosition(objects:EditorObject[],roomWidthIn:number,roomLengthIn:number,widthIn:number,depthIn:number,minimumClearanceIn=36):Position|undefined{
  const origin={x:120,y:120};
  const maxX=origin.x+roomWidthIn-widthIn;
  const maxY=origin.y+roomLengthIn-depthIn;
  if(maxX<origin.x||maxY<origin.y)return undefined;
  const blockers=islandBlockers(objects);
  const center={x:origin.x+(roomWidthIn-widthIn)/2,y:origin.y+(roomLengthIn-depthIn)/2};
  const candidates:Position[]=[center];
  for(let radius=12;radius<=96;radius+=12){
    candidates.push(
      {x:center.x+radius,y:center.y},{x:center.x-radius,y:center.y},
      {x:center.x,y:center.y+radius},{x:center.x,y:center.y-radius},
      {x:center.x+radius,y:center.y+radius},{x:center.x-radius,y:center.y+radius},
      {x:center.x+radius,y:center.y-radius},{x:center.x-radius,y:center.y-radius},
    );
  }
  for(const raw of candidates){
    const position={x:Math.max(origin.x,Math.min(maxX,raw.x)),y:Math.max(origin.y,Math.min(maxY,raw.y))};
    if(hasIslandClearance(position,widthIn,depthIn,blockers,minimumClearanceIn))return position;
  }
  return undefined;
}
