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

let mockVscodeApi: { postMessage: jest.Mock };

describe('Audit Overlay UI', () => {
  let editor: Editor;

  beforeEach(() => {
    document.body.innerHTML = '<div id="editor"></div>';

    // Mock VS Code API so Browse button tests can assert postMessage calls
    mockVscodeApi = { postMessage: jest.fn() };
    (window as any).vscode = mockVscodeApi;

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
    delete (window as any).vscode;
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
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found',
        target: 'missing.md',
        suggestions: ['found.md'],
        pos: 1,
        nodeSize: 5,
      },
    ];

    // Initial HTML setup inside Tiptap
    editor.commands.setContent('<p><a href="missing.md">Text</a></p>', { emitUpdate: false });

    showAuditOverlay(editor, issues);

    const item = document.querySelector('.audit-overlay-item') as HTMLElement;
    const fixPill = document.querySelector('.audit-suggestion-pill') as HTMLButtonElement;

    expect(fixPill).not.toBeNull();

    // Clicking the item should simply navigate, but NOT alter the mark string.
    item.click();

    // Note: Our initial markup for href might be absolute due to link mark logic.
    // Check href update on fix
    fixPill.click();

    const html = editor.getHTML();
    expect(html).toContain('found.md');
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(0);
  });

  it('displays manual fix input when no suggestions exist', () => {
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found',
        target: 'missing.md',
        pos: 1,
        nodeSize: 5,
      },
    ];

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
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found',
        target: 'missing.md',
        pos: 1,
        nodeSize: 5,
      },
    ];

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
    const issues: AuditIssue[] = [
      {
        type: 'image',
        message: 'Image source not found',
        target: 'missing.png',
        suggestions: ['found.png'],
        pos: 1,
        nodeSize: 1,
      },
    ];

    editor.commands.setContent('<p><img src="missing.png" /></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);

    const fixPill = document.querySelector('.audit-suggestion-pill') as HTMLButtonElement;
    expect(fixPill).not.toBeNull();

    fixPill.click();

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
        nodeSize: 5,
      },
      {
        type: 'link',
        message: 'Another broken link',
        target: 'missing2.md',
        suggestions: ['found2.md'],
        pos: 10,
        nodeSize: 5,
      },
    ];

    editor.commands.setContent(
      '<p><a href="missing.md">Text</a><a href="missing2.md">Text2</a></p>',
      { emitUpdate: false }
    );
    showAuditOverlay(editor, issues);

    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(2);

    const fixPills = document.querySelectorAll('.audit-suggestion-pill');
    (fixPills[0] as HTMLButtonElement).click();

    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(1);
  });

  // ── NEW TESTS: Enhanced suggestions, Browse button, heading labels ───────────

  it('renders multiple suggestion pills when issue has multiple suggestions', () => {
    const issues: AuditIssue[] = [
      {
        type: 'image',
        message: 'Image file not found: missing.png',
        target: 'missing.png',
        suggestions: ['images/found-a.png', 'images/found-b.png', 'assets/found-c.png'],
        pos: 1,
        nodeSize: 1,
      },
    ];

    showAuditOverlay(editor, issues);

    const pills = document.querySelectorAll('.audit-suggestion-pill');
    expect(pills.length).toBe(3);
    expect(pills[0].textContent).toContain('found-a.png');
    expect(pills[1].textContent).toContain('found-b.png');
    expect(pills[2].textContent).toContain('found-c.png');
  });

  it('renders a Browse button for image issues (allows file picker)', () => {
    const issues: AuditIssue[] = [
      {
        type: 'image',
        message: 'Image file not found: missing.png',
        target: 'missing.png',
        pos: 1,
        nodeSize: 1,
      },
    ];

    showAuditOverlay(editor, issues);

    const browseBtn = document.querySelector('.audit-browse-btn') as HTMLButtonElement;
    expect(browseBtn).not.toBeNull();
    expect(browseBtn.textContent).toContain('Browse');
  });

  it('renders a Browse button for link issues (allows file picker)', () => {
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found: missing.md',
        target: 'missing.md',
        pos: 1,
        nodeSize: 5,
      },
    ];

    showAuditOverlay(editor, issues);

    const browseBtn = document.querySelector('.audit-browse-btn') as HTMLButtonElement;
    expect(browseBtn).not.toBeNull();
    expect(browseBtn.textContent).toContain('Browse');
  });

  it('sends auditPickFile message with correct type when Browse button clicked for image', () => {
    const issues: AuditIssue[] = [
      {
        type: 'image',
        message: 'Image file not found: missing.png',
        target: 'missing.png',
        pos: 1,
        nodeSize: 1,
      },
    ];

    showAuditOverlay(editor, issues);

    const browseBtn = document.querySelector('.audit-browse-btn') as HTMLButtonElement;
    browseBtn.click();

    expect(mockVscodeApi.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auditPickFile',
        fileType: 'image',
      })
    );
  });

  it('sends auditPickFile message with correct type when Browse button clicked for link', () => {
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found: missing.md',
        target: 'missing.md',
        pos: 1,
        nodeSize: 5,
      },
    ];

    showAuditOverlay(editor, issues);

    const browseBtn = document.querySelector('.audit-browse-btn') as HTMLButtonElement;
    browseBtn.click();

    expect(mockVscodeApi.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auditPickFile',
        fileType: 'any',
      })
    );
  });

  it('renders heading suggestions with a descriptive label (not just the raw slug)', () => {
    const issues: AuditIssue[] = [
      {
        type: 'heading',
        message: 'Heading anchor not found: #old-title',
        target: 'old-title',
        suggestions: ['new-title', 'revised-title'],
        pos: 1,
        nodeSize: 5,
      },
    ];

    showAuditOverlay(editor, issues);

    // Should show a friendly hint label above the suggestion pills
    const hintEl = document.querySelector('.audit-heading-hint');
    expect(hintEl).not.toBeNull();
    expect(hintEl!.textContent).toMatch(/revised|changed|updated|renamed/i);

    const pills = document.querySelectorAll('.audit-suggestion-pill');
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toContain('new-title');
  });

  it('clicking a suggestion pill applies the fix and removes the issue', () => {
    const issues: AuditIssue[] = [
      {
        type: 'link',
        message: 'Linked file not found: missing.md',
        target: 'missing.md',
        suggestions: ['found-a.md', 'found-b.md'],
        pos: 1,
        nodeSize: 5,
      },
    ];

    editor.commands.setContent('<p><a href="missing.md">Text</a></p>', { emitUpdate: false });
    showAuditOverlay(editor, issues);

    const firstPill = document.querySelector('.audit-suggestion-pill') as HTMLButtonElement;
    expect(firstPill).not.toBeNull();
    firstPill.click();

    const html = editor.getHTML();
    expect(html).toContain('found-a.md');
    expect(document.querySelectorAll('.audit-overlay-item').length).toBe(0);
  });

  it('does NOT render a Browse button for URL issues (heading type)', () => {
    const issues: AuditIssue[] = [
      {
        type: 'heading',
        message: 'Heading anchor not found: #missing',
        target: 'missing',
        pos: 1,
        nodeSize: 5,
      },
    ];

    showAuditOverlay(editor, issues);

    // heading issues are anchor-only – no file picker needed
    const browseBtn = document.querySelector('.audit-browse-btn');
    expect(browseBtn).toBeNull();
  });
});
