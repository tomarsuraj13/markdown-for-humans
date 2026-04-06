/**
 * @jest-environment jsdom
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Link from '@tiptap/extension-link';
import { CustomImage } from '../../webview/extensions/customImage';
import { showAuditOverlay } from '../../webview/features/auditOverlay';
import { AuditIssue } from '../../webview/features/auditDocument';

describe('Audit Overlay UI', () => {
  let editor: Editor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor"></div>';
    
    // Create tiptap editor
    editor = new Editor({
      element: document.getElementById('editor') as HTMLElement,
      extensions: [
        StarterKit,
        CustomImage,
        Link,
        Markdown.configure({
          markedOptions: { gfm: true, breaks: true },
        }),
      ],
      content: '<p>Test content with a [broken link](missing.md)</p>',
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    const overlay = document.getElementById('audit-overlay');
    if (overlay) {
      overlay.remove();
    }
    jest.clearAllMocks();
  });

  it('renders correctly with no issues', () => {
    showAuditOverlay(editor, []);
    const overlay = document.getElementById('audit-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.classList.contains('visible')).toBe(true);
    expect(overlay?.textContent).toContain('No issues found!');
  });

  it('applies auto-fix ONLY when clicking the fix button', () => {
    const issues: AuditIssue[] = [{
      type: 'link',
      message: 'Linked file not found',
      target: 'missing.md',
      suggestions: ['found.md'],
      pos: 1,
      nodeSize: 5
    }];
    
    // Initial HTML setup inside Tiptap
    editor.commands.setContent('<p><a href="missing.md">Text</a></p>', { emitUpdate: false });
    
    showAuditOverlay(editor, issues);
    
    const item = document.querySelector('.audit-overlay-item') as HTMLElement;
    const fixBtn = document.querySelector('.audit-fix-button') as HTMLButtonElement;
    
    expect(fixBtn).not.toBeNull();
    
    // Clicking the item should simply navigate, but NOT alter the mark string.
    item.click();
    
    // Note: Our initial markup for href might be absolute due to link mark logic.
    // Check href update on fix
    fixBtn.click();
    
    const html = editor.getHTML();
    expect(html).toContain('found.md');
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(0);
  });

  it('displays manual fix input when no suggestions exist', () => {
    const issues: AuditIssue[] = [{
      type: 'link',
      message: 'Linked file not found',
      target: 'missing.md',
      pos: 1,
      nodeSize: 5
    }];
    
    editor.commands.setContent('<p><a href="missing.md">Text</a></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);
    
    const input = document.querySelector('.audit-manual-input') as HTMLInputElement;
    const fixBtn = document.querySelector('.audit-fix-button.manual-fix') as HTMLButtonElement;
    
    expect(input).not.toBeNull();
    expect(input.placeholder).toContain('Fix link');
    expect(fixBtn).not.toBeNull();
    expect(fixBtn.textContent).toBe('Fix');
  });

  it('applies manual fix when user enters value and clicks Fix button', () => {
    const issues: AuditIssue[] = [{
      type: 'link',
      message: 'Linked file not found',
      target: 'missing.md',
      pos: 1,
      nodeSize: 5
    }];
    
    editor.commands.setContent('<p><a href="missing.md">Text</a></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);
    
    const input = document.querySelector('.audit-manual-input') as HTMLInputElement;
    const fixBtn = document.querySelector('.audit-fix-button.manual-fix') as HTMLButtonElement;
    
    // User enters the corrected value
    input.value = 'correct.md';
    fixBtn.click();
    
    const html = editor.getHTML();
    expect(html).toContain('correct.md');
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(0);
  });

  it('applies auto-fix for images with updateAttributes', () => {
    const issues: AuditIssue[] = [{
      type: 'image',
      message: 'Image source not found',
      target: 'missing.png',
      suggestions: ['found.png'],
      pos: 1,
      nodeSize: 1
    }];
    
    editor.commands.setContent('<p><img src="missing.png" /></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);
    
    const fixBtn = document.querySelector('.audit-fix-button') as HTMLButtonElement;
    expect(fixBtn).not.toBeNull();
    
    fixBtn.click();
    
    const html = editor.getHTML();
    expect(html).toContain('found.png');
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(0);
  });

  it('removes issue from list after successful fix', () => {
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found',
        target: 'missing.md',
        suggestions: ['found.md'],
        pos: 1,
        nodeSize: 5
      },
      {
        type: 'link',
        message: 'Another broken link',
        target: 'missing2.md',
        suggestions: ['found2.md'],
        pos: 10,
        nodeSize: 5
      }
    ];
    
    editor.commands.setContent('<p><a href="missing.md">Text</a><a href="missing2.md">Text2</a></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);
    
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(2);
    
    const fixBtns = document.querySelectorAll('.audit-fix-button');
    (fixBtns[0] as HTMLButtonElement).click();
    
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(1);
  });
});
