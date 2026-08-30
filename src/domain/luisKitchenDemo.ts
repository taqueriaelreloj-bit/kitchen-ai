import { createCatalogGasRange, createCatalogRefrigerator } from './applianceCatalog';
import { CountertopSpec, DEFAULT_COUNTERTOP, DEFAULT_ISLAND, IslandSpec, createIsland } from './countertops';
import { DEFAULT_TOE_KICK, EditorObject, EditorProject, createEditorProject, objectDefaults } from './editor';
import { professionalCameraForView } from './professional3d';
import { KitchenDesign, RoomModel } from './types';
import { fit2DView } from './viewFitting';

const WHITE_CABINET = '#F4F1E8';
const STAINLESS = '#AEB3B7';

type IslandObject = EditorObject & {
  countertopSpec: CountertopSpec;
  islandSpec: IslandSpec;
};

function placeOnWall<T extends EditorObject>(
  object: T,
  wall: EditorObject,
  offsetIn: number,
  clearanceIn = 0,
): T {
  const angle = wall.rotation * Math.PI / 180;
  const along = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const wallSurface = {
    x: wall.x + normal.x * wall.depthIn / 2,
    y: wall.y + normal.y * wall.depthIn / 2,
  };
  const center = {
    x: wallSurface.x + along.x * (offsetIn + object.widthIn / 2) + normal.x * (object.depthIn / 2 + clearanceIn),
    y: wallSurface.y + along.y * (offsetIn + object.widthIn / 2) + normal.y * (object.depthIn / 2 + clearanceIn),
  };
  return {
    ...object,
    x: Math.round((center.x - object.widthIn / 2) * 100) / 100,
    y: Math.round((center.y - object.depthIn / 2) * 100) / 100,
    rotation: wall.rotation,
  } as T;
}

const baseCabinet = (id: string, name: string, widthIn: number) => objectDefaults('base-cabinet', {
  id,
  name,
  widthIn,
  color: WHITE_CABINET,
  finishId: 'pure-white',
  toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
});

const wallCabinet = (
  id: string,
  name: string,
  widthIn: number,
  heightIn = 30,
  depthIn = 12,
  elevationIn = 54,
) => objectDefaults('wall-cabinet', {
  id,
  name,
  widthIn,
  heightIn,
  depthIn,
  elevationIn,
  color: WHITE_CABINET,
  finishId: 'pure-white',
  toeKick: undefined,
});

/**
 * A deliberately simple 10 × 11 ft sample. Everything on the main run totals
 * exactly 120 inches and the compact island keeps at least a 36 inch aisle.
 * This sample is intended to teach the editor, not to demonstrate every catalog
 * object at once.
 */
export function createLuisTenByElevenKitchen(): EditorProject {
  const room: RoomModel = {
    id: 'clean-room-10x11',
    widthM: 3.048,
    lengthM: 3.3528,
    heightM: 2.4384,
    layout: 'single-wall',
    openings: [],
    confidence: 1,
    source: 'manual',
    photos: [],
  };
  const design: KitchenDesign = {
    id: 'clean-design-10x11',
    name: 'Clean 10 × 11 Starter Kitchen',
    description: 'A balanced 10-foot appliance wall with a compact preparation island and clear circulation.',
    style: 'modern',
    cabinetColor: 'white',
    countertop: 'quartz',
    accent: '#DDE7E3',
    includesIsland: true,
  };

  const northWall = objectDefaults('wall', {
    id: 'wall-north-10ft',
    name: 'North Wall – 10 ft',
    x: 120,
    y: 120,
    widthIn: 120,
    heightIn: 96,
    rotation: 0,
  });
  const westWall = objectDefaults('wall', {
    id: 'wall-west-11ft',
    name: 'West Wall – 11 ft',
    x: 120,
    y: 252,
    widthIn: 132,
    heightIn: 96,
    rotation: -90,
  });
  // Main run: 18 + 32 + 34 + 36 = 120 inches.
  const prepBase = placeOnWall(baseCabinet('clean-prep-base-18', '18 in Prep Base', 18), northWall, 0);
  const prepUpper = placeOnWall(wallCabinet('clean-prep-upper-18', '18 in Wall Cabinet', 18), northWall, 0);

  const range = placeOnWall(createCatalogGasRange('gas-range-32-4-burner', {
    id: 'range-centered',
    name: '32 in Gas Range',
    dimensionsLocked: true,
  }), northWall, 18);
  const hood = placeOnWall(objectDefaults('appliance', {
    id: 'clean-range-hood-32',
    name: '32 in Range Hood',
    widthIn: 32,
    depthIn: 20,
    heightIn: 18,
    elevationIn: 66,
    color: STAINLESS,
    material: 'Brushed Stainless Steel',
    applianceType: 'generic',
  }), northWall, 18);

  const drawerBase = placeOnWall(objectDefaults('drawer-base', {
    id: 'clean-drawer-base-34',
    name: '34 in Drawer Base',
    widthIn: 34,
    color: WHITE_CABINET,
    finishId: 'pure-white',
    toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
  }), northWall, 50);
  const drawerUpper = placeOnWall(wallCabinet('clean-drawer-upper-34', '34 in Wall Cabinet', 34), northWall, 50);

  const refrigerator = placeOnWall(createCatalogRefrigerator('refrigerator-french-door-stainless', {
    id: 'refrigerator-far-right',
    name: '36 in French Door Refrigerator',
    dimensionsLocked: true,
  }), northWall, 84);
  const refrigeratorBridge = placeOnWall(wallCabinet(
    'clean-refrigerator-bridge',
    '36 in Refrigerator Bridge',
    36,
    14,
    24,
    70,
  ), northWall, 84);

  // 36 inches between the cabinet fronts and the island, with more than
  // 45 inches behind the island in an 11-foot-deep room.
  const sinkIsland = {
    ...createIsland({
      id: 'sink-island',
      name: '42 × 24 in Sink Island',
      x: 159,
      y: 188.25,
      widthIn: 42,
      depthIn: 24,
      heightIn: 36,
      color: WHITE_CABINET,
      finishId: 'pure-white',
      toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
    }),
    countertopSpec: {
      ...DEFAULT_COUNTERTOP,
      materialId: 'quartz-calacatta',
      overhangFrontIn: 1,
      overhangSideIn: 1,
      sinkCutout: true,
    },
    islandSpec: {
      ...DEFAULT_ISLAND,
      seatingCount: 0,
      seatingOverhangIn: 0,
      sink: true,
      dishwasher: false,
      cooktop: false,
    },
  } as IslandObject;

  let project = createEditorProject(room, design, 'Cocina de ejemplo limpia — 10 × 11');
  project = {
    ...project,
    objects: [
      northWall,
      westWall,
      prepBase,
      prepUpper,
      range,
      hood,
      drawerBase,
      drawerUpper,
      refrigerator,
      refrigeratorBridge,
      sinkIsland,
    ],
    selectedId: undefined,
    viewMode: '3d',
    updatedAt: new Date().toISOString(),
  };
  project.view2d = fit2DView(project, { width: 1080, height: 700 });
  project.camera3d = professionalCameraForView(project, 'dollhouse', { width: 1080, height: 700 });
  return project;
}
