import { generateDesigns } from '../domain/design';
import {
  DRAG_CATALOG_CATEGORIES,
  addDragCatalogItemAtPlanPoint,
  createDragCatalogObject,
  parseDragCatalogItem,
  serializeDragCatalogItem,
  workspaceClientPointToPlan,
} from '../domain/dragCatalog';
import { createEditorProject } from '../domain/editor';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`catalog-drag-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('hover catalog drag and drop',()=>{
  test('exposes the requested cabinet and appliance categories',()=>{
    expect(DRAG_CATALOG_CATEGORIES.map(category=>category.id)).toEqual(['lowers','uppers','tall','refrigerators','gas-ranges','microwaves']);
    expect(DRAG_CATALOG_CATEGORIES.find(category=>category.id==='lowers')?.items.length).toBeGreaterThan(8);
    expect(DRAG_CATALOG_CATEGORIES.find(category=>category.id==='uppers')?.items.length).toBeGreaterThan(6);
    expect(DRAG_CATALOG_CATEGORIES.find(category=>category.id==='refrigerators')?.items).toHaveLength(4);
    expect(DRAG_CATALOG_CATEGORIES.find(category=>category.id==='microwaves')?.items).toHaveLength(2);
  });

  test('creates real catalog objects with their correct dimensions and identity',()=>{
    const upper=createDragCatalogObject('upper-glass-30x30');
    expect(upper).toMatchObject({kind:'glass-upper',widthIn:30,heightIn:30,depthIn:12,elevationIn:54,productId:'upper-glass-30x30'});
    const refrigerator=createDragCatalogObject('refrigerator-smart-black');
    expect(refrigerator).toMatchObject({kind:'appliance',applianceType:'refrigerator',productId:'refrigerator-smart-black',widthIn:36,heightIn:70,depthIn:30});
    const microwave=createDragCatalogObject('microwave-over-range-30-stainless');
    expect(microwave).toMatchObject({kind:'appliance',productId:'microwave-over-range-30-stainless',widthIn:30,heightIn:16.5,depthIn:16,elevationIn:54,dimensionsLocked:true});
  });

  test('serializes only valid Kitchen AI catalog drag payloads',()=>{
    const serialized=serializeDragCatalogItem('lower-drawer-30');
    expect(parseDragCatalogItem(serialized)?.id).toBe('lower-drawer-30');
    expect(parseDragCatalogItem('{"source":"other","version":1,"itemId":"lower-drawer-30"}')).toBeUndefined();
    expect(parseDragCatalogItem('not-json')).toBeUndefined();
  });

  test('converts screen coordinates through display scale, pan and zoom',()=>{
    const project={...createEditorProject(room,design),view2d:{zoom:2,pan:{x:40,y:-20},grid:true,snap:true,measurements:true}};
    expect(workspaceClientPointToPlan(project,{x:340,y:280},{x:100,y:50})).toEqual({x:50,y:62.5});
  });

  test('drops, selects and snaps an item in one project change',()=>{
    const project=createEditorProject(room,design);
    const before=project.objects.length;
    const placed=addDragCatalogItemAtPlanPoint(project,'lower-base-24',{x:201,y:155});
    const object=placed.objects[placed.objects.length-1];
    expect(placed.objects).toHaveLength(before+1);
    expect(placed.selectedId).toBe(object.id);
    expect(object).toMatchObject({kind:'base-cabinet',widthIn:24,heightIn:34.5,depthIn:24});
    expect(object.x%5).toBe(0);
    expect(object.y%5).toBe(0);
  });
});
