import { createEditorProject } from '../domain/editor';
import { generateDesigns } from '../domain/design';
import { parseProject, parseProjectDetailed, serializeProject } from '../domain/projectIO';
import { MAX_PROJECT_FILE_BYTES, parseAndValidateProjectJson, validateProjectPayload } from '../domain/projectValidation';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`validation-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

describe('safe Kitchen AI project import',()=>{
  test('accepts and round-trips a current project',()=>{
    const project=createEditorProject(room,design,'Safe Project');
    const result=parseProjectDetailed(serializeProject(project));
    expect(result.ok).toBe(true);
    if(result.ok){
      expect(result.project.name).toBe('Safe Project');
      expect(result.project.objects.map(object=>object.id)).toEqual(project.objects.map(object=>object.id));
    }
  });

  test('accepts a legacy room/design payload and migrates defaults',()=>{
    const loaded=parseProject(JSON.stringify({room,design}));
    expect(loaded?.version).toBe(2);
    expect(loaded?.objects.some(object=>object.kind==='base-cabinet'&&object.toeKick?.enabled)).toBe(true);
  });

  test('returns a useful error for invalid JSON',()=>{
    const result=parseProjectDetailed('{not json');
    expect(result).toMatchObject({ok:false,code:'invalid-json'});
    expect(parseProject('{not json')).toBeUndefined();
  });

  test('rejects files above the project size limit before parsing',()=>{
    const result=parseAndValidateProjectJson(' '.repeat(MAX_PROJECT_FILE_BYTES+1));
    expect(result).toMatchObject({ok:false,code:'file-too-large'});
  });

  test('rejects blocked prototype-related properties',()=>{
    const raw=JSON.parse(JSON.stringify({room,design}));
    Object.defineProperty(raw,'__proto__',{value:{polluted:true},enumerable:true});
    const result=validateProjectPayload(raw);
    expect(result).toMatchObject({ok:false,code:'dangerous-key'});
  });

  test('rejects duplicate object IDs',()=>{
    const project=createEditorProject(room,design);
    const duplicate={...project.objects[0]};
    const result=validateProjectPayload({...project,objects:[...project.objects,duplicate]});
    expect(result).toMatchObject({ok:false,code:'duplicate-object-id'});
  });

  test('rejects invalid dimensions and unknown object kinds',()=>{
    const project=createEditorProject(room,design);
    expect(validateProjectPayload({...project,room:{...room,widthM:-2}})).toMatchObject({ok:false,code:'invalid-room'});
    expect(validateProjectPayload({...project,objects:[{...project.objects[0],kind:'malicious-object'}]})).toMatchObject({ok:false,code:'invalid-object'});
  });

  test('rejects unreasonable coordinates instead of loading an unusable plan',()=>{
    const project=createEditorProject(room,design);
    const result=validateProjectPayload({...project,objects:[{...project.objects[0],x:1_000_000}]});
    expect(result).toMatchObject({ok:false,code:'invalid-object'});
  });
});
