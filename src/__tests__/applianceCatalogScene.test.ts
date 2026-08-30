import { createAppliance, updateAppliance } from '../domain/appliances';
import { buildApplianceCatalogSceneBoxes } from '../domain/applianceCatalogScene';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`appliance-scene-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('appliance catalog 3D scene',()=>{
  test('renders refrigerator doors, freezer and handles from one appliance source',()=>{
    const refrigerator=createAppliance('Refrigerator',{id:'fridge'});
    const boxes=buildApplianceCatalogSceneBoxes([refrigerator]);
    expect(boxes.some(box=>box.id==='fridge-catalog-door-left')).toBe(true);
    expect(boxes.some(box=>box.id==='fridge-catalog-door-right')).toBe(true);
    expect(boxes.some(box=>box.id==='fridge-catalog-freezer')).toBe(true);
    expect(boxes.filter(box=>box.sourceId==='fridge'&&box.kind==='hardware').length).toBeGreaterThan(0);
  });

  test('renders range oven, controls and cooktop without duplicate legacy details',()=>{
    const range=createAppliance('Range',{id:'range'});
    const boxes=buildApplianceCatalogSceneBoxes([range]);
    expect(boxes.some(box=>box.id==='range-catalog-oven-door')).toBe(true);
    expect(boxes.some(box=>box.id==='range-catalog-control')).toBe(true);
    expect(boxes.some(box=>box.id==='range-catalog-cooktop')).toBe(true);
    expect(boxes.filter(box=>box.sourceId==='range'&&box.id!=='range'&&!box.id.startsWith('range-catalog-'))).toHaveLength(0);
  });

  test('panel-ready dishwasher uses cabinet-like body material',()=>{
    let project=createEditorProject(room,design),dishwasher=createAppliance('Dishwasher',{id:'dw'});
    project={...project,objects:[dishwasher],selectedId:dishwasher.id};
    project=updateAppliance(project,dishwasher.id,{finishId:'panel-ready',panelReady:true});
    dishwasher=project.objects[0];
    const front=buildApplianceCatalogSceneBoxes([dishwasher]).find(box=>box.id==='dw-catalog-front')!;
    expect(front.color).toBe('#D9D4CA');
    expect(front.metalness).toBeLessThan(.1);
  });

  test('follows appliance rotation and keeps selection source IDs',()=>{
    const wine=createAppliance('Wine Cooler',{id:'wine',rotation:90});
    const boxes=buildApplianceCatalogSceneBoxes([wine]).filter(box=>box.id.startsWith('wine-catalog-'));
    expect(boxes.length).toBeGreaterThan(4);
    expect(boxes.every(box=>box.sourceId==='wine')).toBe(true);
    expect(boxes.every(box=>box.rotationY).toBe(-Math.PI/2));
  });

  test('preserves generic non-catalog appliances and other geometry',()=>{
    const generic=objectDefaults('appliance',{id:'generic',name:'Generic Appliance'}),wall=objectDefaults('wall',{id:'wall'});
    const boxes=buildApplianceCatalogSceneBoxes([generic,wall]);
    expect(boxes.some(box=>box.id==='generic'&&box.kind==='appliance')).toBe(true);
    expect(boxes.some(box=>box.sourceId==='wall'&&box.kind==='wall')).toBe(true);
  });

  test('Cooktop emits five selectable burner details',()=>{
    const cooktop=createAppliance('Cooktop',{id:'cooktop'});
    const burners=buildApplianceCatalogSceneBoxes([cooktop]).filter(box=>box.id.startsWith('cooktop-catalog-burner-'));
    expect(burners).toHaveLength(5);
    expect(burners.every(box=>box.sourceId==='cooktop')).toBe(true);
  });
});
