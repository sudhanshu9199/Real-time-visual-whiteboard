// src/features/whiteboard/components/Canvas/index.jsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import * as fabric from "fabric";
import { useDispatch } from "react-redux";

import { useToolManager } from "../../tools/useToolManager";

import {
  setCanvas,
  setLayers,
  pushHistory,
} from "../../../../store/whiteboardSlice";

import { store } from "../../../../store";

const Canvas = () => {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);

  const dispatch = useDispatch();

  // ─────────────────────────────────────────────
  // Sync Layers
  // ─────────────────────────────────────────────
  const syncLayers = useCallback(
    (canvas) => {
      if (!canvas) return;

      const layers = canvas.getObjects().map((obj, i) => ({
        id: obj.id || `obj-${i}`,
        name: obj.customName || `${obj.type} ${i + 1}`,
        type: obj.type,
        visible: obj.visible !== false,
        locked: !!(obj.lockMovementX && obj.lockMovementY),
        object: obj,
      }));

      dispatch(setLayers([...layers].reverse()));
    },
    [dispatch],
  );

  // ─────────────────────────────────────────────
  // Save History
  // ─────────────────────────────────────────────
  const saveHistory = useCallback(
    (canvas) => {
      if (!canvas || canvas.isReplaying) return;

      if (!store.getState().whiteboard.isReplaying) {
        dispatch(
          pushHistory(
            JSON.stringify(canvas.toJSON(["id", "customName", "customType"])),
          ),
        );
      }
    },
    [dispatch],
  );

  // ─────────────────────────────────────────────
  // Canvas Initialization
  // ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,

      preserveObjectStacking: true,

      selection: true,
      backgroundColor: "transparent",

      stopContextMenu: true,
      fireRightClick: true,
    });

    // Pencil Brush Default
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = "#1e1e2e";
    canvas.freeDrawingBrush.width = 3;

    setFabricCanvas(canvas);

    dispatch(setCanvas(canvas));

    // ─────────────────────────────────────────
    // Canvas Events
    // ─────────────────────────────────────────

    canvas.on("object:modified", () => {
      syncLayers(canvas);
      saveHistory(canvas);
    });

    canvas.on("object:added", () => {
      syncLayers(canvas);
    });

    canvas.on("object:removed", () => {
      syncLayers(canvas);
      saveHistory(canvas);
    });

    // ─────────────────────────────────────────
    // Resize Handler
    // ─────────────────────────────────────────

    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      canvas.requestRenderAll();
    };

    window.addEventListener("resize", handleResize);

    // Initial history snapshot
    saveHistory(canvas);

    // ─────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────

    return () => {
      window.removeEventListener("resize", handleResize);

      canvas.dispose();
    };
  }, [dispatch, saveHistory, syncLayers]);

  // ─────────────────────────────────────────────
  // Tool Manager Hook
  // ─────────────────────────────────────────────
  useToolManager(fabricCanvas, syncLayers, saveHistory);

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0 overflow-hidden canvas-dot-grid"
      style={{ cursor: "default" }}
    >
      <canvas ref={canvasRef} id="whiteboard-canvas" />
    </div>
  );
};

export default Canvas;
