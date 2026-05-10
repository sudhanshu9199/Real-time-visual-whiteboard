import { configureStore } from "@reduxjs/toolkit";
import whiteboardReducer from "./whiteboardSlice";

export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // ⚠️ Redux expects simple strings/objects. Fabric.js canvas objects are complex.
        // This tells Redux NOT to throw warnings for storing our Canvas instance.
        ignoredPaths: [
          "whiteboard.canvas",
          "whiteboard.selectedObject",
          "whiteboard.layers",
        ],
        ignoredActions: [
          "whiteboard/setCanvas",
          "whiteboard/setSelectedObject",
          "whiteboard/setLayers",
        ],
      },
    }),
});
