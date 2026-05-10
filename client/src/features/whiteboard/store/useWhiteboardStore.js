// useWhiteboardStore.js

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Central Zustand store for the Realtime Visual Whiteboard.
 * Uses subscribeWithSelector middleware to allow fine-grained subscriptions
 * from child components without causing unnecessary re-renders.
 */
const useWhiteboardStore = create(
  subscribeWithSelector((set, get) => ({
    // ─── Canvas Instance
    canvas: null,
    setCanvas: (canvas) => set({ canvas }),

    // ─── Active Tool ────────────────────────────────────────────────────────────
    // Possible values: 'select' | 'pen' | 'shape' | 'text' | 'sticky' | 'eraser'
    activeTool: 'select',
    setActiveTool: (tool) => set({ activeTool: tool }),

    // ─── Shape Sub-tool ─────────────────────────────────────────────────────────
    // Possible values: 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'diamond'
    activeShape: 'rect',
    setActiveShape: (shape) => set({ activeShape: shape }),

    // ─── Pen / Drawing Settings ─────────────────────────────────────────────────
    penColor: '#1e1e2e',
    setPenColor: (color) => {
      set({ penColor: color });
      const { canvas } = get();
      if (canvas?.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
        canvas.renderAll();
      }
    },
    penWidth: 3,
    setPenWidth: (width) => {
      set({ penWidth: width });
      const { canvas } = get();
      if (canvas?.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = width;
      }
    },

    // ─── Selected Object ────────────────────────────────────────────────────────
    selectedObject: null,
    setSelectedObject: (obj) => set({ selectedObject: obj }),

    // ─── Sidebar State ──────────────────────────────────────────────────────────
    isSidebarOpen: false,
    sidebarMode: 'properties', // 'properties' | 'ai' | 'layers'
    setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    setSidebarMode: (mode) => set({ sidebarMode: mode, isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),

    // ─── Layers ─────────────────────────────────────────────────────────────────
    layers: [],
    setLayers: (layers) => set({ layers }),

    // ─── Viewport / Zoom ────────────────────────────────────────────────────────
    zoom: 1,
    setZoom: (zoom) => set({ zoom: parseFloat(zoom.toFixed(2)) }),

    // ─── Board Metadata ─────────────────────────────────────────────────────────
    boardName: 'Untitled Board',
    setBoardName: (name) => set({ boardName: name }),

    // ─── Active Collaborators (mock – replace with Socket.io in production) ─────
    activeUsers: [
      { id: 'u1', name: 'You',       initials: 'YO', color: '#6366f1' },
      { id: 'u2', name: 'Alex Kim',  initials: 'AK', color: '#ec4899' },
      { id: 'u3', name: 'Sam Lee',   initials: 'SL', color: '#f59e0b' },
    ],

    // ─── Undo / Redo History ────────────────────────────────────────────────────
    history: [],
    historyIndex: -1,
    isReplaying: false, // prevents re-recording during undo/redo

    pushHistory: (snapshot) => {
      const { history, historyIndex, isReplaying } = get();
      if (isReplaying) return;
      const trimmed = history.slice(0, historyIndex + 1);
      trimmed.push(snapshot);
      const bounded = trimmed.slice(-60); // max 60 states
      set({ history: bounded, historyIndex: bounded.length - 1 });
    },

    undo: () => {
      const { canvas, history, historyIndex } = get();
      if (!canvas || historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      set({ isReplaying: true });
      canvas.loadFromJSON(history[newIndex], () => {
        canvas.renderAll();
        set({ historyIndex: newIndex, isReplaying: false });
      });
    },

    redo: () => {
      const { canvas, history, historyIndex } = get();
      if (!canvas || historyIndex >= history.length - 1) return;
      const newIndex = historyIndex + 1;
      set({ isReplaying: true });
      canvas.loadFromJSON(history[newIndex], () => {
        canvas.renderAll();
        set({ historyIndex: newIndex, isReplaying: false });
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // ─── Share Modal ─────────────────────────────────────────────────────────────
    isShareModalOpen: false,
    setShareModalOpen: (open) => set({ isShareModalOpen: open }),
  }))
);

export { useWhiteboardStore };