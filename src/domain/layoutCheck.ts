import { EditorProject } from './editor';
import {
  LayoutIssue,
  LayoutIssueSeverity,
  layoutIssueCounts,
  validateKitchenLayout as validateDesignLayout,
} from './designValidation';

export type LayoutCheckIssue={
  id:string;
  severity:LayoutIssueSeverity;
  code:string;
  title:string;
  message:string;
  description:string;
  detail:string;
  objectId?:string;
  objectIds:string[];
  relatedObjectIds:string[];
};

export type LayoutCheckReport={
  issues:LayoutCheckIssue[];
  counts:{errors:number;warnings:number;info:number};
};

const normalize=(issue:LayoutIssue):LayoutCheckIssue=>({
  id:issue.id,
  severity:issue.severity,
  code:issue.id,
  title:issue.title,
  message:issue.detail,
  description:issue.detail,
  detail:issue.detail,
  objectId:issue.objectIds[0],
  objectIds:[...issue.objectIds],
  relatedObjectIds:issue.objectIds.slice(1),
});

export function checkKitchenLayout(project:EditorProject):LayoutCheckReport{
  const issues=validateDesignLayout(project).map(normalize);
  return{issues,counts:layoutIssueCounts(issues)};
}

export const runLayoutCheck=checkKitchenLayout;
export const checkLayout=checkKitchenLayout;
export const validateLayout=checkKitchenLayout;
export const validateKitchenLayout=(project:EditorProject)=>checkKitchenLayout(project).issues;

export { layoutIssueCounts };
