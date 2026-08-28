import { EditorObject } from './editor';

export type AppliancePart={
  id:string;
  offsetXIn:number;
  offsetYIn:number;
  offsetZIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  color:string;
  roughness:number;
  metalness:number;
};

const part=(id:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string,roughness=.24,metalness=.8):AppliancePart=>({id,offsetXIn:x,offsetYIn:y,offsetZIn:z,widthIn:w,heightIn:h,depthIn:d,color,roughness,metalness});

export function applianceDetailGeometry(object:EditorObject):AppliancePart[]{
  if(object.kind!=='appliance')return [];
  const name=object.name.toLowerCase();
  if(name.includes('refrigerator')||name.includes('fridge')){
    const half=Math.max(10,object.widthIn/2-.3),front=-object.depthIn/2-.35,handleX=Math.min(object.widthIn*.18,7);
    return [
      part('fridge-left-door',-object.widthIn/4,4,front,half,Math.max(40,object.heightIn*.82),.35,'#B9BFC0',.22,.88),
      part('fridge-right-door',object.widthIn/4,4,front,half,Math.max(40,object.heightIn*.82),.35,'#B9BFC0',.22,.88),
      part('fridge-freezer',0,-object.heightIn*.37,front,Math.max(20,object.widthIn-1),Math.max(12,object.heightIn*.22),.38,'#AEB5B6',.24,.86),
      part('fridge-handle-left',-handleX,4,front-.75,.55,Math.min(26,object.heightIn*.38),.55,'#777E80',.18,.94),
      part('fridge-handle-right',handleX,4,front-.75,.55,Math.min(26,object.heightIn*.38),.55,'#777E80',.18,.94),
    ];
  }
  if(name.includes('range')||name.includes('stove')||name.includes('oven')){
    const front=-object.depthIn/2-.35,top=object.heightIn/2+.15;
    return [
      part('range-oven-door',0,-object.heightIn*.08,front,Math.max(20,object.widthIn-2),Math.max(16,object.heightIn*.48),.42,'#272B2C',.16,.62),
      part('range-control',0,object.heightIn*.32,front,Math.max(20,object.widthIn-1),5,.5,'#555B5C',.2,.82),
      part('range-handle',0,object.heightIn*.14,front-.85,Math.max(16,object.widthIn*.72),.65,.65,'#8C9394',.18,.93),
      part('range-cooktop',0,top,0,Math.max(20,object.widthIn),.25,Math.max(18,object.depthIn*.82),'#242829',.12,.48),
    ];
  }
  if(name.includes('dishwasher')){
    const front=-object.depthIn/2-.3;
    return [
      part('dishwasher-front',0,0,front,Math.max(18,object.widthIn-1),Math.max(24,object.heightIn-1),.4,'#AEB5B6',.23,.88),
      part('dishwasher-handle',0,object.heightIn*.36,front-.7,Math.max(10,object.widthIn*.65),.55,.55,'#737A7C',.18,.94),
    ];
  }
  return [];
}
