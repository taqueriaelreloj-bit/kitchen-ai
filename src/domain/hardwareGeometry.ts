import { HARDWARE_FINISHES } from './catalogs';
import { CabinetHardware, EditorObject } from './editor';

export type HardwarePart={
  id:string;
  offsetXIn:number;
  offsetYIn:number;
  offsetZIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
};
export type HardwareGeometry={
  color:string;
  metalness:number;
  roughness:number;
  parts:HardwarePart[];
};

const sizeIn=(hardware:CabinetHardware,object:EditorObject)=>{
  if(hardware.size==='Appliance Size')return Math.min(18,Math.max(10,object.widthIn*.55));
  const match=hardware.size.match(/[\d.]+/);
  return Math.max(1,match?Number(match[0]):5);
};
const horizontalPosition=(hardware:CabinetHardware,object:EditorObject)=>{
  if(hardware.position==='Upper Corner')return {x:Math.max(-object.widthIn*.5+2.5,0),y:object.heightIn*.34};
  if(hardware.position==='Lower Corner')return {x:Math.max(-object.widthIn*.5+2.5,0),y:-object.heightIn*.34};
  return {x:0,y:object.heightIn*.18};
};

export function hardwareGeometry(object:EditorObject):HardwareGeometry|undefined{
  const hardware=object.hardware;
  if(!hardware||hardware.style==='No Hardware')return undefined;
  const finish=HARDWARE_FINISHES.find(item=>item.id===hardware.finishId)??HARDWARE_FINISHES[0];
  const length=Math.min(Math.max(2,sizeIn(hardware,object)),Math.max(2,object.widthIn*.72));
  const pos=horizontalPosition(hardware,object);
  const vertical=hardware.position==='Vertical';
  const part=(id:string,x:number,y:number,z:number,w:number,h:number,d:number):HardwarePart=>({id,offsetXIn:x,offsetYIn:y,offsetZIn:z,widthIn:w,heightIn:h,depthIn:d});
  let parts:HardwarePart[]=[];

  switch(hardware.style){
    case 'Round Knob':
    case 'Mushroom Knob':
      parts=[part('knob',pos.x,pos.y,-.75,1.25,1.25,1.1)];
      break;
    case 'Square Knob':
      parts=[part('knob-square',pos.x,pos.y,-.72,1.35,1.35,.9)];
      break;
    case 'Cup Pull':
      parts=[part('cup',pos.x,pos.y,-.7,Math.min(length,4.5),1.3,.9),part('cup-lip',pos.x,pos.y+.55,-.9,Math.min(length+1,5.5),.35,1.1)];
      break;
    case 'Bail Pull':
      parts=[part('bail-left',pos.x-length*.42,pos.y,-.55,.5,1,.7),part('bail-right',pos.x+length*.42,pos.y,-.55,.5,1,.7),part('bail-bar',pos.x,pos.y-.25,-1,length*.85,.38,.45)];
      break;
    case 'Edge Pull':
    case 'Tab Pull':
    case 'Finger Pull':
      parts=[part('edge',pos.x,object.heightIn*.48,-.45,Math.min(length,object.widthIn*.55),.45,1.1)];
      break;
    case 'T-Bar Pull':
      if(vertical)parts=[part('bar',pos.x,pos.y,-.8,.42,length,.42),part('cap',pos.x,pos.y+length*.5,-.8,2,.42,.42)];
      else parts=[part('bar',pos.x,pos.y,-.8,length,.42,.42),part('cap',pos.x+length*.5,pos.y,-.8,.42,2,.42)];
      break;
    case 'Arch Pull':
      parts=[part('arch-left',pos.x-length*.43,pos.y,-.55,.5,.9,.6),part('arch-right',pos.x+length*.43,pos.y,-.55,.5,.9,.6),part('arch-center',pos.x,pos.y+.35,-1,length*.8,.4,.45)];
      break;
    case 'Appliance Pull':
      parts=[part('mount-left',pos.x-length*.45,pos.y,-.75,.65,.65,1.2),part('mount-right',pos.x+length*.45,pos.y,-.75,.65,.65,1.2),part('appliance-bar',pos.x,pos.y,-1.25,length,.65,.65)];
      break;
    case 'Bar Pull':
    default:
      if(vertical)parts=[part('bar',pos.x,pos.y,-.95,.45,length,.45),part('mount-top',pos.x,pos.y+length*.38,-.55,.6,.6,.9),part('mount-bottom',pos.x,pos.y-length*.38,-.55,.6,.6,.9)];
      else parts=[part('bar',pos.x,pos.y,-.95,length,.45,.45),part('mount-left',pos.x-length*.38,pos.y,-.55,.6,.6,.9),part('mount-right',pos.x+length*.38,pos.y,-.55,.6,.6,.9)];
      break;
  }
  return {color:finish.baseColor,metalness:finish.metalness,roughness:finish.roughness,parts};
}
