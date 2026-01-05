---
name: Document Audit Feature
overview: Add a toolbar button that audits the current markdown document for broken links (files, URLs, headings), broken images, and other issues. Results are displayed as inline highlights with a summary panel for navigation and auto-fix actions.
todos:
  - id: extract-items
    content: Extract links, images, and headings from ProseMirror document in auditDocument.ts
    status: pending
  - id: file-validation
    content: Implement file existence check via extension message handler
    status: pending
    dependencies:
      - extract-items
  - id: heading-validation
    content: Implement heading slug validation using buildOutlineFromEditor
    status: pending
    dependencies:
      - extract-items
  - id: decorations-plugin
    content: Create ProseMirror decoration plugin for inline highlighting of broken items
    status: pending
    dependencies:
      - extract-items
  - id: toolbar-button
    content: Add 'Audit' button to toolbar in BubbleMenuView.ts
    status: pending
  - id: summary-panel
    content: Create audit summary panel component with categorized issue list
    status: pending
    dependencies:
      - extract-items
  - id: navigation
    content: Implement click-to-navigate from panel to item in document
    status: pending
    dependencies:
      - summary-panel
      - decorations-plugin
  - id: url-validation
    content: Implement async URL validation with fetch HEAD requests
    status: pending
    dependencies:
      - extract-items
  - id: auto-fix
    content: Implement auto-fix suggestions (fuzzy matching, case correction, slug fixes)
    status: pending
    dependencies:
      - file-validation
      - heading-validation
  - id: styling
    content: Add CSS styles for audit decorations and summary panel
    status: pending
    dependencies:
      - decorations-plugin
      - summary-panel
  - id: testing
    content: Write unit and integration tests for audit functionality
    status: pending
    dependencies:
      - extract-items
      - file-validation
      - heading-validation
      - url-validation
---

# Document Audit Feature

## 1. Task Metadata

- **Task name:** Document Audit Feature
- **Slug:** document-audit
- **Status:** planned
- **Created:** 2025-01-XX
- **Last updated:** 2025-01-XX
- **Shipped:** *(pending)*

---

## 2. Context & Problem

**Current state:**

- No way to detect broken links, images, or invalid references in markdown documents
- Users discover broken links/images only when clicking them or exporting
- No automated validation of file paths, URLs, or heading anchors
- Manual checking is tedious for long documents

**Pain points:**

- **Silent failures:** Broken links/images don't show errors until clicked
- **Export issues:** PDF/Word exports fail silently when images are missing
- **Refactoring risk:** Renaming files or headings breaks links with no warning
- **User frustration:** Users must manually verify every link/image in large documents
- **No auto-fix:** Even when issues are found, users must fix them manually

**Why it matters:**

- **Quality assurance:** Catch broken references before sharing/exporting documents
- **Refactoring confidence:** Safe to rename files/headings when you can see what breaks
- **Professional output:** Broken links in exported PDFs/Word docs look unprofessional
- **User trust:** Proactive issue detection builds confidence in the editor

---

## 3. Desired Outcome & Scope

**Success criteria:**

