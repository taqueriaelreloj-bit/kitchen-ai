import { EditorObject, EditorProject, objectDefaults, updateObject } from './editor';
import { isLighting } from './lighting';

export type ApplianceType='Refrigerator'|'Range'|'Cooktop'|'Wall Oven'|'Microwave'|'Dishwasher'|'Range Hood'|'Wine Cooler';
export type ApplianceFinishId='stainless-steel'|'black-stainless'|'matte-black'|'white'|'slate'|'panel-ready';
export type ApplianceInstallation='Freestanding'|'Slide-In'|'Built-In'|'Counter-Depth'|'Under-Counter'|'Wall-Mounted';
export type ApplianceSpec={
  type:ApplianceType;
  finishId:ApplianceFinishId;
  installation:ApplianceInstallation;
  configuration:string;
  handleStyle:'Professional'|'Integrated'|'Pocket'|'None';
  vented:boolean;
  panelReady:boolean;
};
export type ApplianceCatalogItem={
  type:ApplianceType;
  label:string;
  description:string;
  widthIn:number;
  depthIn:number;
  heightIn:number;
  elevationIn?:number;
  installation:ApplianceInstallation;
  configuration:string;
};
export type ApplianceFinish={id:ApplianceFinishId;name:string;color:string;roughness:number;metalness:number};
export type ApplianceFrontMaterial='body'|'glass'|'metal'|'dark'|'light';
export type ApplianceFrontPart={id:string;offsetXIn:number;offsetYIn:number;offsetZIn:number;widthIn:number;heightIn:number;depthIn:number;material:ApplianceFrontMaterial;roughness:number;metalness:number};

type ApplianceObject=EditorObject&{applianceSpec?:ApplianceSpec};

export const APPLIANCE_FINISHES:ApplianceFinish[]=[
  {id:'stainless-steel',name:'Stainless Steel',color:'#A7ADAE',roughness:.24,metalness:.88},
  {id:'black-stainless',name:'Black Stainless Steel',color:'#454A4B',roughness:.3,metalness:.82},
  {id:'matte-black',name:'Matte Black',color:'#202323',roughness:.78,metalness:.18},
  {id:'white',name:'White',color:'#F0F0EC',roughness:.58,metalness:.04},
  {id:'slate',name:'Slate',color:'#6C7170',roughness:.46,metalness:.52},
  {id:'panel-ready',name:'Panel Ready',color:'#D9D4CA',roughness:.5,metalness:.02},
];

export const APPLIANCE_CATALOG:ApplianceCatalogItem[]=[
  {type:'Refrigerator',label:'Refrigerator',description:'36-inch counter-depth French-door refrigerator',widthIn:36,depthIn:30,heightIn:70,installation:'Counter-Depth',configuration:'French Door'},
  {type:'Range',label:'Range',description:'30-inch slide-in range with oven',widthIn:30,depthIn:28,heightIn:36,installation:'Slide-In',configuration:'Single Oven'},
  {type:'Cooktop',label:'Cooktop',description:'30-inch built-in cooktop',widthIn:30,depthIn:21,heightIn:3,installation:'Built-In',configuration:'5 Burner'},
  {type:'Wall Oven',label:'Wall Oven',description:'30-inch built-in wall oven',widthIn:30,depthIn:24,heightIn:29,installation:'Built-In',configuration:'Single Oven'},
  {type:'Microwave',label:'Microwave',description:'30-inch built-in microwave',widthIn:30,depthIn:20,heightIn:18,installation:'Built-In',configuration:'Built-In'},
  {type:'Dishwasher',label:'Dishwasher',description:'24-inch under-counter dishwasher',widthIn:24,depthIn:24,heightIn:34,installation:'Under-Counter',configuration:'Top Control'},
  {type:'Range Hood',label:'Range Hood',description:'30-inch wall-mounted hood',widthIn:30,depthIn:20,heightIn:24,installation:'Wall-Mounted',configuration:'Chimney Hood'},
  {type:'Wine Cooler',label:'Wine Cooler',description:'24-inch under-counter wine cooler',widthIn:24,depthIn:24,heightIn:34,installation:'Under-Counter',configuration:'Glass Door'},
];

