/**
 * @file auditOverlay.ts - Document Audit result panel (webview side)
 * @description Renders the audit issue overlay and handles user interactions:
 *   - Lists all detected issues with navigation on item click
 *   - Shows fuzzy-matched suggestion pills the user can click to apply
 *   - Shows a "Browse..." button for image/link issues to open the VS Code file picker
 *   - Heading issues display a friendly "Seems these headings were renamed" hint
 *   - Manual text input when no suggestions are available
 */

import { Editor } from '@tiptap/core';
import {
  AuditIssue,
  AuditFileType,
  auditPluginKey,
  requestFilePickerForIssue,
} from './auditDocument';

// Levenshtein distance for fuzzy matching (copied from auditDocument.ts)
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Maximum number of suggestion pills to show per issue (keeps the UI clean).
const MAX_SUGGESTION_PILLS = 5;

/**
 * Show the audit results overlay panel.
 * Creates the element on first call, then reuses it on subsequent audits.
 *
 * @param editor - The active TipTap editor instance.
 * @param issues - Array of audit issues to display.
 */
export function showAuditOverlay(editor: Editor, issues: AuditIssue[]) {
  let overlay = document.getElementById('audit-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'audit-overlay';
    overlay.className = 'audit-overlay';
    document.body.appendChild(overlay);
  }

  if (issues.length === 0) {
    overlay.innerHTML = `
      <div class="audit-overlay-backdrop"></div>
      <div class="audit-overlay-panel">
        <div class="audit-overlay-header">
          <h3 class="audit-overlay-title">Document Audit</h3>
          <button class="audit-overlay-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
            </svg>
          </button>
        </div>
        <div class="audit-overlay-content">
          <div class="audit-overlay-empty">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="color: var(--vscode-charts-green); margin-bottom: 16px;">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M13.854 3.646l-7.5 7.5L3.146 8.5l.708-.708 2.5 2.5 6.792-6.792.708.708z"/>
            </svg>
            <p>No issues found!</p>
            <p class="audit-overlay-empty-hint">Your document is healthy.</p>
          </div>
        </div>
      </div>
    `;
  } else {
    overlay.innerHTML = `
      <div class="audit-overlay-backdrop"></div>
      <div class="audit-overlay-panel">
        <div class="audit-overlay-header">
          <h3 class="audit-overlay-title">Document Audit (${issues.length} issues)</h3>
          <button class="audit-overlay-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
            </svg>
          </button>
        </div>
        <div class="audit-overlay-list"></div>
      </div>
    `;

    const listEl = overlay.querySelector('.audit-overlay-list');
    if (listEl) {
      issues.forEach(issue => {
        const item = buildIssueItem(issue);
        listEl.appendChild(item);
      });
    }
  }

  overlay.classList.add('visible');

  // Close button
  const closeBtn = overlay.querySelector('.audit-overlay-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay?.classList.remove('visible');
    });
  }

  // Backdrop click to close
  const backdrop = overlay.querySelector('.audit-overlay-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      overlay?.classList.remove('visible');
    });
  }

  // Wire up interaction handlers on all items
  const itemNodes = overlay.querySelectorAll('.audit-overlay-item');
  itemNodes.forEach(itemNode => {
    wireItemHandlers(itemNode as HTMLElement, editor, issues, overlay!);
  });
}

// ─── Item builder ─────────────────────────────────────────────────────────────

/**
 * Build the DOM element for a single audit issue.
 * Layout:
 *   [emoji] [message]
 *            [target path in muted style]
 *            [heading-hint (heading issues only)]
 *            [suggestion pills] [Browse button (image/link only)]
 *            [manual input + Fix button (no suggestions)]
 */
