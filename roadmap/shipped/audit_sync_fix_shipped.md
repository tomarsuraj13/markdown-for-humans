# Implementation Plan - Document Audit Sync & Polish

## Problem
1. **Stale Issues**: In `applyFix`, the `allIssues` array is never updated. When a second issue is fixed, the previously fixed issue is still in the original array and gets re-dispatched to the plugin, making it "re-appear".
2. **Positional Drift**: When an issue is fixed, the document shifts. Subsequent issues in the `allIssues` list have stale `pos` values, leading to incorrect decorations and failed fixes.
3. **Jarring Aesthetics**: The current `.validation-error-highlight` uses a high-opacity red background (`0.4`) which can be distracting in a premium prose editor.

## Proposed Changes

### 1. `src/webview/features/auditOverlay.ts`
- **Mutate/Track State**: Keep track of the current list of issues.
- **Map Positions**: In `applyFix`, update all remaining issues' positions using `tr.mapping` to account for document shifts.
- **Update Shared State**: Ensure the updated issue set is used for subsequent fixes.

### 2. `src/webview/editor.css` (Minimal CSS adjustment)
- Adjust `.validation-error-highlight` to be more subtle (0.1 opacity) and add a smooth fade transition.

### 3. `src/webview/features/auditDocument.ts` (Styling tweaks)
- Soften highlight colors and add smooth fade effects.

## Verification Plan
1. **Automated Tests**:
   - Run `npm test` on existing audit tests.
   - Add a test for multiple fixes.
2. **Manual Verification**:
   - Perform audit and fix multiple issues sequentially.
   - Verify decorations are updated precisely and don't re-appear.
   - Check if styling feels more premium.
