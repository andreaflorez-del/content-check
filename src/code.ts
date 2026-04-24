/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 420, height: 328 });

interface TextLayer {
  id: string;
  name: string;
  characters: string;
}

function collectTextNodes(node: SceneNode): TextLayer[] {
  const results: TextLayer[] = [];

  if (node.type === 'TEXT') {
    results.push({
      id: node.id,
      name: node.name,
      characters: node.characters,
    });
    return results;
  }

  if ('children' in node) {
    for (const child of node.children) {
      results.push(...collectTextNodes(child));
    }
  }

  return results;
}

function sendLayers(): void {
  const selection = figma.currentPage.selection;
  const layers: TextLayer[] = [];

  for (const node of selection) {
    layers.push(...collectTextNodes(node));
  }

  figma.ui.postMessage({ type: 'LAYERS', layers });
}

// Flag set while we programmatically select a node for highlight.
// Prevents the resulting selectionchange from resetting the analysis in the UI.
let highlightInProgress = false;

// Send updated layers on every selection change
figma.on('selectionchange', () => {
  if (!highlightInProgress) {
    sendLayers();
  }
});

// Handle messages from UI
figma.ui.onmessage = async (msg: {
  type: string;
  layerId?: string;
  found?: string;
  newText?: string;
}) => {
  // UI is mounted and ready — send the current selection
  if (msg.type === 'READY') {
    sendLayers();
    return;
  }

  // Hover on issue card — highlight the layer without moving the viewport
  if (msg.type === 'HIGHLIGHT_LAYER' && msg.layerId) {
    const node = figma.getNodeById(msg.layerId);
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      highlightInProgress = true;
      figma.currentPage.selection = [node as SceneNode];
      // No viewport change — scrollAndZoomIntoView zooms in too aggressively
      // on small text nodes and pushes the frame out of view.
      setTimeout(() => { highlightInProgress = false; }, 100);
    }
    return;
  }

  // Apply recommended text to a layer
  if (msg.type === 'APPLY' && msg.layerId && msg.newText !== undefined) {
    const node = figma.getNodeById(msg.layerId);

    if (!node || node.type !== 'TEXT') {
      figma.ui.postMessage({
        type: 'APPLY_ERROR',
        layerId: msg.layerId,
        error: 'Node not found or not a text node',
      });
      return;
    }

    try {
      // Load every font variant used in this text node before editing
      const fontsToLoad = new Set<string>();
      for (let i = 0; i < node.characters.length; i++) {
        const fn = node.getRangeFontName(i, i + 1);
        if (fn !== figma.mixed) {
          fontsToLoad.add(JSON.stringify(fn));
        }
      }
      await Promise.all(
        [...fontsToLoad].map((f) => figma.loadFontAsync(JSON.parse(f) as FontName))
      );

      // Replace found text with recommended text, preserving the rest of the layer
      const found = msg.found ?? '';
      if (found && node.characters.includes(found)) {
        // String replace: swaps first occurrence of found → newText
        node.characters = node.characters.replace(found, msg.newText);
      } else {
        // Fallback: replace the entire layer text
        node.characters = msg.newText;
      }

      figma.ui.postMessage({ type: 'APPLY_SUCCESS', layerId: msg.layerId });
    } catch (err) {
      figma.ui.postMessage({
        type: 'APPLY_ERROR',
        layerId: msg.layerId,
        error: String(err),
      });
    }
    return;
  }

  if (msg.type === 'CLOSE') {
    figma.closePlugin();
  }
};
