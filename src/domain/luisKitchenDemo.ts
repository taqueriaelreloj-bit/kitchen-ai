import { createCatalogGasRange, createCatalogRefrigerator } from './applianceCatalog';
import { CountertopSpec, DEFAULT_COUNTERTOP, DEFAULT_ISLAND, IslandSpec, createIsland } from './countertops';
import { DEFAULT_TOE_KICK, EditorObject, EditorProject, createEditorProject, objectDefaults } from './editor';
import { KitchenDesign, RoomModel } from './types';
import { fit3DCamera } from './viewFitting';

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

export function createLuisTenByElevenKitchen(): EditorProject {
  const room: RoomModel = {
    id: 'luis-room-10x11',
    widthM: 3.048,
    lengthM: 3.3528,
    heightM: 2.4384,
    layout: 'L',
    openings: [],
    confidence: 1,
    source: 'guided-camera',
    photos: [],
  };
  const design: KitchenDesign = {
    id: 'luis-design-10x11',
    name: '10 × 11 Kitchen with Sink Island',
    description: 'Ten-foot top wall, eleven-foot left wall, centered range, refrigerator at the far right, sink island, pantry, wall oven and microwave tower.',
    style: 'modern',
    cabinetColor: 'white',
    countertop: 'quartz',
    accent: '#DDE7E3',
    includesIsland: true,
  };

  const topWall = objectDefaults('wall', {
    id: 'wall-top-10ft',
    name: 'Top Wall – 10 ft',
    x: 120,
    y: 80,
    widthIn: 120,
    heightIn: 96,
    rotation: 0,
  });
  // The left wall starts at the lower-left corner and runs upward. This keeps
  // its interior-facing normal pointed into the room for tall-cabinet placement.
  const leftWall = objectDefaults('wall', {
    id: 'wall-left-11ft',
    name: 'Left Wall – 11 ft',
    x: 120,
    y: 212,
    widthIn: 132,
    heightIn: 96,
    rotation: -90,
  });

  const ovenTower = placeOnWall(objectDefaults('oven-cabinet', {
    id: 'left-oven-tower',
    name: 'Wall Oven + Microwave Tower',
    widthIn: 30,
    depthIn: 24,
    heightIn: 84,
    color: WHITE_CABINET,
    finishId: 'pure-white',
    material: 'Oven tower',
    toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
  }), leftWall, 102);

  const pantry = placeOnWall(objectDefaults('pantry-cabinet', {
    id: 'left-pantry-30',
    name: '30 in Pantry Cabinet',
    widthIn: 30,
    depthIn: 24,
    heightIn: 84,
    color: WHITE_CABINET,
    finishId: 'pure-white',
    toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
  }), leftWall, 72);

  const microwave = placeOnWall(objectDefaults('appliance', {
    id: 'built-in-microwave',
    name: 'Built-In Microwave',
    widthIn: 24,
    depthIn: 2,
    heightIn: 15,
    elevationIn: 56,
    color: STAINLESS,
    material: 'Brushed Stainless Steel',
    applianceType: 'generic',
  }), leftWall, 105, 24.4);

  // The first 30 inches of the top wall remain open for the oven tower return.
  const base12 = placeOnWall(baseCabinet('top-base-12', '12 in Base Cabinet', 12), topWall, 30);
  const upper12 = placeOnWall(wallCabinet('top-upper-12', '12 in Upper Cabinet', 12), topWall, 30);

  const range = placeOnWall(createCatalogGasRange('gas-range-36-4-burner-griddle', {
    id: 'range-centered',
    name: '36 in Gas Range – Centered',
    dimensionsLocked: true,
  }), topWall, 42);

  const hood = placeOnWall(objectDefaults('appliance', {
    id: 'range-hood-36',
    name: '36 in Range Hood',
    widthIn: 36,
    depthIn: 20,
    heightIn: 18,
    elevationIn: 66,
    color: STAINLESS,
    material: 'Brushed Stainless Steel',
    applianceType: 'generic',
  }), topWall, 42);

  const spicePullout = placeOnWall(objectDefaults('drawer-base', {
    id: 'top-spice-6',
    name: '6 in Spice Pull-Out',
    widthIn: 6,
    color: WHITE_CABINET,
    finishId: 'pure-white',
    toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
  }), topWall, 78);
  const upper6 = placeOnWall(wallCabinet('top-upper-6', '6 in Upper Filler Cabinet', 6), topWall, 78);

  const refrigerator = placeOnWall(createCatalogRefrigerator('refrigerator-french-door-stainless', {
    id: 'refrigerator-far-right',
    name: '36 in Refrigerator – Far Right',
    dimensionsLocked: true,
  }), topWall, 84);
  const refrigeratorBridge = placeOnWall(wallCabinet(
    'refrigerator-bridge',
    '36 in Refrigerator Bridge Cabinet',
    36,
    14,
    24,
    70,
  ), topWall, 84);

  const sinkIsland = {
    ...createIsland({
      id: 'sink-island',
      name: '36 in Sink Island – Facing Range',
      x: 162,
      y: 146,
      widthIn: 36,
      depthIn: 30,
      heightIn: 36,
      color: WHITE_CABINET,
      finishId: 'pure-white',
      toeKick: { ...DEFAULT_TOE_KICK, color: WHITE_CABINET },
    }),
    countertopSpec: {
      ...DEFAULT_COUNTERTOP,
      materialId: 'quartz-calacatta',
      overhangFrontIn: 1.5,
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

  const project = createEditorProject(room, design, 'Luis – 10 × 11 Kitchen');
  project.objects = [
    topWall,
    leftWall,
    ovenTower,
    pantry,
    microwave,
    base12,
    upper12,
    range,
    hood,
    spicePullout,
    upper6,
    refrigerator,
    refrigeratorBridge,
    sinkIsland,
  ];
  project.selectedId = sinkIsland.id;
  project.viewMode = '3d';
  project.camera3d = {
    ...project.camera3d,
    yaw: -42,
    pitch: 31,
    target: { x: 180, y: 138 },
  };
  project.camera3d = fit3DCamera(project);
  project.updatedAt = new Date().toISOString();
  return project;
}
