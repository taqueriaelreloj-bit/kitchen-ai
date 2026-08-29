import { buildBillOfMaterials, summarizeBillOfMaterials } from './billOfMaterials';
import { EditorProject } from './editor';
import { estimateEditorProject } from './editorPricing';
import * as LayoutCheck from './layoutCheck';
import { inspectProjectIntegrity } from './projectIntegrity';
import { analyzeWorkTriangle, workTriangleLayoutIssues } from './workTriangle';

export type ReviewSeverity='error'|'warning'|'info';
export type DesignReviewIssue={
  id:string;
  severity:ReviewSeverity;
  code:string;
  title:string;
  message:string;
  objectIds:string[];
};
export type DesignReviewStatus='blocked'|'review'|'ready';
export type DesignReview={
  projectId:string;
  projectName:string;
  generatedAt:string;
  status:DesignReviewStatus;
  counts:{errors:number;warnings:number;info:number};
  issues:DesignReviewIssue[];
  materials:ReturnType<typeof summarizeBillOfMaterials>;
  estimate:ReturnType<typeof estimateEditorProject>;
  workTriangle:ReturnType<typeof analyzeWorkTriangle>;
};

type UnknownIssue={
  id?:string;
  severity?:string;
  code?:string;
  title?:string;
  message?:string;
  description?:string;
  objectId?:string;
  objectIds?:string[];
  relatedObjectIds?:string[];
};

const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);

function baseLayoutIssues(project:EditorProject):UnknownIssue[]{
  const module=LayoutCheck as unknown as Record<string,unknown>;
  const checker=(module.checkKitchenLayout??module.runLayoutCheck??module.checkLayout??module.validateKitchenLayout??module.validateLayout) as((project:EditorProject)=>unknown)|undefined;
  if(!checker)return[];
  const result=checker(project) as any;
  return Array.isArray(result)?result:Array.isArray(result?.issues)?result.issues:[];
}

function normalizeIssue(issue:UnknownIssue,index:number,prefix:string):DesignReviewIssue{
  const severity:ReviewSeverity=issue.severity==='error'?'error':issue.severity==='warning'?'warning':'info';
  const objectIds=[issue.objectId,...(issue.objectIds??[]),...(issue.relatedObjectIds??[])].filter((value):value is string=>Boolean(value));
  return{
    id:issue.id??`${prefix}-${issue.code??severity}-${index}`,
    severity,
    code:issue.code??`${prefix}-${severity}`,
    title:issue.title??issue.message??issue.description??'Design review issue',
    message:issue.title?(issue.message??issue.description??issue.title):(issue.description??issue.message??'Review this item.'),
    objectIds:[...new Set(objectIds)],
  };
}