function buildIssueItem(issue: AuditIssue): HTMLElement {
  const item = document.createElement('div');
  item.className = 'audit-overlay-item';
  item.setAttribute('data-pos', String(issue.pos));
  item.setAttribute('data-type', issue.type);

  // Icon column
  const typeEl = document.createElement('div');
  typeEl.className = `audit-issue-type ${issue.type}`;
  typeEl.textContent = issue.type === 'link' ? '🔗' : issue.type === 'image' ? '🖼️' : '📑';

  // Text column
  const textEl = document.createElement('div');
  textEl.className = 'audit-issue-text';

  const msgEl = document.createElement('div');
  msgEl.className = 'audit-issue-message';
  msgEl.textContent = issue.message;
  textEl.appendChild(msgEl);

  if (issue.target) {
    const targetEl = document.createElement('div');
    targetEl.className = 'audit-issue-target';
    targetEl.textContent = issue.target;
    textEl.appendChild(targetEl);
  }

  // Actions area
  const actionEl = document.createElement('div');
  actionEl.className = 'audit-issue-actions';

  if (issue.type === 'heading' && issue.suggestions && issue.suggestions.length > 0) {
    // Heading: friendly hint + suggestion pills (no Browse button – anchors aren't files)
    const hintEl = document.createElement('div');
    hintEl.className = 'audit-heading-hint';

    // Provide more intelligent messaging based on suggestion quality
    const targetSlug = issue.target;
    const bestMatch = issue.suggestions[0];
    const distance = getLevenshteinDistance(targetSlug, bestMatch);

    if (distance === 1) {
      hintEl.textContent = 'Heading name changed slightly — pick the updated one:';
    } else if (distance <= 3) {
      hintEl.textContent = 'Seems these headings were renamed — pick the updated one:';
    } else if (issue.suggestions.length === 1) {
      hintEl.textContent = 'Found a similar heading — is this what you meant?';
    } else {
      hintEl.textContent = 'Multiple similar headings found — pick the correct one:';
    }

    actionEl.appendChild(hintEl);

    const pillsEl = buildSuggestionPills(issue.suggestions);
    actionEl.appendChild(pillsEl);
  } else if (
    (issue.type === 'image' || issue.type === 'link') &&
    issue.suggestions &&
    issue.suggestions.length > 0
  ) {
    // Image / link with repo matches: pills + Browse fallback
    const pillsEl = buildSuggestionPills(issue.suggestions);
    actionEl.appendChild(pillsEl);

    const browseBtn = buildBrowseButton(issue.type === 'image' ? 'image' : 'any');
    actionEl.appendChild(browseBtn);
  } else if (issue.type === 'image' || issue.type === 'link') {
    // Image / link without suggestions: manual input + Fix + Browse
    const inputRow = document.createElement('div');
    inputRow.className = 'audit-input-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'audit-manual-input';
    input.value = issue.target;
    input.placeholder = `Fix ${issue.type}...`;

    const fixBtn = document.createElement('button');
    fixBtn.className = 'audit-fix-button manual-fix';
    fixBtn.textContent = 'Fix';
    fixBtn.setAttribute('data-pos', String(issue.pos));
    fixBtn.setAttribute('data-type', issue.type);
    fixBtn.style.cssText =
      'background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;padding:4px 8px;cursor:pointer;border-radius:2px;flex-shrink:0;';

    const browseBtn = buildBrowseButton(issue.type === 'image' ? 'image' : 'any');

    inputRow.appendChild(input);
    inputRow.appendChild(fixBtn);
    inputRow.appendChild(browseBtn);
    actionEl.appendChild(inputRow);
  }

  textEl.appendChild(actionEl);
  item.appendChild(typeEl);
  item.appendChild(textEl);
  return item;
}

/**
 * Build a container of clickable suggestion pills (one per match).
 * Caps at MAX_SUGGESTION_PILLS to avoid overwhelming the UI.
 */
function buildSuggestionPills(suggestions: string[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'audit-suggestion-pills';

  const capped = suggestions.slice(0, MAX_SUGGESTION_PILLS);
  for (const sug of capped) {
    const pill = document.createElement('button');
    pill.className = 'audit-suggestion-pill';
    pill.setAttribute('data-suggestion', sug);
    // Show only the basename for conciseness; full path is in the data attribute
    const basename = sug.split('/').pop() ?? sug;
    pill.textContent = basename;
    pill.title = sug; // full path on hover
    container.appendChild(pill);
  }

  return container;
}

/**
 * Build the "📁 Browse…" button that opens the VS Code file picker.
 *
 * @param fileType - Filter to pass to the extension ('image' | 'any').
 */
function buildBrowseButton(fileType: AuditFileType): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'audit-browse-btn';
  btn.setAttribute('data-file-type', fileType);
  btn.textContent = '📁 Browse…';
  btn.title = 'Open file picker to select the correct file';
  return btn;
}

// ─── Interaction wiring ───────────────────────────────────────────────────────

/**
 * Attach all click/key handlers to a rendered issue item.
 */
function wireItemHandlers(
  item: HTMLElement,
  editor: Editor,
  allIssues: AuditIssue[],
  overlay: HTMLElement
) {
  // Clicking the item body (not a control) navigates to position
  item.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('.audit-suggestion-pills')
    ) {
      return;
    }
    navigateToIssue(item, editor);
  });

  // Suggestion pill → apply immediately
  const pillContainer = item.querySelector('.audit-suggestion-pills');
  if (pillContainer) {
    pillContainer.addEventListener('click', (e: Event) => {
      const pill = (e.target as HTMLElement).closest(
        '.audit-suggestion-pill'
      ) as HTMLElement | null;
      if (!pill) return;
      e.stopPropagation();
      const suggestion = pill.getAttribute('data-suggestion');
      if (suggestion) {
        const pos = parseInt(item.getAttribute('data-pos') ?? '0', 10);
        const typeStr = item.getAttribute('data-type');
        applyFix(pos, typeStr, suggestion, item, allIssues, editor, overlay);
      }
    });
  }

  // Browse button → open VS Code file picker, then apply selected path
  const browseBtn = item.querySelector('.audit-browse-btn') as HTMLButtonElement | null;
  if (browseBtn) {
    browseBtn.addEventListener('click', async (e: Event) => {
      e.stopPropagation();
      const fileType = (browseBtn.getAttribute('data-file-type') ?? 'any') as AuditFileType;
      browseBtn.disabled = true;
      browseBtn.textContent = '⏳ Waiting…';

      try {
        const selected = await requestFilePickerForIssue(fileType);
        if (selected) {
          const pos = parseInt(item.getAttribute('data-pos') ?? '0', 10);
          const typeStr = item.getAttribute('data-type');
          applyFix(pos, typeStr, selected, item, allIssues, editor, overlay);
        } else {
          // User cancelled – restore button
          browseBtn.disabled = false;
          browseBtn.textContent = '📁 Browse…';
        }
      } catch {
        browseBtn.disabled = false;
        browseBtn.textContent = '📁 Browse…';
      }
    });
  }

  // Manual fix button
  const manualFixBtn = item.querySelector(
    '.audit-fix-button.manual-fix'
  ) as HTMLButtonElement | null;
  if (manualFixBtn) {
    manualFixBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      const input = manualFixBtn.previousElementSibling as HTMLInputElement;
      const posStr = manualFixBtn.getAttribute('data-pos');
      const typeStr = manualFixBtn.getAttribute('data-type');

      if (posStr && input && input.value.trim()) {
        const pos = parseInt(posStr, 10);
        applyFix(pos, typeStr, input.value.trim(), item, allIssues, editor, overlay);
      }
    });
  }
}