- Click toolbar "Audit" button → scans current document for broken items
- Broken items highlighted inline with visual indicators (red underline/border)
- Summary panel shows categorized list of issues (Links, Images, Headings)
- Click issue in panel → navigates to item in document
- Auto-fix suggests corrections for common issues (file path typos, case sensitivity)
- URL validation runs async (doesn't block UI)
- Audit completes in <2 seconds for typical documents (<5000 lines)

**In scope:**

- **Link validation:**
  - File links: Check if referenced file exists in workspace
  - URL links: Validate URL format, optionally check HTTP status (async)
  - Heading links: Check if `#heading-slug` exists in current document
- **Image validation:**
  - Check if image file exists at specified path
  - Validate image path format (relative paths from document)
- **Inline highlighting:**
  - Use ProseMirror decorations to highlight broken items
  - Visual distinction: red underline for links, red border for images
- **Summary panel:**
  - Categorized list (Broken Links, Broken Images, Invalid Headings)
  - Click to navigate to item
  - Actions: Remove, Auto-fix (where applicable)
- **Auto-fix suggestions:**
  - File path typos: Suggest closest matching file
  - Case sensitivity: Suggest correct case
  - Heading slug mismatches: Suggest correct slug

**Out of scope:**

- Workspace-wide audit (only current file)
- Real-time validation (on-demand only, button-driven)
- Fixing cross-file references (only validates, doesn't update other files)
- Network timeout handling for URLs (use default browser timeout)
- Validating markdown syntax errors (only validates references)

---

## 4. UX & Behavior

**Entry point:**

- Toolbar button: "Audit" icon (shield/checkmark icon) in formatting toolbar
- Position: After "Export settings" button, before final separator
- Keyboard shortcut: None (intentional - avoid accidental triggers)

**User flow:**

### Flow 1: Basic Audit

1. User clicks "Audit" button in toolbar
2. Button shows loading state (spinner icon)
3. Editor scans document for links, images, headings
4. Validates each item:

   - File links: Check file existence via `vscode.workspace.fs.stat()`
   - URLs: Validate format, optionally fetch HTTP status (async)
   - Heading links: Extract headings, generate slugs, check if target exists
   - Images: Check file existence

5. Broken items highlighted inline (red decorations)
6. Summary panel appears at bottom of editor showing:
   ```
   Audit Results (3 issues found)
   
   Broken Links (2)
   • [Getting Started](./docs/getting-started.md) - File not found
   • [API Docs](https://example.com/api) - 404 Not Found
   
   Broken Images (1)
   • ![Screenshot](./images/screenshot.png) - File not found
   ```

7. User clicks issue in panel → editor scrolls to item, highlights it
8. User can click "Remove" to delete broken link/image
9. User can click "Fix" to see auto-fix suggestions (if available)

### Flow 2: Auto-fix

1. User clicks "Fix" on broken file link
2. System searches workspace for similar filenames
3. Shows dialog: "Did you mean `./docs/getting-started-v2.md`?"
4. User confirms → link updated automatically
5. Highlight removed, issue removed from panel

### Flow 3: URL Validation

1. User clicks "Audit"
2. System finds external URL: `https://example.com/api`
3. URL validation runs in background (async)
4. Panel shows: "Checking URL..." initially
5. After 2 seconds: "404 Not Found" or "✓ Valid" appears
6. Broken URLs highlighted inline

**Visual states:**

- **Loading:** Button shows spinner, panel shows "Scanning document..."
- **No issues:** Panel shows "✓ No issues found" (green checkmark)
- **Issues found:** Panel shows categorized list with counts
- **Highlighting:** 
  - Broken links: Red wavy underline (similar to spell-check)
  - Broken images: Red dashed border
  - Invalid headings: Red wavy underline on link text

**Panel behavior:**

- Appears at bottom of editor (fixed position, scrollable if many issues)
- Auto-closes when user clicks outside or presses Escape
- Stays open while audit is active (allows navigation between issues)
- Updates in real-time as URL checks complete (async)

---

## 5. Technical Plan

**Architecture:**

```
Toolbar Button (BubbleMenuView.ts)
  ↓ Click
Audit Feature (auditDocument.ts)
  ↓ Extract items from ProseMirror doc
  ↓ Validate each item (file existence, URL, heading slugs)
  ↓ Create ProseMirror decorations for broken items
  ↓ Show summary panel with results
```

**Key files:**

1. **`src/webview/features/auditDocument.ts`** (NEW)

   - Main audit logic
   - Extract links, images, headings from ProseMirror document
   - Validate each item
   - Create ProseMirror decorations for highlighting
   - Generate summary panel HTML
   - Handle navigation and auto-fix actions

2. **`src/webview/BubbleMenuView.ts`** (MODIFY)

   - Add "Audit" button to toolbar
   - Position after "Export settings" button
   - Icon: `shield` or `check` codicon

3. **`src/webview/editor.ts`** (MODIFY)

   - Wire up audit button action
   - Handle audit results message from extension (for file existence checks)
   - Register ProseMirror plugin for audit decorations

4. **`src/editor/MarkdownEditorProvider.ts`** (MODIFY)

   - Add `handleAuditRequest` message handler
   - Check file existence for relative paths
   - Return validation results to webview

5. **`src/webview/editor.css`** (MODIFY)

   - Styles for audit decorations (red underline, red border)
   - Styles for audit summary panel
   - Loading states

**Implementation details:**

### Link Extraction

- Traverse ProseMirror document using `doc.descendants()`
- Find all nodes with `link` mark (TipTap Link extension)
- Extract `href` attribute and text range
- Categorize: file path (starts with `./` or `../`), URL (starts with `http://` or `https://`), heading (starts with `#`)

### Image Extraction

- Find all `image` nodes in document
- Extract `src` attribute and node position
- Check if path is relative (not `http://`, `https://`, `data:`, `vscode-webview://`)

### Heading Validation

- Use existing `buildOutlineFromEditor()` from `src/webview/utils/outline.ts`
- Generate slugs for all headings (GFM-style)
- For heading links (`#slug`), check if slug exists in heading set
- Handle duplicate slugs (e.g., `#heading`, `#heading-1`)

### File Existence Check

- Extension side: Use `vscode.workspace.fs.stat()` for relative paths
- Resolve path relative to current document location
- Handle workspace root, relative paths, absolute paths
- Return boolean: exists or not

### URL Validation

- Webview side: Use `fetch()` with `HEAD` request (lightweight)
- Timeout: 5 seconds
- Handle CORS errors gracefully (show "Cannot verify" instead of error)
- Async: Don't block audit completion, update panel as results arrive

### ProseMirror Decorations

- Use `Decoration.inline()` for broken links (similar to search overlay)
- Use `Decoration.node()` for broken images (wrap image node)
- Plugin key: `auditPluginKey` (similar to `searchPluginKey`)
- Clear decorations when audit panel closes

### Auto-fix Logic

- File path typos: Use fuzzy matching on workspace filenames
- Case sensitivity: Check case-insensitive match, suggest correct case
- Heading slugs: If heading text matches but slug differs, suggest correct slug
- Show confirmation dialog before applying fix

**Performance considerations:**

- **Debounce:** No debounce needed (button-driven, not real-time)
- **Async URL checks:** Run in parallel, don't block UI
- **File checks:** Batch requests to extension, use Promise.all()
- **Decoration updates:** Batch all decorations in single transaction
- **Limit results:** Show max 50 issues in panel (scrollable)

---

## 6. Work Breakdown

- [ ] **Phase 1: Core Audit Logic**
  - [ ] Create `auditDocument.ts` with item extraction (links, images, headings)
  - [ ] Implement file existence check (extension message handler)
  - [ ] Implement heading slug validation
  - [ ] Add ProseMirror decoration plugin for highlighting
  - [ ] Unit tests for extraction and validation logic

- [ ] **Phase 2: UI Components**
  - [ ] Add "Audit" button to toolbar (`BubbleMenuView.ts`)
  - [ ] Create audit summary panel component
  - [ ] Implement navigation (click issue → scroll to item)
  - [ ] Add loading states and animations
  - [ ] CSS styling for decorations and panel

- [ ] **Phase 3: URL Validation**
  - [ ] Implement async URL validation (fetch HEAD requests)
  - [ ] Handle CORS and timeout errors gracefully
  - [ ] Update panel as URL checks complete
  - [ ] Show "Checking..." state for pending URLs

- [ ] **Phase 4: Auto-fix**
  - [ ] Implement fuzzy file matching for typos
  - [ ] Implement case sensitivity suggestions
  - [ ] Implement heading slug correction
  - [ ] Create confirmation dialog for fixes
  - [ ] Apply fixes to document (update ProseMirror nodes)

- [ ] **Phase 5: Polish & Testing**
  - [ ] Integration tests for full audit flow
  - [ ] Manual testing with various document types
  - [ ] Performance testing (large documents, many links)
  - [ ] Accessibility testing (keyboard navigation, screen readers)
  - [ ] Error handling edge cases

---

## 7. Implementation Log

*(To be filled during implementation)*

---

## 8. Decisions & Tradeoffs

**Button-driven vs. Real-time:**

- **Chosen:** Button-driven (on-demand)
- **Why:** Performance - real-time validation would slow down typing/editing
- **Tradeoff:** Users must remember to run audit (acceptable for quality check workflow)

**Inline highlighting vs. Sidebar only:**

- **Chosen:** Inline highlighting + summary panel
- **Why:** Best of both worlds - visual feedback in document + organized list
- **Tradeoff:** More complex implementation (decorations + panel)

**Async URL validation:**

- **Chosen:** Background fetch with progressive updates
- **Why:** Don't block audit completion, show results as they arrive
- **Tradeoff:** Panel updates dynamically (acceptable UX)

**Current file only vs. Workspace-wide:**

- **Chosen:** Current file only
- **Why:** Performance and scope - workspace audit would be much slower
- **Tradeoff:** Users must audit each file separately (acceptable for focused workflow)

---

## 9. Follow-up & Future Work

- **Workspace-wide audit:** Command to audit all markdown files in workspace
- **Real-time validation:** Optional setting to validate links as you type (with debounce)
- **Auto-fix on save:** Option to auto-fix common issues before saving
- **Export validation:** Run audit automatically before PDF/Word export
- **Broken link detection in other files:** Check if current file's links point to files that exist elsewhere in workspace
- **Backlink detection:** Show which other files link to current file (reverse audit)

---

## Quick Reference

**Key patterns to reuse:**

- Search overlay decorations (`src/webview/features/searchOverlay.ts`)
- Image highlighting (`src/webview/extensions/imageEnterSpacing.ts`)
- File existence checks (`src/editor/MarkdownEditorProvider.ts` - image handling)
- Heading extraction (`src/webview/utils/outline.ts`)

**Testing checklist:**

- [ ] Document with no issues (should show "✓ No issues found")
- [ ] Document with broken file link
- [ ] Document with broken URL (404, timeout, CORS error)
- [ ] Document with broken heading link
- [ ] Document with broken image
- [ ] Document with all issue types
- [ ] Large document (5000+ lines, 100+ links)
- [ ] Auto-fix suggestions (typo, case sensitivity, heading slug)