import { EditorProject } from './editor';
import { LayoutIssue, layoutIssueCounts, validateKitchenLayout } from './designValidation';

/**
 * Compatibility entry point used by the printable design-review module.
 * The active layout engine lives in designValidation; this adapter keeps one
 * source of truth for collisions, clearances, and core-fixture checks.
 */
export function checkKitchenLayout(project: EditorProject): LayoutIssue[] {
  return validateKitchenLayout(project);
}

export const runLayoutCheck = checkKitchenLayout;
export const checkLayout = checkKitchenLayout;
export const validateLayout = checkKitchenLayout;
export { layoutIssueCounts, validateKitchenLayout };