// ─── Editor actions ───────────────────────────────────────────────────────────

/**
 * Scroll the editor to the issue position and select the node/text.
 */
function navigateToIssue(item: HTMLElement, editor: Editor): void {
  const posStr = item.getAttribute('data-pos');
  const typeStr = item.getAttribute('data-type');
  if (!posStr) return;

  const pos = parseInt(posStr, 10);
  const node = editor.state.doc.nodeAt(pos);
  const nodeSize = node ? node.nodeSize : 1;

  if (
    typeStr === 'image' &&
    node &&
    (node.type.name === 'image' || node.type.name === 'customImage')
  ) {
    editor.commands.setNodeSelection(pos);
  } else {
    editor.commands.setTextSelection({ from: pos, to: pos + nodeSize });
  }

  editor.commands.focus();

  try {
    editor.view.dispatch(editor.state.tr.scrollIntoView());
  } catch {
    requestAnimationFrame(() => {
      try {
        const dom = editor.view.domAtPos(pos).node as Element;
        if (dom) dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        editor.commands.focus();
      }
    });
  }
}

/**
 * Apply a path fix to the document, then remove the issue from the overlay.
 * Dispatcher: routes to image attribute update or link mark update.
 */
function applyFix(
  pos: number,
  typeStr: string | null,
  suggestion: string,
  item: HTMLElement,
  allIssues: AuditIssue[],
  editor: Editor,
  overlay: HTMLElement
): void {
  const node = editor.state.doc.nodeAt(pos);
  const nodeSize = node ? node.nodeSize : 1;

  // Recompute remaining issues AND map their positions
  const remainingIssues = allIssues.filter(
    (i: AuditIssue) => !(i.pos === pos && i.nodeSize === nodeSize)
  );


  // Refactor the fix application to use a single transaction so we can map positions accurately

  const fixTr = editor.state.tr;
  if (typeStr === 'image') {
    const node = editor.state.doc.nodeAt(pos);
    if (node && (node.type.name === 'image' || node.type.name === 'customImage')) {
      fixTr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src: suggestion,
        'markdown-src': suggestion,
      });
    }
  } else if (typeStr === 'link' || typeStr === 'heading') {
    const href =
      typeStr === 'heading'
        ? suggestion.startsWith('#')
          ? suggestion
          : `#${suggestion}`
        : suggestion;

    // Use a custom link mark update that works with the transaction
    const linkMark = editor.schema.marks.link.create({ href });
    fixTr.addMark(pos, pos + nodeSize, linkMark);
  }

  // Now map all remaining issues to their new positions
  const mappedIssues = remainingIssues.map(issue => ({
    ...issue,
    pos: fixTr.mapping.map(issue.pos),
  }));

  // Update the decorations via metadata
  fixTr.setMeta(auditPluginKey, mappedIssues);

  // Dispatch the fix transaction
  editor.view.dispatch(fixTr);

  // Update the shared issues array in-place so other closures see the update
  allIssues.splice(0, allIssues.length, ...mappedIssues);

  // Update DOM attributes of remaining items in the overlay to stay in sync
  const otherItems = overlay.querySelectorAll('.audit-overlay-item');
  otherItems.forEach(otherItem => {
    const otherItemPos = parseInt(otherItem.getAttribute('data-pos') ?? '0', 10);
    // Find the issue in our mapped set that corresponds to this item
    // Actually, mapping should be consistent.
    const newPos = fixTr.mapping.map(otherItemPos);
    otherItem.setAttribute('data-pos', String(newPos));
  });

  // Remove item from list
  item.remove();

  // Show "all fixed" message if last issue resolved
  if (overlay.querySelectorAll('.audit-overlay-item').length === 0) {
    const list = overlay.querySelector('.audit-overlay-list');
    if (list) {
      list.innerHTML = `<div style="padding:20px;text-align:center;">All fixed! 🎉</div>`;
    }
  }
}
