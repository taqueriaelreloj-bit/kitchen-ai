import { EditorObject } from './editor';

export type CabinetFrontRole='door'|'drawer'|'false-front'|'upper-door'|'lower-door';
export type CabinetFront={
  id:string;
  role:CabinetFrontRole;
  centerXIn:number;
  centerYIn:number;
  widthIn:number;
  heightIn:number;
  hardwareOrientation:'horizontal'|'vertical';
  hardwareCount:number;
};

const gap=.18;
const safe=(value:number)=>Math.max(.5,value);
const frontHeight=(object:EditorObject)=>Math.max(8,object.heightIn-3);
const frontWidth=(object:EditorObject)=>Math.max(6,object.widthIn-.32);

function splitWidth(width:number,count:number){
  const each=safe((width-gap*(count-1))/count);
  return Array.from({length:count},(_,index)=>({width:each,center:-width/2+each/2+index*(each+gap)}));
}
function verticalStack(totalHeight:number,heights:number[]){
  const available=safe(totalHeight-gap*(heights.length-1));
  const sum=heights.reduce((total,value)=>total+value,0)||1;
  const scaled=heights.map(value=>available*value/sum);
  let cursor=totalHeight/2;
  return scaled.map(height=>{
    const center=cursor-height/2;
    cursor-=height+gap;
    return{height,center};
  });
}
function doorRow(id:string,role:CabinetFrontRole,width:number,height:number,centerY:number,count:number):CabinetFront[]{
  return splitWidth(width,count).map((part,index)=>({id:`${id}-${index}`,role,centerXIn:part.center,centerYIn:centerY,widthIn:part.width,heightIn:height,hardwareOrientation:height>width?'vertical':'horizontal',hardwareCount:1}));
}

export function cabinetFrontLayout(object:EditorObject):CabinetFront[]{
  const width=frontWidth(object),height=frontHeight(object),doubleDoor=object.widthIn>=30?2:1;

  if(object.kind==='drawer-base'){
    const rows=verticalStack(height,[.24,.32,.44]);
    return rows.map((row,index)=>({id:`drawer-${index}`,role:'drawer',centerXIn:0,centerYIn:row.center,widthIn:width,heightIn:row.height,hardwareOrientation:'horizontal',hardwareCount:1}));
  }

  if(object.kind==='sink-base'){
    const rows=verticalStack(height,[.2,.8]);
    return[
      {id:'sink-false-front',role:'false-front',centerXIn:0,centerYIn:rows[0].center,widthIn:width,heightIn:rows[0].height,hardwareOrientation:'horizontal',hardwareCount:0},
      ...doorRow('sink-door','door',width,rows[1].height,rows[1].center,doubleDoor),
    ];
  }

  if(object.kind==='base-cabinet'||object.kind==='corner-cabinet'||object.kind==='island'){
    const rows=verticalStack(height,[.22,.78]);
    return[
      {id:'top-drawer',role:'drawer',centerXIn:0,centerYIn:rows[0].center,widthIn:width,heightIn:rows[0].height,hardwareOrientation:'horizontal',hardwareCount:1},
      ...doorRow('base-door','door',width,rows[1].height,rows[1].center,doubleDoor),
    ];
  }

  if(object.kind==='wall-cabinet'||object.kind==='glass-upper'){
    return doorRow('upper-door','upper-door',width,height,0,doubleDoor);
  }

  if(object.kind==='tall-cabinet'||object.kind==='pantry-cabinet'){
    const rows=verticalStack(height,[.34,.66]);
    return[
      ...doorRow('tall-upper','upper-door',width,rows[0].height,rows[0].center,doubleDoor),
      ...doorRow('tall-lower','lower-door',width,rows[1].height,rows[1].center,doubleDoor),
    ];
  }

  if(object.kind==='oven-cabinet'){
    const rows=verticalStack(height,[.25,.52,.23]);
    return[
      ...doorRow('oven-upper','upper-door',width,rows[0].height,rows[0].center,doubleDoor),
      {id:'oven-opening',role:'false-front',centerXIn:0,centerYIn:rows[1].center,widthIn:width,heightIn:rows[1].height,hardwareOrientation:'horizontal',hardwareCount:0},
      {id:'oven-lower',role:'drawer',centerXIn:0,centerYIn:rows[2].center,widthIn:width,heightIn:rows[2].height,hardwareOrientation:'horizontal',hardwareCount:1},
    ];
  }

  if(object.kind==='refrigerator-cabinet'){
    const upperHeight=Math.min(22,Math.max(12,height*.24));
    return doorRow('fridge-upper','upper-door',width,upperHeight,height/2-upperHeight/2,doubleDoor);
  }

  return doorRow('cabinet-door','door',width,height,0,doubleDoor);
}

export function cabinetFrontHardwareCount(object:EditorObject){
  if(!object.hardware||object.hardware.style==='No Hardware')return 0;
  return cabinetFrontLayout(object).reduce((total,front)=>total+front.hardwareCount,0);
}
