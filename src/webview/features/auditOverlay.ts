import { Editor } from '@tiptap/core';
import { AuditIssue, auditPluginKey } from './auditDocument';

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
      issues.forEach((issue) => {
        const item = document.createElement('div');
        item.className = 'audit-overlay-item';
        item.style.cursor = 'pointer';
        item.setAttribute('data-pos', String(issue.pos));
        item.setAttribute('data-type', issue.type);

        const typeEl = document.createElement('div');
        typeEl.className = `audit-issue-type ${issue.type}`;
        typeEl.textContent = issue.type === 'link' ? '🔗' : issue.type === 'image' ? '🖼️' : '📑';

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

        const actionEl = document.createElement('div');
        actionEl.className = 'audit-issue-actions';
        actionEl.style.marginTop = '8px';
        actionEl.style.display = 'flex';
        actionEl.style.gap = '8px';

        if (issue.suggestions && issue.suggestions.length > 0) {
          const fixBtn = document.createElement('button');
          fixBtn.className = 'audit-fix-button';
          fixBtn.textContent = `✨ Click to auto-fix -> ${issue.suggestions[0]}`;
          fixBtn.setAttribute('data-suggestion', issue.suggestions[0]);
          fixBtn.setAttribute('data-pos', String(issue.pos));
          fixBtn.setAttribute('data-type', issue.type);
          // Default VS Code button styling
          fixBtn.style.background = 'var(--vscode-button-background)';
          fixBtn.style.color = 'var(--vscode-button-foreground)';
          fixBtn.style.border = 'none';
          fixBtn.style.padding = '4px 8px';
          fixBtn.style.cursor = 'pointer';
          fixBtn.style.borderRadius = '2px';
          fixBtn.style.flexShrink = '0';
          
          actionEl.appendChild(fixBtn);
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'audit-manual-input';
          input.value = issue.target;
          input.placeholder = `Fix ${issue.type}...`;
          input.style.flex = '1';
          input.style.background = 'var(--vscode-input-background)';
          input.style.color = 'var(--vscode-input-foreground)';
          input.style.border = '1px solid var(--vscode-input-border)';
          input.style.padding = '4px';
          
          const fixBtn = document.createElement('button');
          fixBtn.className = 'audit-fix-button manual-fix';
          fixBtn.textContent = 'Fix';
          fixBtn.setAttribute('data-pos', String(issue.pos));
          fixBtn.setAttribute('data-type', issue.type);
          fixBtn.style.background = 'var(--vscode-button-background)';
          fixBtn.style.color = 'var(--vscode-button-foreground)';
          fixBtn.style.border = 'none';
          fixBtn.style.padding = '4px 8px';
          fixBtn.style.cursor = 'pointer';
          fixBtn.style.borderRadius = '2px';
          fixBtn.style.flexShrink = '0';
          
          actionEl.appendChild(input);
          actionEl.appendChild(fixBtn);
        }

        textEl.appendChild(actionEl);
        item.appendChild(typeEl);
        item.appendChild(textEl);
        listEl.appendChild(item);
      });
    }
  }

  overlay.classList.add('visible');

  const closeBtn = overlay.querySelector('.audit-overlay-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay?.classList.remove('visible');
    });
  }
  
  const backdrop = overlay.querySelector('.audit-overlay-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      overlay?.classList.remove('visible');
    });
  }

  // Helper function to apply a fix to the document
  function applyFix(pos: number, typeStr: string | null, suggestion: string, item: HTMLElement, allIssues: AuditIssue[]) {
    const node = editor.state.doc.nodeAt(pos);
    const nodeSize = node ? node.nodeSize : 1;

    if (typeStr === 'image') {
      try {
        editor.chain().setNodeSelection(pos).updateAttributes('image', { src: suggestion, 'markdown-src': suggestion }).run();
      } catch {
        try {
          editor.chain().setNodeSelection(pos).updateAttributes('customImage', { src: suggestion, 'markdown-src': suggestion }).run();
        } catch {
          // Failed to apply fix
          return;
        }
      }
    } else if (typeStr === 'link' || typeStr === 'heading') {
      const href = typeStr === 'heading' ? (suggestion.startsWith('#') ? suggestion : `#${suggestion}`) : suggestion;
      editor.chain().setTextSelection({ from: pos, to: pos + nodeSize }).setMark('link', { href }).run();
    }

    // Remove the decoration for this issue by updating the plugin state
    const remainingIssues = allIssues.filter(
      (issue: AuditIssue) => !(issue.pos === pos && issue.nodeSize === nodeSize)
    );
    
    // Update the plugin state with the filtered issues
    const tr = editor.state.tr;
    tr.setMeta(auditPluginKey, remainingIssues);
    editor.view.dispatch(tr);

    // Remove the issue from the list
    item.remove();

    // Check if all issues are fixed
    if (overlay?.querySelectorAll('.audit-overlay-item').length === 0) {
      const list = overlay?.querySelector('.audit-overlay-list');
      if (list) {
        list.innerHTML = `<div style="padding: 20px; text-align: center;">All fixed! 🎉</div>`;
      }
    }
  }

  // Combined click handler for navigation and fix actions
  const itemsNodeList = overlay.querySelectorAll('.audit-overlay-item');
  
  itemsNodeList.forEach((itemNode) => {
    const item = itemNode as HTMLElement;
    
    // Navigation click handler
    item.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Don't navigate if clicking on button or input
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
        return;
      }

      const posStr = item.getAttribute('data-pos');
      const typeStr = item.getAttribute('data-type');

      if (posStr) {
        const pos = parseInt(posStr, 10);

        // Get the node to determine the selection range
        const node = editor.state.doc.nodeAt(pos);
        const nodeSize = node ? node.nodeSize : 1;

        // For images, use node selection; for links/headings, use text selection
        if (typeStr === 'image' && node && (node.type.name === 'image' || node.type.name === 'customImage')) {
          editor.commands.setNodeSelection(pos);
        } else {
          editor.commands.setTextSelection({ from: pos, to: pos + nodeSize });
        }

        // Focus the editor
        editor.commands.focus();

        // Scroll into view
        try {
          editor.view.dispatch(editor.state.tr.scrollIntoView());
        } catch {
          // Fallback: try to scroll to the position
          requestAnimationFrame(() => {
            try {
              const coords = editor.view.coordsAtPos(pos);
              if (coords) {
                const element = editor.view.domAtPos(pos).node as Element;
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            } catch {
              editor.commands.focus();
            }
          });
        }
      }
    });

    // Auto-fix button click handler (attaching to item for event delegation)
    const autoFixBtn = item.querySelector('.audit-fix-button:not(.manual-fix)') as HTMLElement;
    if (autoFixBtn) {
      autoFixBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const posStr = autoFixBtn.getAttribute('data-pos');
        const typeStr = autoFixBtn.getAttribute('data-type');
        const suggestion = autoFixBtn.getAttribute('data-suggestion');

        if (posStr && suggestion) {
          const pos = parseInt(posStr, 10);
          applyFix(pos, typeStr, suggestion, item, issues);
        }
      });
    }

    // Manual fix button click handler
    const manualFixBtn = item.querySelector('.audit-fix-button.manual-fix') as HTMLElement;
    if (manualFixBtn) {
      manualFixBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const posStr = manualFixBtn.getAttribute('data-pos');
        const typeStr = manualFixBtn.getAttribute('data-type');
        const input = manualFixBtn.previousElementSibling as HTMLInputElement;

        if (posStr && input && input.value.trim()) {
          const pos = parseInt(posStr, 10);
          applyFix(pos, typeStr, input.value.trim(), item, issues);
        }
      });
    }
  });
}