function dedupeIssues(issues:DesignReviewIssue[]){
  const seen=new Set<string>();
  return issues.filter(issue=>{
    const key=[issue.code,issue.message,[...issue.objectIds].sort().join(',')].join('|');
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).sort((a,b)=>{
    const order:Record<ReviewSeverity,number>={error:0,warning:1,info:2};
    return order[a.severity]-order[b.severity]||a.title.localeCompare(b.title);
  });
}

export function buildDesignReview(project:EditorProject):DesignReview{
  const layout=baseLayoutIssues(project).map((issue,index)=>normalizeIssue(issue,index,'layout'));
  const integrity=inspectProjectIntegrity(project).map((issue,index)=>normalizeIssue({
    id:issue.id,severity:issue.severity,code:issue.code,title:'Project integrity',message:issue.message,objectId:issue.objectId,relatedObjectIds:issue.relatedObjectIds,
  },index,'integrity'));
  const triangle=workTriangleLayoutIssues(project).map((issue,index)=>normalizeIssue(issue,index,'triangle'));
  const issues=dedupeIssues([...layout,...integrity,...triangle]);
  const errors=issues.filter(issue=>issue.severity==='error').length;
  const warnings=issues.filter(issue=>issue.severity==='warning').length;
  const info=issues.length-errors-warnings;
  return{
    projectId:project.id,
    projectName:project.name,
    generatedAt:new Date().toISOString(),
    status:errors?'blocked':warnings?'review':'ready',
    counts:{errors,warnings,info},
    issues,
    materials:summarizeBillOfMaterials(project),
    estimate:estimateEditorProject(project),
    workTriangle:analyzeWorkTriangle(project),
  };
}

export function designReviewFileName(project:EditorProject){
  const base=(project.name||'Kitchen Project').trim().replace(/[^a-z0-9-_]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'Kitchen-Project';
  return`${base}-design-review.html`;
}

export function designReviewHtml(project:EditorProject):string{
  const review=buildDesignReview(project),bom=buildBillOfMaterials(project);
  const issueRows=review.issues.length?review.issues.map(issue=>`<tr class="${issue.severity}"><td>${escapeHtml(issue.severity.toUpperCase())}</td><td>${escapeHtml(issue.title)}</td><td>${escapeHtml(issue.message)}</td><td>${escapeHtml(issue.objectIds.join(', ')||'—')}</td></tr>`).join(''):`<tr><td colspan="4">No review issues were detected.</td></tr>`;
  const materialRows=bom.map(line=>`<tr><td>${escapeHtml(line.category)}</td><td>${escapeHtml(line.item)}</td><td class="num">${line.quantity}</td><td>${escapeHtml(line.unit)}</td><td>${escapeHtml(line.notes)}</td></tr>`).join('');
  const estimateRows=review.estimate.categories.map(item=>`<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.basis)}</td><td class="num">${money(item.low)} – ${money(item.high)}</td></tr>`).join('');
  const triangle=review.workTriangle.complete?`${review.workTriangle.totalFt} ft total; ${review.workTriangle.legs.map(leg=>`${leg.from}–${leg.to} ${leg.distanceFt} ft`).join(', ')}`:`Missing: ${review.workTriangle.missing.join(', ')}`;
  return`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(review.projectName)} — Kitchen AI Design Review</title><style>body{font-family:Arial,sans-serif;color:#21312c;margin:0;background:#eef2f0}main{max-width:1100px;margin:0 auto;background:#fff;padding:32px}header{border-bottom:4px solid #315f55;padding-bottom:18px}h1{margin:0;font-size:30px}h2{margin-top:30px;font-size:20px}p{line-height:1.5}.status{display:inline-block;padding:7px 12px;border-radius:999px;font-weight:800;background:#dceee8}.blocked{background:#fff1ef}.review{background:#fff8df}.ready{background:#e7f4ef}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.metric{border:1px solid #cbd5d1;border-radius:10px;padding:12px}.metric strong{display:block;font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d6ddda;padding:8px;vertical-align:top;text-align:left}th{background:#edf2f0}.num{text-align:right;white-space:nowrap}tr.error td:first-child{color:#9c2f27;font-weight:800}tr.warning td:first-child{color:#7b5915;font-weight:800}.disclaimer{margin-top:28px;border:1px solid #d7c48f;background:#fff9e8;padding:14px;border-radius:10px}@media print{body{background:#fff}main{max-width:none;padding:0}.no-print{display:none}}@media(max-width:700px){main{padding:18px}.metrics{grid-template-columns:repeat(2,1fr)}table{font-size:10px}}</style></head><body><main><header><div class="status ${review.status}">${escapeHtml(review.status.toUpperCase())}</div><h1>${escapeHtml(review.projectName)}</h1><p>Kitchen AI design review generated ${escapeHtml(review.generatedAt)}</p><div class="metrics"><div class="metric"><strong>${review.counts.errors}</strong>Errors</div><div class="metric"><strong>${review.counts.warnings}</strong>Warnings</div><div class="metric"><strong>${review.materials.cabinetCount}</strong>Cabinets</div><div class="metric"><strong>${money(review.estimate.low)}–${money(review.estimate.high)}</strong>Planning range</div></div></header><h2>Design issues</h2><table><thead><tr><th>Severity</th><th>Issue</th><th>Details</th><th>Objects</th></tr></thead><tbody>${issueRows}</tbody></table><h2>Work triangle</h2><p>${escapeHtml(triangle)}</p><h2>Planning estimate</h2><table><thead><tr><th>Category</th><th>Basis</th><th>Range</th></tr></thead><tbody>${estimateRows}</tbody></table><h2>Bill of materials</h2><table><thead><tr><th>Category</th><th>Item</th><th>Qty</th><th>Unit</th><th>Notes</th></tr></thead><tbody>${materialRows}</tbody></table><div class="disclaimer"><strong>Planning document only.</strong> Verify field dimensions, manufacturer instructions, structural/electrical/plumbing requirements, local codes, supplier pricing and contractor scope before construction or purchase.</div></main></body></html>`;
}
