import { applianceColor, applianceModel, applianceSpec, isCatalogAppliance } from './applianceCatalog';
import { EditorObject } from './editor';

export type RefrigeratorPartKind='door'|'freezer-drawer'|'handle'|'grille'|'dispenser'|'toe-kick';
export type RefrigeratorGeometryPart={
  id:string;
  kind:RefrigeratorPartKind;
  offsetXIn:number;
  offsetYIn:number;
  offsetZIn:number;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  color:string;
  metalness:number;
  roughness:number;
};
export type RefrigeratorGeometry={
  modelId:string;
  configuration:string;
  widthIn:number;
  heightIn:number;
  depthIn:number;
  parts:RefrigeratorGeometryPart[];
};

const part=(value:RefrigeratorGeometryPart)=>value;

export function refrigeratorGeometry(object:EditorObject):RefrigeratorGeometry|undefined{
  if(!isCatalogAppliance(object))return undefined;
  const spec=applianceSpec(object)!;
  const model=applianceModel(spec.modelId);
  if(!model||model.category!=='Refrigerators')return undefined;

  const finish=applianceColor(spec.colorId);
  const configuration=spec.doorConfiguration??model.doorConfiguration??'French Door + Bottom Freezer';
  const frontZ=-(object.depthIn/2+.28);
  const width=object.widthIn;
  const height=object.heightIn;
  const bodyBottom=-height/2;
  const bodyTop=height/2;
  const gap=.35;
  const handleColor='#5C6465';
  const parts:RefrigeratorGeometryPart[]=[];

  if(configuration.toLowerCase().includes('side by side')){
    const doorWidth=(width-gap*3)/2;
    const doorHeight=height-4.5;
    const doorY=bodyBottom+2+doorHeight/2;
    [-1,1].forEach((side,index)=>{
      const x=side*(doorWidth/2+gap/2);
      parts.push(part({id:`door-${index}`,kind:'door',offsetXIn:x,offsetYIn:doorY,offsetZIn:frontZ,widthIn:doorWidth,heightIn:doorHeight,depthIn:.78,color:finish.color,metalness:finish.metalness,roughness:finish.roughness}));
      parts.push(part({id:`handle-${index}`,kind:'handle',offsetXIn:side*(gap/2+1.2),offsetYIn:doorY,offsetZIn:frontZ-.82,widthIn:.75,heightIn:Math.min(34,doorHeight*.52),depthIn:.72,color:handleColor,metalness:.94,roughness:.25}));
    });
    parts.push(part({id:'dispenser',kind:'dispenser',offsetXIn:-width*.25,offsetYIn:doorY+doorHeight*.05,offsetZIn:frontZ-.55,widthIn:6.5,heightIn:9.5,depthIn:.42,color:'#222727',metalness:.22,roughness:.12}));
  }else{
    const builtIn=configuration.toLowerCase().includes('built-in')||model.installation==='Built-In';
    const grilleHeight=builtIn?6:0;
    const freezerHeight=builtIn?16:17.5;
    const doorBottom=bodyBottom+2+freezerHeight+gap;
    const doorTop=bodyTop-1.5-grilleHeight;
    const doorHeight=Math.max(20,doorTop-doorBottom);
    const doorWidth=(width-gap*3)/2;
    const doorY=doorBottom+doorHeight/2;

    [-1,1].forEach((side,index)=>{
      const x=side*(doorWidth/2+gap/2);
      parts.push(part({id:`door-${index}`,kind:'door',offsetXIn:x,offsetYIn:doorY,offsetZIn:frontZ,widthIn:doorWidth,heightIn:doorHeight,depthIn:.78,color:finish.color,metalness:finish.metalness,roughness:finish.roughness}));
      parts.push(part({id:`handle-${index}`,kind:'handle',offsetXIn:side*(gap/2+1.15),offsetYIn:doorY,offsetZIn:frontZ-.84,widthIn:.72,heightIn:Math.min(30,doorHeight*.58),depthIn:.72,color:handleColor,metalness:.94,roughness:.25}));
    });

    const freezerY=bodyBottom+2+freezerHeight/2;
    parts.push(part({id:'freezer-drawer',kind:'freezer-drawer',offsetXIn:0,offsetYIn:freezerY,offsetZIn:frontZ,widthIn:width-1.2,heightIn:freezerHeight,depthIn:.82,color:finish.color,metalness:finish.metalness,roughness:finish.roughness}));
    parts.push(part({id:'freezer-handle',kind:'handle',offsetXIn:0,offsetYIn:freezerY+freezerHeight*.27,offsetZIn:frontZ-.85,widthIn:Math.max(12,width-8),heightIn:.72,depthIn:.72,color:handleColor,metalness:.94,roughness:.25}));

    if(builtIn){
      const grilleY=bodyTop-grilleHeight/2-.35;
      parts.push(part({id:'top-grille',kind:'grille',offsetXIn:0,offsetYIn:grilleY,offsetZIn:frontZ-.1,widthIn:width-1,heightIn:grilleHeight,depthIn:.72,color:'#4B5152',metalness:.78,roughness:.42}));
      for(let index=0;index<7;index++){
        parts.push(part({id:`grille-slot-${index}`,kind:'grille',offsetXIn:-width*.36+index*(width*.12),offsetYIn:grilleY,offsetZIn:frontZ-.5,widthIn:.5,heightIn:Math.max(2,grilleHeight-1.6),depthIn:.16,color:'#1D2222',metalness:.18,roughness:.65}));
      }
    }
  }

  parts.push(part({id:'toe-kick',kind:'toe-kick',offsetXIn:0,offsetYIn:bodyBottom+1,offsetZIn:frontZ+.2,widthIn:Math.max(1,width-1),heightIn:2,depthIn:.42,color:'#252929',metalness:.48,roughness:.58}));
  return{modelId:model.id,configuration,widthIn:width,heightIn:height,depthIn:object.depthIn,parts};
}
