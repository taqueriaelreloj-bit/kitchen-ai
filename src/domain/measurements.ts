import { EditorObject, EditorProject, updateObject } from './editor';

export type MeasurementUnit='in'|'ft'|'cm'|'mm'|'m';
export type MeasurementField='widthIn'|'heightIn'|'depthIn'|'elevationIn'|'x'|'y';
export type MeasurementParseResult={
  valid:boolean;
  inches:number;
  unit:MeasurementUnit;
  normalized:string;
  error?:string;
};
export type MeasurementLimits={minIn?:number;maxIn?:number;allowNegative?:boolean};

const UNIT_TO_INCHES:Record<MeasurementUnit,number>={in:1,ft:12,cm:1/2.54,mm:1/25.4,m:39.3700787402};
const round=(value:number,places=4)=>{const factor=10**places;return Math.round(value*factor)/factor;};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);

function parseFraction(value:string):number|undefined{
  const cleaned=value.trim();
  if(!cleaned)return 0;
  const mixed=cleaned.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if(mixed){
    const whole=Number(mixed[1]),numerator=Number(mixed[2]),denominator=Number(mixed[3]);
    if(!denominator)return undefined;
    return whole+(whole<0?-1:1)*numerator/denominator;
  }
  const fraction=cleaned.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
  if(fraction){
    const denominator=Number(fraction[2]);
    if(!denominator)return undefined;
    return Number(fraction[1])/denominator;
  }
  const decimal=Number(cleaned);
  return Number.isFinite(decimal)?decimal:undefined;
}

function normalizeInput(input:string){
  return input
    .trim()
    .toLowerCase()
    .replace(/[′’]/g,"'")
    .replace(/[″“”]/g,'"')
    .replace(/feet|foot/g,'ft')
    .replace(/inches|inch/g,'in')
    .replace(/centimeters|centimeter/g,'cm')
    .replace(/millimeters|millimeter/g,'mm')
    .replace(/meters|meter/g,'m')
    .replace(/\s+/g,' ');
}

export function parseMeasurement(input:string,defaultUnit:MeasurementUnit='in'):MeasurementParseResult{
  const value=normalizeInput(input);
  if(!value)return{valid:false,inches:0,unit:defaultUnit,normalized:'',error:'Enter a measurement.'};

  const architectural=value.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:ft|')\s*(?:(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*(?:in|")?)?$/);
  if(architectural){
    const feet=Number(architectural[1]),inchPart=parseFraction(architectural[2]??'0');
    if(inchPart===undefined)return{valid:false,inches:0,unit:'ft',normalized:value,error:'The inch fraction is not valid.'};
    const sign=feet<0?-1:1;
    const inches=feet*12+sign*Math.abs(inchPart);
    return{valid:true,inches:round(inches),unit:'ft',normalized:formatFeetInches(inches)};
  }

  const feetOnly=value.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*ft$/);
  if(feetOnly){
    const amount=parseFraction(feetOnly[1]);
    if(amount===undefined)return{valid:false,inches:0,unit:'ft',normalized:value,error:'The feet value is not valid.'};
    const inches=amount*12;
    return{valid:true,inches:round(inches),unit:'ft',normalized:formatFeetInches(inches)};
  }

  const unitMatch=value.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*(in|"|cm|mm|m)?$/);
  if(!unitMatch)return{valid:false,inches:0,unit:defaultUnit,normalized:value,error:'Use a value such as 42 in, 3 ft 6 in, 3 1/2 in, 90 cm or 1.2 m.'};
  const amount=parseFraction(unitMatch[1]);
  if(amount===undefined)return{valid:false,inches:0,unit:defaultUnit,normalized:value,error:'The number or fraction is not valid.'};
  const rawUnit=unitMatch[2],unit:MeasurementUnit=rawUnit==='"'?'in':rawUnit as MeasurementUnit|undefined??defaultUnit;
  const inches=amount*UNIT_TO_INCHES[unit];
  return{valid:true,inches:round(inches),unit,normalized:formatMeasurement(inches,unit)};
}

export function formatFeetInches(inches:number,fractionDenominator=16){
  const sign=inches<0?'-':'';
  const absolute=Math.abs(inches);
  let feet=Math.floor(absolute/12);
  const remainder=absolute-feet*12;
  let wholeInches=Math.floor(remainder);
  let numerator=Math.round((remainder-wholeInches)*fractionDenominator);
  if(numerator===fractionDenominator){wholeInches++;numerator=0;}
  if(wholeInches===12){feet++;wholeInches=0;}
  let fraction='';
  if(numerator){
    const divisor=gcd(numerator,fractionDenominator);
    fraction=` ${numerator/divisor}/${fractionDenominator/divisor}`;
  }
  return`${sign}${feet}' ${wholeInches}${fraction}"`;
}

export function formatMeasurement(inches:number,unit:MeasurementUnit='in',precision=2){
  if(unit==='ft')return formatFeetInches(inches);
  const amount=inches/UNIT_TO_INCHES[unit];
  const rounded=round(amount,precision);
  return`${rounded} ${unit}`;
}

export function validateMeasurement(inches:number,limits:MeasurementLimits={}):string|undefined{
  if(!Number.isFinite(inches))return'Measurement must be a finite number.';
  if(limits.allowNegative!==true&&inches<0)return'Measurement cannot be negative.';
  if(limits.minIn!==undefined&&inches<limits.minIn)return`Measurement must be at least ${formatFeetInches(limits.minIn)}.`;
  if(limits.maxIn!==undefined&&inches>limits.maxIn)return`Measurement must be no more than ${formatFeetInches(limits.maxIn)}.`;
  return undefined;
}

export function applyMeasurementInput(
  project:EditorProject,
  objectId:string,
  field:MeasurementField,
  input:string,
  limits:MeasurementLimits={},
):{project:EditorProject;result:MeasurementParseResult;error?:string}{
  const result=parseMeasurement(input);
  if(!result.valid)return{project,result,error:result.error};
  const error=validateMeasurement(result.inches,limits);
  if(error)return{project,result:{...result,valid:false,error},error};
  const object=project.objects.find(item=>item.id===objectId);
  if(!object)return{project,result:{...result,valid:false,error:'The selected object no longer exists.'},error:'The selected object no longer exists.'};
  return{project:updateObject(project,objectId,{[field]:result.inches} as Partial<EditorObject>),result};
}

export function snapMeasurement(inches:number,incrementIn=.25){
  const increment=Math.max(.001,Math.abs(incrementIn));
  return round(Math.round(inches/increment)*increment);
}
