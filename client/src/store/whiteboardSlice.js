import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  canvas: null,
  activeTool: "select",
  activeShape: "rect",
  penColor: "#1e1e2e",
  penWidth: 3,
  selectedObject: null,
  isSidebarOpen: false,
  sidebarMode: "properties",
  layers: [],
  zoom: 1,
  boardName: "Untitled Board",
  activeUsers: [
    { id: "u1", name: "You", initials: "YO", color: "#6366f1" },
    { id: "u2", name: "Alex Kim", initials: "AK", color: "#ec4899" },
  ],
  history: [],
  historyIndex: -1,
  isReplaying: false,
  isShareModalOpen: false,
};

const whiteboardSlice = createSlice({
  name: "whiteboard",
  initialState,
  reducers: {
    setCanvas: (state, action) => {
      state.canvas = action.payload;
    },
    setBoardName: (state, action) => {
      state.boardName = action.payload;
    },
    setActiveTool: (state, action) => {
      state.activeTool = action.payload;
    },
    setActiveShape: (state, action) => {
      state.activeShape = action.payload;
    },
    setPenColor: (state, action) => {
      state.penColor = action.payload;
      if (state.canvas?.freeDrawingBrush)
        state.canvas.freeDrawingBrush.color = action.payload;
    },
    setPenWidth: (state, action) => {
      state.penWidth = action.payload;
      if (state.canvas?.freeDrawingBrush)
        state.canvas.freeDrawingBrush.width = action.payload;
    },
    setSelectedObject: (state, action) => {
      state.selectedObject = action.payload;
    },
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    setSidebarMode: (state, action) => {
      state.sidebarMode = action.payload;
      state.isSidebarOpen = true;
    },
    closeSidebar: (state) => {
      state.isSidebarOpen = false;
    },
    setLayers: (state, action) => {
      state.layers = action.payload;
    },
    setZoom: (state, action) => {
      state.zoom = action.payload;
    },
    setIsReplaying: (state, action) => {
      state.isReplaying = action.payload;
    },
    setHistoryIndex: (state, action) => {
      state.historyIndex = action.payload;
    },
    pushHistory: (state, action) => {
      if (state.isReplaying) return;
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      trimmed.push(action.payload);
      state.history = trimmed.slice(-60); // Keep last 60 states
      state.historyIndex = state.history.length - 1;
    },
  },
});

export const {
  setCanvas,
  setBoardName,
  setActiveTool,
  setActiveShape,
  setPenColor,
  setPenWidth,
  setSelectedObject,
  setSidebarOpen,
  setSidebarMode,
  closeSidebar,
  setLayers,
  setZoom,
  setIsReplaying,
  setHistoryIndex,
  pushHistory,
} = whiteboardSlice.actions;

// 🔄 Thunks for Undo/Redo logic
export const undo = () => async (dispatch, getState) => {
  const { canvas, history, historyIndex } = getState().whiteboard;
  if (!canvas || historyIndex <= 0) return;
  const newIndex = historyIndex - 1;
  dispatch(setIsReplaying(true));
  canvas.isReplaying = true;
  await canvas.loadFromJSON(history[newIndex]);
  canvas.renderAll();
  canvas.isReplaying = false;
  dispatch(setHistoryIndex(newIndex));
  dispatch(setIsReplaying(false));
};

export const redo = () => async (dispatch, getState) => {
  const { canvas, history, historyIndex } = getState().whiteboard;
  if (!canvas || historyIndex >= history.length - 1) return;
  const newIndex = historyIndex + 1;
  dispatch(setIsReplaying(true));
  canvas.isReplaying = true;
  await canvas.loadFromJSON(history[newIndex]);
  canvas.renderAll();
  canvas.isReplaying = false;
  dispatch(setHistoryIndex(newIndex));
  dispatch(setIsReplaying(false));
};

export default whiteboardSlice.reducer;
