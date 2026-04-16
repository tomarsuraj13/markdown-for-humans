/**
 * @jest-environment jsdom
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DraggableBlocks } from '../../webview/extensions/draggableBlocks';

describe('DraggableBlocks Extension', () => {
  let editor: Editor;

  const createEditor = (initialContent: string = '') => {
    return new Editor({
      extensions: [
        StarterKit,
        DraggableBlocks,
      ],
      content: initialContent,
    });
  };

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe('Keyboard shortcuts (Alt+Up/Down)', () => {
    it('moves block up', () => {
      editor = createEditor('<p>Block 1</p><p>Block 2</p><p>Block 3</p>');
      
      // Set selection to Block 2
      editor.commands.setTextSelection(12); // inside "Block 2"
      
      const moved = editor.commands.moveBlockUp();
      expect(moved).toBe(true);
      
      expect(editor.getHTML()).toBe('<p>Block 2</p><p>Block 1</p><p>Block 3</p>');
    });

    it('moves block down', () => {
      editor = createEditor('<p>Block 1</p><p>Block 2</p><p>Block 3</p>');
      
      // Set selection to Block 2
      editor.commands.setTextSelection(12); // inside "Block 2"
      
      const moved = editor.commands.moveBlockDown();
      expect(moved).toBe(true);
      
      expect(editor.getHTML()).toBe('<p>Block 1</p><p>Block 3</p><p>Block 2</p>');
    });

    it('does not move block up if it is the first block', () => {
      editor = createEditor('<p>Block 1</p><p>Block 2</p>');
      editor.commands.setTextSelection(3); // inside "Block 1"
      
      const moved = editor.commands.moveBlockUp();
      expect(moved).toBe(false);
      
      expect(editor.getHTML()).toBe('<p>Block 1</p><p>Block 2</p>');
    });

    it('does not move block down if it is the last block', () => {
      editor = createEditor('<p>Block 1</p><p>Block 2</p>');
      editor.commands.setTextSelection(16); // inside "Block 2"
      
      const moved = editor.commands.moveBlockDown();
      expect(moved).toBe(false);
      
      expect(editor.getHTML()).toBe('<p>Block 1</p><p>Block 2</p>');
    });
  });

  describe('Drag and Drop API via Plugin', () => {
    it('should register DraggableBlocks extension', () => {
      editor = createEditor('<p>Block 1</p>');
      expect(editor.extensionManager.extensions.some(e => e.name === 'draggableBlocks')).toBe(true);
    });
  });
});