const byType=(type:ApplianceType)=>APPLIANCE_CATALOG.find(item=>item.type===type)??APPLIANCE_CATALOG[0];
const finishById=(id:ApplianceFinishId)=>APPLIANCE_FINISHES.find(item=>item.id===id)??APPLIANCE_FINISHES[0];
const defaultInstallation=(type:ApplianceType)=>byType(type).installation;
const defaultConfiguration=(type:ApplianceType)=>byType(type).configuration;

export function isKitchenAppliance(object:EditorObject){return object.kind==='appliance'&&!isLighting(object);}

function inferredType(object:EditorObject):ApplianceType{
  const text=`${object.name} ${object.material??''}`.toLowerCase();
  if(text.includes('refriger')||text.includes('fridge'))return'Refrigerator';
  if(text.includes('dishwasher'))return'Dishwasher';
  if(text.includes('hood'))return'Range Hood';
  if(text.includes('wine'))return'Wine Cooler';
  if(text.includes('microwave'))return'Microwave';
  if(text.includes('cooktop'))return'Cooktop';
  if(text.includes('wall oven'))return'Wall Oven';
  if(text.includes('range')||text.includes('stove')||text.includes('oven'))return'Range';
  return'Refrigerator';
}

function inferredFinish(object:EditorObject):ApplianceFinishId{
  const text=`${object.material??''} ${object.color??''}`.toLowerCase();
  if(text.includes('panel'))return'panel-ready';
  if(text.includes('black stainless'))return'black-stainless';
  if(text.includes('black'))return'matte-black';
  if(text.includes('white'))return'white';
  if(text.includes('slate'))return'slate';
  return'stainless-steel';
}

export function applianceData(object:EditorObject):ApplianceSpec{
  const current=(object as ApplianceObject).applianceSpec,type=current?.type??inferredType(object),finishId=current?.finishId??inferredFinish(object);
  return{
    type,
    finishId,
    installation:current?.installation??defaultInstallation(type),
    configuration:current?.configuration??defaultConfiguration(type),
    handleStyle:current?.handleStyle??(type==='Cooktop'||type==='Range Hood'?'None':'Professional'),
    vented:current?.vented??type==='Range Hood',
    panelReady:current?.panelReady??finishId==='panel-ready',
  };
}

export function createAppliance(type:ApplianceType,partial:Partial<EditorObject>={}):EditorObject{
  const item=byType(type),finish=finishById('stainless-steel');
  const applianceSpec:ApplianceSpec={type,finishId:finish.id,installation:item.installation,configuration:item.configuration,handleStyle:type==='Cooktop'||type==='Range Hood'?'None':'Professional',vented:type==='Range Hood',panelReady:false};
  return objectDefaults('appliance',{
    name:item.label,
    widthIn:item.widthIn,
    depthIn:item.depthIn,
    heightIn:item.heightIn,
    elevationIn:item.elevationIn,
    color:finish.color,
    material:finish.name,
    ...partial,
    applianceSpec,
  } as Partial<EditorObject>);
}

export function updateAppliance(project:EditorProject,id:string,patch:Partial<ApplianceSpec>):EditorProject{
  const object=project.objects.find(item=>item.id===id);
  if(!object||!isKitchenAppliance(object))return project;
  const current=applianceData(object),type=patch.type??current.type,next={...current,...patch,type};
  const item=byType(type),finish=finishById(next.finishId);
  const dimensions:Partial<EditorObject>=patch.type?{name:item.label,widthIn:item.widthIn,depthIn:item.depthIn,heightIn:item.heightIn,elevationIn:item.elevationIn}:{};
  return updateObject(project,id,{...dimensions,color:finish.color,material:finish.name,applianceSpec:{...next,panelReady:next.finishId==='panel-ready'||next.panelReady}} as Partial<EditorObject>);
}

export function changeApplianceFinish(project:EditorProject,id:string,finishId:ApplianceFinishId){
  return updateAppliance(project,id,{finishId,panelReady:finishId==='panel-ready'});
}

const part=(id:string,offsetXIn:number,offsetYIn:number,offsetZIn:number,widthIn:number,heightIn:number,depthIn:number,material:ApplianceFrontMaterial,roughness=.3,metalness=.75):ApplianceFrontPart=>({id,offsetXIn,offsetYIn,offsetZIn,widthIn:Math.max(.05,widthIn),heightIn:Math.max(.05,heightIn),depthIn:Math.max(.02,depthIn),material,roughness,metalness});

