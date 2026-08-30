import { generateDesigns } from './design';
import { createEditorProject, EditorProject, objectDefaults } from './editor';
import { RoomModel } from './types';
import { fit2DView, fit3DCamera } from './viewFitting';

export type ManualRoomInput = {
  widthFt: number;
  lengthFt: number;
  heightFt: number;
  layout: RoomModel['layout'];
};

const feetToMeters = (value: number) => value * 0.3048;
const feetToInches = (value: number) => value * 12;
const round = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function normalizeManualRoomInput(input: ManualRoomInput): ManualRoomInput {
  const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
  return {
    widthFt: Math.min(60, Math.max(5, finite(input.widthFt, 10))),
    lengthFt: Math.min(60, Math.max(5, finite(input.lengthFt, 11))),
    heightFt: Math.min(20, Math.max(7, finite(input.heightFt, 8))),
    layout: input.layout,
  };
}

export function createManualRoom(input: ManualRoomInput): RoomModel {
  const normalized = normalizeManualRoomInput(input);
  return {
    id: `manual-room-${Date.now()}`,
    widthM: round(feetToMeters(normalized.widthFt)),
    lengthM: round(feetToMeters(normalized.lengthFt)),
    heightM: round(feetToMeters(normalized.heightFt)),
    layout: normalized.layout,
    openings: [],
    confidence: 1,
    source: 'manual',
    photos: [],
  };
}

export function createBlankManualProject(input: ManualRoomInput): EditorProject {
  const normalized = normalizeManualRoomInput(input);
  const room = createManualRoom(normalized);
  const generated = generateDesigns(room)[0];
  const design = {
    ...generated,
    id: `${room.id}-design`,
    name: 'Blank Manual Kitchen',
    description: 'Clean room created from entered dimensions. Add cabinets, appliances, openings and finishes from the editor.',
    includesIsland: false,
  };
  const widthIn = feetToInches(normalized.widthFt);
  const lengthIn = feetToInches(normalized.lengthFt);
  const originX = 120;
  const originY = 120;
  let project = createEditorProject(room, design, 'Mi cocina — medidas manuales');
  project = {
    ...project,
    objects: [
      objectDefaults('wall', {
        id: 'manual-wall-north',
        name: 'North Wall',
        x: originX,
        y: originY,
        widthIn,
        heightIn: feetToInches(normalized.heightFt),
        rotation: 0,
      }),
      objectDefaults('wall', {
        id: 'manual-wall-east',
        name: 'East Wall',
        x: originX + widthIn,
        y: originY,
        widthIn: lengthIn,
        heightIn: feetToInches(normalized.heightFt),
        rotation: 90,
      }),
      objectDefaults('wall', {
        id: 'manual-wall-south',
        name: 'South Wall',
        x: originX + widthIn,
        y: originY + lengthIn,
        widthIn,
        heightIn: feetToInches(normalized.heightFt),
        rotation: 180,
      }),
      objectDefaults('wall', {
        id: 'manual-wall-west',
        name: 'West Wall',
        x: originX,
        y: originY + lengthIn,
        widthIn: lengthIn,
        heightIn: feetToInches(normalized.heightFt),
        rotation: -90,
      }),
    ],
    selectedId: undefined,
    viewMode: '2d',
    updatedAt: new Date().toISOString(),
  };
  project.view2d = fit2DView(project, { width: 1040, height: 680 });
  project.camera3d = fit3DCamera(project, { width: 1040, height: 680 });
  return project;
}
