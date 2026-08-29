import { createEditorProject, objectDefaults } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, serializeProject } from '../domain/projectIO';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';
import {
  applyToeKickProfile,
  DEFAULT_TOE_KICK_PROFILE,
  syncToeKickProfileToCabinetColor,
  toeKickProfileData,
  updateToeKickProfile,
} from '../domain/toeKickProfiles';
import { buildToeKickProfileSceneBoxes } from '../domain/toeKickProfileScene';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`toe-profile-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('professional toe-kick profiles',()=>{
  test('migrates existing toe-kick data into Continuous profile defaults',()=>{
    const cabinet=objectDefaults('base-cabinet',{toeKick:{enabled:true,heightIn:5,recessIn:2,color:'#112233',finish:'Matte'}});
    expect(toeKickProfileData(cabinet)).toMatchObject({mode:'Continuous',enabled:true,heightIn:5,recessIn:2,color:'#112233',finish:'Matte'});
  });

  test('updates selected profile and synchronizes legacy toe-kick fields',()=>{
    let project=createEditorProject(room,design);
    project=updateToeKickProfile(project,'base-1',{mode:'Flush',heightIn:4.5,color:'#222222'});
    const cabinet=project.objects.find(object=>object.id==='base-1')!;
    expect(toeKickProfileData(cabinet)).toMatchObject({mode:'Flush',heightIn:4.5,recessIn:0,color:'#222222'});
    expect(cabinet.toeKick).toMatchObject({enabled:true,heightIn:4.5,recessIn:0,color:'#222222'});
  });

  test('applies a profile to base/tall cabinets but not wall cabinets or island',()=>{
    let project=createEditorProject(room,design);
    project={...project,objects:[...project.objects,objectDefaults('pantry-cabinet',{id:'tall'}),objectDefaults('wall-cabinet',{id:'upper'}),objectDefaults('island',{id:'island'})]};
    project=applyToeKickProfile(project,{mode:'Furniture Legs',heightIn:6},'base');
    expect(toeKickProfileData(project.objects.find(object=>object.id==='base-1')!)).toMatchObject({mode:'Furniture Legs',heightIn:6});
    expect(toeKickProfileData(project.objects.find(object=>object.id==='tall')!)).toMatchObject({mode:'Furniture Legs',heightIn:6});
    expect((project.objects.find(object=>object.id==='upper') as any).toeKickProfileSpec).toBeUndefined();
    expect(toeKickProfileData(project.objects.find(object=>object.id==='island')!).mode).toBe('Continuous');
  });

  test('renders four furniture legs instead of a front plate',()=>{
    const cabinet={...objectDefaults('base-cabinet',{id:'legs'}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Furniture Legs',heightIn:6}} as any;
    const toeBoxes=buildToeKickProfileSceneBoxes([cabinet]).filter(box=>box.kind==='toe-kick');
    expect(toeBoxes).toHaveLength(4);
    expect(toeBoxes.every(box=>box.id.includes('leg-'))).toBe(true);
    expect(toeBoxes.every(box=>box.size[1]).toBeCloseTo(6/24));
  });

  test('renders individual and flush profiles with different depth',()=>{
    const individual={...objectDefaults('base-cabinet',{id:'individual',depthIn:24}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Individual',recessIn:3}} as any;
    const flush={...objectDefaults('base-cabinet',{id:'flush',x:60,depthIn:24}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Flush',recessIn:0}} as any;
    const boxes=buildToeKickProfileSceneBoxes([individual,flush]).filter(box=>box.kind==='toe-kick');
    const individualBox=boxes.find(box=>box.id==='individual-toe-kick')!,flushBox=boxes.find(box=>box.id==='flush-toe-kick')!;
    expect(flushBox.size[2]).toBeGreaterThan(individualBox.size[2]);
    expect(flushBox.size[2]).toBeCloseTo(24/24);
  });

  test('renders decorative base and trim geometry',()=>{
    const decorative={...objectDefaults('base-cabinet',{id:'decorative',widthIn:36}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Decorative Base',decorativeHeightIn:6,decorativeProjectionIn:1}} as any;
    const boxes=buildToeKickProfileSceneBoxes([decorative]).filter(box=>box.kind==='toe-kick');
    expect(boxes.some(box=>box.id==='decorative-decorative-base')).toBe(true);
    expect(boxes.some(box=>box.id==='decorative-decorative-trim')).toBe(true);
    expect(boxes.find(box=>box.id==='decorative-decorative-trim')?.size[0]).toBeGreaterThan(36/24);
  });

  test('continuous mode joins adjacent cabinets while Individual remains separate',()=>{
    const a={...objectDefaults('base-cabinet',{id:'a',x:100,y:100,widthIn:30}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Continuous'}} as any;
    const b={...objectDefaults('base-cabinet',{id:'b',x:130,y:100,widthIn:30}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Continuous'}} as any;
    const c={...objectDefaults('base-cabinet',{id:'c',x:160,y:100,widthIn:30}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,mode:'Individual'}} as any;
    const boxes=buildToeKickProfileSceneBoxes([a,b,c]).filter(box=>box.kind==='toe-kick');
    expect(boxes.filter(box=>box.id.startsWith('toe-profile-run-'))).toHaveLength(1);
    expect(boxes.some(box=>box.id==='c-toe-kick')).toBe(true);
  });

  test('disabled profiles emit no toe-kick geometry',()=>{
    const cabinet={...objectDefaults('base-cabinet',{id:'disabled'}),toeKickProfileSpec:{...DEFAULT_TOE_KICK_PROFILE,enabled:false}} as any;
    expect(buildToeKickProfileSceneBoxes([cabinet]).filter(box=>box.kind==='toe-kick')).toEqual([]);
  });

  test('syncs the profile color to the cabinet finish when requested',()=>{
    let project=createEditorProject(room,design);
    project={...project,objects:project.objects.map(object=>object.id==='base-1'?{...object,color:'#445566'}:object)};
    project=syncToeKickProfileToCabinetColor(project,'base-1');
    expect(toeKickProfileData(project.objects.find(object=>object.id==='base-1')!).color).toBe('#445566');
  });

  test('persists profile modes and custom dimensions through JSON',()=>{
    let project=createEditorProject(room,design);
    project=updateToeKickProfile(project,'base-1',{mode:'Decorative Base',decorativeHeightIn:7,decorativeProjectionIn:1.25,finish:'Semi-Gloss'});
    const loaded=parseProject(serializeProject(project))!;
    expect(toeKickProfileData(loaded.objects.find(object=>object.id==='base-1')!)).toMatchObject({mode:'Decorative Base',decorativeHeightIn:7,decorativeProjectionIn:1.25,finish:'Semi-Gloss'});
  });

  test('wall cabinets reject toe-kick profile updates',()=>{
    const project=createEditorProject(room,design);
    expect(updateToeKickProfile(project,'upper-1',{mode:'Flush'})).toBe(project);
  });
});