export function applianceFrontParts(object:EditorObject):ApplianceFrontPart[]{
  if(!isKitchenAppliance(object))return[];
  const spec=applianceData(object),width=object.widthIn,height=object.heightIn,parts:ApplianceFrontPart[]=[];
  if(spec.type==='Refrigerator'){
    const freezerHeight=Math.min(22,height*.3),doorHeight=Math.max(20,height-freezerHeight-1),half=(width-.35)/2;
    parts.push(part('door-left',-width/4,-freezerHeight/2,0,half,doorHeight,.7,'body'),part('door-right',width/4,-freezerHeight/2,0,half,doorHeight,.7,'body'),part('freezer',0,height/2-freezerHeight/2,0,width-.3,freezerHeight,.75,'body'));
    if(spec.handleStyle!=='None')parts.push(part('handle-left',-1.4,-freezerHeight/2,-.65,.65,Math.min(28,doorHeight*.65),.7,'metal',.22,.92),part('handle-right',1.4,-freezerHeight/2,-.65,.65,Math.min(28,doorHeight*.65),.7,'metal',.22,.92),part('freezer-handle',0,height/2-freezerHeight+.8,-.65,Math.min(24,width*.7),.65,.7,'metal',.22,.92));
  }else if(spec.type==='Range'){
    parts.push(part('oven-door',0,3,0,width-1,Math.max(17,height-13),.7,'glass',.12,.22),part('control',0,-height/2+4,0,width-.6,7,.8,'dark',.22,.75),part('cooktop',0,-height/2-.2,-object.depthIn/2+.6,width-.4,.4,object.depthIn-1.2,'dark',.12,.55));
    if(spec.handleStyle!=='None')parts.push(part('oven-handle',0,-5,-.7,Math.min(24,width*.78),.7,.8,'metal',.2,.92));
  }else if(spec.type==='Cooktop'){
    parts.push(part('surface',0,0,-object.depthIn/2+.3,width,.45,object.depthIn-.6,'dark',.1,.62));
    for(let index=0;index<5;index++)parts.push(part(`burner-${index}`,(-1+(index%3))*width*.25,index<3?-object.depthIn*.18:object.depthIn*.18,-object.depthIn/2-.05,Math.min(7,width*.2),.18,Math.min(7,width*.2),'metal',.18,.75));
  }else if(spec.type==='Wall Oven'){
    parts.push(part('oven-glass',0,2,0,width-1,Math.max(15,height-10),.65,'glass',.12,.25),part('control',0,-height/2+3.2,0,width-.8,5.5,.7,'dark',.2,.7));
    if(spec.handleStyle!=='None')parts.push(part('handle',0,-height*.1,-.65,Math.min(24,width*.78),.65,.7,'metal',.2,.92));
  }else if(spec.type==='Microwave'){
    parts.push(part('door-glass',-width*.08,1,0,width*.7,height-3,.5,'glass',.1,.18),part('controls',width*.39,1,0,width*.18,height-3,.55,'dark',.2,.65));
  }else if(spec.type==='Dishwasher'){
    parts.push(part('front',0,0,0,width-.4,height-.4,.65,spec.panelReady?'body':'metal',spec.panelReady?.5:.24,spec.panelReady?.02:.88));
    if(spec.handleStyle!=='None')parts.push(part('handle',0,-height/2+3,-.65,Math.min(18,width*.72),.65,.7,'metal',.2,.92));
  }else if(spec.type==='Range Hood'){
    parts.push(part('canopy',0,height/2-4,0,width,8,object.depthIn,'metal',.26,.82),part('chimney',0,-4,object.depthIn*.2,Math.min(12,width*.42),Math.max(8,height-8),Math.max(6,object.depthIn*.45),'metal',.3,.78));
  }else if(spec.type==='Wine Cooler'){
    parts.push(part('glass-door',0,0,0,width-.4,height-.4,.65,'glass',.1,.25));
    for(let index=1;index<6;index++)parts.push(part(`shelf-${index}`,0,-height/2+index*height/6,-.4,width-.8,.18,.5,'metal',.22,.75));
    if(spec.handleStyle!=='None')parts.push(part('handle',width/2-2,0,-.65,.65,Math.min(20,height*.65),.7,'metal',.2,.92));
  }
  return parts;
}

export function applianceFinish(specOrObject:ApplianceSpec|EditorObject){
  const spec='kind'in specOrObject?applianceData(specOrObject):specOrObject;
  return finishById(spec.finishId);
}
