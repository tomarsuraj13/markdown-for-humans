import { Editor } from '@tiptap/core';
import { AuditIssue } from './auditDocument';

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
        const item = document.createElement('button');
        item.className = 'audit-overlay-item';
        item.setAttribute('data-pos', String(issue.pos));

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

        if (issue.suggestions && issue.suggestions.length > 0) {
          const suggestionEl = document.createElement('div');
          suggestionEl.className = 'audit-issue-suggestions';
          suggestionEl.style.marginTop = '4px';

          const span = document.createElement('span');
          span.style.fontSize = '0.85em';
          span.style.color = 'var(--vscode-charts-green)';
          span.textContent = `✨ Click to auto-fix -> ${issue.suggestions[0]}`;

          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.className = 'audit-best-suggestion';
          hiddenInput.value = issue.suggestions[0];

          suggestionEl.appendChild(span);
          suggestionEl.appendChild(hiddenInput);
          textEl.appendChild(suggestionEl);
        }

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

  const items = overlay.querySelectorAll('.audit-overlay-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const posStr = btn.getAttribute('data-pos');
      const typeStr = btn.querySelector('.audit-issue-type')?.classList[1]; // Gets 'link', 'image', 'heading'
      
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
        
        // Scroll into view using the same approach as search overlay
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
              // Last resort: just ensure the editor is focused
              editor.commands.focus();
            }
          });
        }
        
        const currentTarget = btn.querySelector('.audit-issue-target')?.textContent || '';
        const bestSuggestionInput = btn.querySelector('.audit-best-suggestion') as HTMLInputElement;
        
        let suggestionToApply = null;
        if (bestSuggestionInput && bestSuggestionInput.value) {
            suggestionToApply = bestSuggestionInput.value;
        } else {
            const userInput = prompt(`No auto-fix available. Fix broken ${typeStr}: Enter new value`, currentTarget);
            if (userInput !== null && userInput.trim() !== '') {
                suggestionToApply = userInput.trim();
            }
        }
        
        if (suggestionToApply) {
           // Get nodeSize
           let nodeSize = 2; 
           const node = editor.state.doc.nodeAt(pos);
           if (node) {
              nodeSize = node.nodeSize;
           }
           
           if (typeStr === 'image') {
              try {
                editor.chain().setNodeSelection(pos).updateAttributes('image', { src: suggestionToApply, 'markdown-src': suggestionToApply }).run();
              } catch(e) {
                editor.chain().setNodeSelection(pos).updateAttributes('customImage', { src: suggestionToApply, 'markdown-src': suggestionToApply }).run();
              }
           } else if (typeStr === 'link' || typeStr === 'heading') {
              const href = typeStr === 'heading' ? (suggestionToApply.startsWith('#') ? suggestionToApply : `#${suggestionToApply}`) : suggestionToApply;
              editor.chain().setTextSelection({ from: pos, to: pos + nodeSize }).setMark('link', { href }).run();
           }
           
           // Remove from list
           btn.remove();
           if (overlay.querySelectorAll('.audit-overlay-item').length === 0) {
              const list = overlay.querySelector('.audit-overlay-list');
              if (list) {
                list.innerHTML = `<div style="padding: 20px; text-align: center;">All fixed! 🎉</div>`;
              }
           }
        }
      }
    });
  });
}
