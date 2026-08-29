import { createEditorProject, objectDefaults } from '../domain/editor';
import { DEFAULT_ESTIMATE_RATES, editorEstimateCsv, estimateKitchenProject } from '../domain/editorEstimate';
import { generateDesigns } from '../domain/design';
import { createLighting } from '../domain/lighting';
import { reconstructRoom } from '../domain/room';
import { ScanPhoto } from '../domain/types';

const photos:ScanPhoto[]=[0,90,180,270].map((angle,index)=>({uri:`estimate-${index}.jpg`,angle,capturedAt:'2026-08-28T00:00:00.000Z'}));
const room=reconstructRoom(photos),design=generateDesigns(room)[0];

function detailedProject(){
  let project=createEditorProject(room,design,'Estimate Kitchen');
  project={...project,objects:[
    ...project.objects,
    objectDefaults('base-cabinet',{id:'base-extra',widthIn:36}),
    objectDefaults('wall-cabinet',{id:'upper-extra',widthIn:30}),
    objectDefaults('pantry-cabinet',{id:'pantry'}),
    objectDefaults('island',{id:'island',widthIn:72,depthIn:42}),
    objectDefaults('appliance',{id:'range',name:'Range',widthIn:30,heightIn:36,depthIn:29,material:'Stainless Steel'}),
    createLighting('Pendant',{id:'pendant'}),
  ]};
  return project;
}

describe('object-driven editor estimate',()=>{
  test('uses real cabinet widths, BOM quantities and lighting',()=>{
    const estimate=estimateKitchenProject(detailedProject());
    expect(estimate.lines.some(item=>item.id==='cabinet-base'&&item.quantity>0)).toBe(true);
    expect(estimate.lines.some(item=>item.id==='cabinet-wall'&&item.quantity>0)).toBe(true);
    expect(estimate.lines.some(item=>item.id==='cabinet-tall'&&item.quantity>=1)).toBe(true);
    expect(estimate.lines.some(item=>item.id==='cabinet-island'&&item.quantity===6)).toBe(true);
    expect(estimate.lines.some(item=>item.id==='countertops'&&item.quantity>0)).toBe(true);
    expect(estimate.lines.some(item=>item.id==='lighting'&&item.quantity>=1)).toBe(true);
  });

  test('excludes appliance purchase allowance by default',()=>{
    const estimate=estimateKitchenProject(detailedProject());
    expect(estimate.lines.some(item=>item.id==='appliances')).toBe(false);
    const included=estimateKitchenProject(detailedProject(),DEFAULT_ESTIMATE_RATES,{includeApplianceAllowance:true});
    expect(included.lines.find(item=>item.id==='appliances')?.quantity).toBe(1);
  });

  test('adds installation, contingency and overhead in sequence',()=>{
    const estimate=estimateKitchenProject(detailedProject());
    const installation=estimate.lines.find(item=>item.id==='installation')!;
    const contingency=estimate.lines.find(item=>item.id==='contingency')!;
    const overhead=estimate.lines.find(item=>item.id==='overhead-profit')!;
    expect(installation.subtotal).toBeGreaterThan(0);
    expect(contingency.subtotal).toBeGreaterThan(0);
    expect(overhead.subtotal).toBeGreaterThan(0);
    expect(estimate.total).toBe(estimate.directCost+estimate.salesTax);
    expect(estimate.low).toBeLessThan(estimate.total);
    expect(estimate.high).toBeGreaterThan(estimate.total);
  });

  test('supports custom rates and optional sales tax',()=>{
    const rates={...DEFAULT_ESTIMATE_RATES,baseCabinetPerLinearFt:900,installationPercent:10,contingencyPercent:0,overheadProfitPercent:0};
    const estimate=estimateKitchenProject(detailedProject(),rates,{salesTaxPercent:8.25,includeContingency:false,includeOverheadProfit:false,regionLabel:'Custom DFW rates'});
    expect(estimate.regionLabel).toBe('Custom DFW rates');
    expect(estimate.salesTax).toBeGreaterThan(0);
    expect(estimate.lines.some(item=>item.id==='contingency')).toBe(false);
    expect(estimate.lines.some(item=>item.id==='overhead-profit')).toBe(false);
    expect(estimate.lines.find(item=>item.id==='cabinet-base')?.unitCost).toBe(900);
  });

  test('can omit wall paint and installation',()=>{
    const estimate=estimateKitchenProject(detailedProject(),DEFAULT_ESTIMATE_RATES,{includeWallPaint:false,includeInstallation:false});
    expect(estimate.lines.some(item=>item.id==='wall-paint')).toBe(false);
    expect(estimate.lines.some(item=>item.id==='installation')).toBe(false);
  });

  test('exports a spreadsheet-ready estimate CSV',()=>{
    const estimate=estimateKitchenProject(detailedProject());
    const csv=editorEstimateCsv(estimate);
    expect(csv).toContain('"Category","Description","Quantity","Unit","Unit Cost","Subtotal"');
    expect(csv).toContain('"Cabinetry"');
    expect(csv).toContain('"Summary","Total"');
    expect(csv.split('\n').length).toBe(estimate.lines.length+5);
  });

  test('clearly identifies rates as configurable, not live market pricing',()=>{
    const estimate=estimateKitchenProject(detailedProject());
    expect(estimate.pricingMode).toBe('configurable-editor-rates');
    expect(estimate.regionLabel).toBe('User-configurable rates');
    expect(estimate.disclaimer).toContain('Planning estimate only');
  });
});
