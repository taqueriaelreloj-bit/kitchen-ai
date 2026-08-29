import { EditorObject } from './editor';
import { openingData, SwingDirection } from './openings';

export type DoorSwingGeometry={
  swing:SwingDirection;
  hinge:'left'|'right';
  direction:'in'|'out';
  angleDeg:number;
  leafCenterAlongIn:number;
  leafCenterNormalIn:number;
  leafRotationDeg:number;
  handleAlongIn:number;
  handleNormalIn:number;
  arcStartDeg:number;
  arcEndDeg:number;
};

const swingAngle=34;
const radians=(degrees:number)=>degrees*Math.PI/180;
const normalized=(degrees:number)=>((degrees%360)+360)%360;

export function doorSwingGeometry(door:EditorObject):DoorSwingGeometry{
  const swing=openingData(door).swingDirection??'Left In';
  const hinge=swing.startsWith('Left')?'left':'right';
  const direction=swing.endsWith('Out')?'out':'in';
  const inwardSign=direction==='in'?1:-1;
  const hingeAlong=hinge==='left'?-door.widthIn/2:door.widthIn/2;
  const closedVectorDeg=hinge==='left'?0:180;
  const openVectorDeg=hinge==='left'?closedVectorDeg+inwardSign*swingAngle:closedVectorDeg-inwardSign*swingAngle;
  const leafCenterAlongIn=hingeAlong+Math.cos(radians(openVectorDeg))*door.widthIn/2;
  const leafCenterNormalIn=Math.sin(radians(openVectorDeg))*door.widthIn/2;
  const handleDistance=door.widthIn*.86;
  const handleAlongIn=hingeAlong+Math.cos(radians(openVectorDeg))*handleDistance;
  const handleNormalIn=Math.sin(radians(openVectorDeg))*handleDistance;
  const closedAngle=hinge==='left'?0:180;
  return{
    swing,
    hinge,
    direction,
    angleDeg:swingAngle,
    leafCenterAlongIn:Math.round(leafCenterAlongIn*1000)/1000,
    leafCenterNormalIn:Math.round(leafCenterNormalIn*1000)/1000,
    leafRotationDeg:normalized(openVectorDeg),
    handleAlongIn:Math.round(handleAlongIn*1000)/1000,
    handleNormalIn:Math.round(handleNormalIn*1000)/1000,
    arcStartDeg:normalized(closedAngle),
    arcEndDeg:normalized(openVectorDeg),
  };
}

export function doorSwingLabel(door:EditorObject){
  const geometry=doorSwingGeometry(door);
  return`${geometry.hinge==='left'?'Left':'Right'} hinge · opens ${geometry.direction}`;
}

export function doorPlanLeafStyle(door:EditorObject,scale=.45){
  const geometry=doorSwingGeometry(door);
  return{
    width:Math.max(10,door.widthIn*scale),
    left:door.widthIn*scale/2+geometry.leafCenterAlongIn*scale-door.widthIn*scale/2,
    top:geometry.leafCenterNormalIn*scale,
    rotation:geometry.leafRotationDeg,
    hingeLeft:geometry.hinge==='left',
    opensOut:geometry.direction==='out',
  };
}
