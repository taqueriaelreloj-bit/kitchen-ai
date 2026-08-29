import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { buildSceneBoxes } from '../domain/geometry';
import { boxModelMatrix, cameraPosition, hexColor, identity, multiply, nativeGlFrame, perspective } from '../domain/nativeGlScene';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`native-gl-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('native OpenGL scene',()=>{
  test('creates finite camera and projection matrices',()=>{
    const camera={distance:520,yaw:-28,pitch:30,target:{x:220,y:170}};
    const pose=cameraPosition(camera);
    expect(pose.camera.every(Number.isFinite)).toBe(true);
    expect(pose.camera[1]).toBeGreaterThan(0);
    expect(pose.target.every(Number.isFinite)).toBe(true);
    const projection=perspective(Math.PI/4,1.5,.1,100);
    expect([...projection].every(Number.isFinite)).toBe(true);
    expect([...multiply(projection,identity())]).toEqual([...projection]);
  });

  test('converts hex colors safely',()=>{
    expect(hexColor('#A7ADAE')).toEqual([167/255,173/255,174/255,1]);
    expect(hexColor('#fff')).toEqual([1,1,1,1]);
    expect(hexColor('not-a-color')).toEqual([.7,.7,.7,1]);
  });

  test('creates a model matrix from every WebGL scene box',()=>{
    const object=objectDefaults('base-cabinet',{id:'native-box',x:100,y:100,widthIn:30,rotation:90});
    const box=buildSceneBoxes([object]).find(item=>item.id==='native-box')!;
    const matrix=boxModelMatrix(box);
    expect(matrix).toHaveLength(16);
    expect([...matrix].every(Number.isFinite)).toBe(true);
    expect(matrix[12]).toBeCloseTo(box.center[0]);
    expect(matrix[13]).toBeCloseTo(box.center[1]);
    expect(matrix[14]).toBeCloseTo(box.center[2]);
  });

  test('reuses the complete shared project geometry for native draw commands',()=>{
    const project=createEditorProject(room,design);
    const boxes=buildSceneBoxes(project.objects);
    const frame=nativeGlFrame(boxes,project.camera3d,1.4,project.selectedId);
    expect(frame.commands).toHaveLength(boxes.length);
    expect(frame.commands.some(command=>command.id==='floor')).toBe(true);
    expect(frame.commands.some(command=>command.sourceId?.startsWith('wall-'))).toBe(true);
    expect(frame.viewProjection).toHaveLength(16);
  });

  test('highlights all detailed parts that belong to the selected object',()=>{
    const refrigerator=objectDefaults('appliance',{id:'selected-fridge',name:'Refrigerator',widthIn:36,heightIn:70,depthIn:30,material:'Stainless Steel'});
    const boxes=buildSceneBoxes([refrigerator]);
    const frame=nativeGlFrame(boxes,{distance:520,yaw:-28,pitch:30,target:{x:220,y:170}},1.4,refrigerator.id);
    const selected=frame.commands.filter(command=>command.sourceId===refrigerator.id||command.id===refrigerator.id);
    expect(selected.length).toBeGreaterThan(1);
    expect(selected.every(command=>command.selected)).toBe(true);
  });
});
