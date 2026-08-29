import {
  createCatalogOpening, doorSwingArc, isCatalogOpening, openingCatalogSpec, openingGeometry,
  openingsByCategory, OPENING_CATALOG, updateOpeningAppearance,
} from '../domain/openingCatalog';
import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { openingData, setDoorSwing } from '../domain/openings';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`opening-catalog-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];
const project=()=>createEditorProject(room,design,'Opening Kitchen');

describe('professional opening catalog',()=>{
  test('contains common door and window choices with unique IDs',()=>{
    expect(openingsByCategory('Doors').length).toBeGreaterThanOrEqual(5);
    expect(openingsByCategory('Windows').length).toBeGreaterThanOrEqual(4);
    expect(new Set(OPENING_CATALOG.map(model=>model.id)).size).toBe(OPENING_CATALOG.length);
    expect(OPENING_CATALOG.every(model=>model.widthIn>0&&model.heightIn>0)).toBe(true);
  });

  test('creates and attaches a door with model dimensions and swing',()=>{
    let current=project();
    current=createCatalogOpening(current,'door-36-exterior','wall-north',30);
    const door=current.objects.find(object=>object.id===current.selectedId)!;
    expect(door.kind).toBe('door');
    expect(door).toMatchObject({widthIn:36,heightIn:80,elevationIn:0});
    expect(openingCatalogSpec(door)).toMatchObject({modelId:'door-36-exterior',style:'Exterior Panel'});
    expect(openingData(door)).toMatchObject({parentWallId:'wall-north',wallOffsetIn:30,swingDirection:'Left In'});
  });

  test('creates a window with catalog sill height',()=>{
    let current=project();
    current=createCatalogOpening(current,'window-60-double-casement','wall-north',36);
    const window=current.objects.find(object=>object.id===current.selectedId)!;
    expect(window.kind).toBe('window');
    expect(window).toMatchObject({widthIn:60,heightIn:42,elevationIn:38});
    expect(openingData(window).sillHeightIn).toBe(38);
    expect(isCatalogOpening(window)).toBe(true);
  });

  test('door geometry reflects single, double, patio and pocket styles',()=>{
    const models=['door-30-interior','door-60-double','door-60-patio','door-36-pocket'] as const;
    const geometries=models.map(modelId=>{
      const model=OPENING_CATALOG.find(item=>item.id===modelId)!;
      const object=objectDefaults('door',{id:modelId,widthIn:model.widthIn,heightIn:model.heightIn,openingCatalogSpec:{modelId,style:model.style,trimStyle:model.trimStyle,frameColor:'#F0EEE8',panelColor:'#8A664B',glassTint:'#A9D2E2'}} as any);
      return openingGeometry(object)!;
    });
    expect(geometries[0].parts.filter(part=>part.kind==='panel')).toHaveLength(1);
    expect(geometries[1].parts.filter(part=>part.kind==='panel')).toHaveLength(2);
    expect(geometries[2].parts.filter(part=>part.kind==='glass')).toHaveLength(2);
    expect(geometries[3].parts.filter(part=>part.kind==='handle')).toHaveLength(0);
  });

  test('window geometry adds correct mullions and sill',()=>{
    let current=project();
    current=createCatalogOpening(current,'window-48-slider','wall-north');
    const slider=current.objects.find(object=>object.id===current.selectedId)!;
    const sliderGeometry=openingGeometry(slider)!;
    expect(sliderGeometry.parts.some(part=>part.id==='mullion-center')).toBe(true);
    expect(sliderGeometry.parts.some(part=>part.kind==='sill')).toBe(true);
    current=createCatalogOpening(current,'window-60-picture','wall-north');
    const picture=current.objects.find(object=>object.id===current.selectedId)!;
    expect(openingGeometry(picture)?.parts.some(part=>part.kind==='mullion')).toBe(false);
  });

  test('updates frame, panel, tint and trim appearance',()=>{
    let current=project();
    current=createCatalogOpening(current,'door-60-patio','wall-north');
    const id=current.selectedId!;
    current=updateOpeningAppearance(current,id,{trimStyle:'Craftsman',frameColor:'#1F2323',panelColor:'#2B2D2D',glassTint:'#7DB8D0'});
    const changed=current.objects.find(object=>object.id===id)!;
    expect(openingCatalogSpec(changed)).toMatchObject({trimStyle:'Craftsman',frameColor:'#1F2323',panelColor:'#2B2D2D',glassTint:'#7DB8D0'});
    expect(openingGeometry(changed)?.parts.some(part=>part.kind==='trim'&&part.color==='#1F2323')).toBe(true);
  });

  test('calculates left/right and in/out door swing arcs',()=>{
    const door=objectDefaults('door',{id:'door',widthIn:36,openingCatalogSpec:{modelId:'door-36-exterior',style:'Exterior Panel',trimStyle:'Modern Square',frameColor:'#fff',panelColor:'#8A664B',glassTint:'#A9D2E2'}} as any);
    let current={...project(),objects:[door],selectedId:door.id};
    for(const direction of ['Left In','Right In','Left Out','Right Out'] as const){
      current=setDoorSwing(current,door.id,direction);
      const changed=current.objects[0],arc=doorSwingArc(changed)!;
      expect(arc.radiusIn).toBe(36);
      expect(arc.direction).toBe(direction);
      expect(Math.abs(arc.endAngleDeg-arc.startAngleDeg)).toBe(90);
    }
  });

  test('catalog metadata and appearance survive save/load',()=>{
    let current=project();
    current=createCatalogOpening(current,'window-36-casement','wall-north',40);
    const id=current.selectedId!;
    current=updateOpeningAppearance(current,id,{trimStyle:'Craftsman',frameColor:'#202424'});
    const loaded=parseProject(serializeProject(current))!;
    const restored=loaded.objects.find(object=>object.id===id)!;
    expect(openingCatalogSpec(restored)).toMatchObject({modelId:'window-36-casement',trimStyle:'Craftsman',frameColor:'#202424'});
    expect(openingData(restored).parentWallId).toBe('wall-north');
  });
});
