// src/features/whiteboard/components/Canvas/index.jsx

import React, { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { useSelector, useDispatch } from "react-redux";
import { store } from "../../../../store";
import {
  setCanvas,
  setSelectedObject,
  setSidebarMode,
  closeSidebar,
  setLayers,
  setZoom,
  pushHistory,
  setActiveTool,
  undo,
  redo,
} from "../../../../store/whiteboardSlice";

// ─── Unique ID helper ────────────────────────────────────────────────────────
const uid = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Arrow shape factory ──────────────────────────────────────────────────────
const createArrowGroup = (x1, y1, x2, y2, color, strokeWidth) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const headSize = Math.max(12, strokeWidth * 4);

  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth,
    selectable: false,
    evented: false,
  });

  const head = new fabric.Triangle({
    left: x2,
    top: y2,
    originX: "center",
    originY: "center",
    width: headSize,
    height: headSize,
    fill: color,
    angle: angle + 90,
    selectable: false,
    evented: false,
  });

  return new fabric.Group([line, head], {
    selectable: true,
    hasControls: true,
    hasBorders: true,
  });
};

const Canvas = () => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const dispatch = useDispatch();

  // Redux state for the UI/Tools
  const { activeTool, activeShape, penColor, penWidth } = useSelector(
    (state) => state.whiteboard,
  );

  // Drawing state refs (not store – no re-renders)
  const isDrawingRef = useRef(false);
  const shapeRef = useRef(null);
  const startPtRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const spaceHeldRef = useRef(false);

  // ─── Derive layer list from canvas objects ──────────────────────────────────
  const syncLayers = useCallback(
    (canvas) => {
      const objects = canvas.getObjects();
      const layers = objects.map((obj, i) => ({
        id: obj.id || `obj-${i}`,
        name: obj.customName || `${obj.type} ${i + 1}`,
        type: obj.type,
        visible: obj.visible !== false,
        locked: !!(obj.lockMovementX && obj.lockMovementY),
        object: obj,
      }));
      dispatch(setLayers([...layers].reverse())); // top-most first
    },
    [dispatch],
  );

  // ─── Save canvas state to history ───────────────────────────────────────────
  const saveHistory = useCallback(
    (canvas) => {
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

  // ─── Canvas initialisation (runs once) ──────────────────────────────────────
  useEffect(() => {
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      isDrawingMode: false,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "transparent", // handled by CSS dot-grid
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Free-draw brush defaults
    fabricCanvas.freeDrawingBrush.color = "#1e1e2e";
    fabricCanvas.freeDrawingBrush.width = 3;

    fabricRef.current = fabricCanvas;
    dispatch(setCanvas(fabricCanvas));

    // ── Selection events ──────────────────────────────────────────────────────
    fabricCanvas.on("selection:created", () => {
      const active = fabricCanvas.getActiveObject();
      if (active) {
        dispatch(setSelectedObject(active));
        dispatch(setSidebarMode("properties"));
      }
    });

    fabricCanvas.on("selection:updated", () => {
      const active = fabricCanvas.getActiveObject();
      if (active) dispatch(setSelectedObject(active));
    });

    fabricCanvas.on("selection:cleared", () => {
      dispatch(setSelectedObject(null));
      dispatch(closeSidebar());
    });

    // ── Object lifecycle events ───────────────────────────────────────────────
    fabricCanvas.on("object:modified", () => {
      syncLayers(fabricCanvas);
      saveHistory(fabricCanvas);
    });
    fabricCanvas.on("object:added", () => syncLayers(fabricCanvas));
    fabricCanvas.on("object:removed", () => {
      syncLayers(fabricCanvas);
      saveHistory(fabricCanvas);
    });

    // ── Free-draw path created ────────────────────────────────────────────────
    fabricCanvas.on("path:created", (e) => {
      const path = e.path;
      path.id = uid("path");
      path.customName = "Pen Path";
      syncLayers(fabricCanvas);
      saveHistory(fabricCanvas);
    });

    // ── Mouse wheel zoom ──────────────────────────────────────────────────────
    fabricCanvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = fabricCanvas.getZoom() * (delta > 0 ? 0.95 : 1.05);
      newZoom = Math.min(Math.max(newZoom, 0.08), 12);
      fabricCanvas.zoomToPoint(
        new fabric.Point(opt.e.offsetX, opt.e.offsetY),
        newZoom,
      );
      dispatch(setZoom(newZoom));
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // ── Panning with Alt + drag ───────────────────────────────────────────────
    fabricCanvas.on("mouse:down", (opt) => {
      if (opt.e.altKey || spaceHeldRef.current) {
        isPanningRef.current = true;
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = "grabbing";
        lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    });

    fabricCanvas.on("mouse:move", (opt) => {
      if (!isPanningRef.current) return;
      const vpt = fabricCanvas.viewportTransform;
      vpt[4] += opt.e.clientX - lastPosRef.current.x;
      vpt[5] += opt.e.clientY - lastPosRef.current.y;
      fabricCanvas.requestRenderAll();
      lastPosRef.current = { x: opt.e.clientX, y: opt.e.clientY };
    });

    fabricCanvas.on("mouse:up", () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        fabricCanvas.selection =
          store.getState().whiteboard.activeTool === "select";
        fabricCanvas.defaultCursor = "default";
      }
    });

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    const onKeyDown = (e) => {
      if (e.code === "Space") {
        spaceHeldRef.current = true;
        fabricCanvas.defaultCursor = "grab";
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        dispatch(undo());
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        dispatch(redo());
      }

      // Delete selected objects
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        document.activeElement.tagName !== "INPUT"
      ) {
        const active = fabricCanvas.getActiveObjects();
        if (active.length) {
          active.forEach((obj) => fabricCanvas.remove(obj));
          fabricCanvas.discardActiveObject();
          fabricCanvas.requestRenderAll();
        }
      }

      // Tool shortcuts
      const shortcuts = {
        v: "select",
        p: "pen",
        s: "shape",
        t: "text",
        n: "sticky",
        e: "eraser",
      };
      if (document.activeElement.tagName !== "INPUT" && shortcuts[e.key]) {
        dispatch(setActiveTool(shortcuts[e.key]));
      }
    };

    const onKeyUp = (e) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        fabricCanvas.defaultCursor = "default";
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ── Resize handler ────────────────────────────────────────────────────────
    const onResize = () => {
      fabricCanvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      fabricCanvas.requestRenderAll();
    };
    window.addEventListener("resize", onResize);

    // Record initial blank state
    saveHistory(fabricCanvas);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      fabricCanvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty – initialise once

  // ─── React to activeTool / penColor / penWidth changes ──────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Always reset drawing mode & cursor before applying tool
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.off("mouse:down:tool");
    canvas.off("mouse:move:tool");
    canvas.off("mouse:up:tool");

    // Named handlers so we can cleanly remove them
    let mdHandler, mmHandler, muHandler;

    const bind = () => {
      if (mdHandler) canvas.on("mouse:down", mdHandler);
      if (mmHandler) canvas.on("mouse:move", mmHandler);
      if (muHandler) canvas.on("mouse:up", muHandler);
    };

    switch (activeTool) {
      // ── SELECT ──────────────────────────────────────────────────────────────
      case "select": {
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";
        canvas
          .getObjects()
          .forEach((o) => o.set({ selectable: true, evented: true }));
        canvas.requestRenderAll();
        break;
      }

      // ── PEN ─────────────────────────────────────────────────────────────────
      case "pen": {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        canvas.freeDrawingBrush.color = penColor;
        canvas.freeDrawingBrush.width = penWidth;
        canvas.freeDrawingBrush.decimate = 2;
        canvas.defaultCursor = "crosshair";
        break;
      }

      // ── ERASER ──────────────────────────────────────────────────────────────
      case "eraser": {
        canvas.defaultCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='3' y='8' width='18' height='12' rx='2' fill='%23fff' stroke='%23999' stroke-width='1.5'/%3E%3Cline x1='9' y1='20' x2='9' y2='8' stroke='%23ec4899' stroke-width='1.5'/%3E%3C/svg%3E") 4 20, crosshair`;
        mdHandler = (opt) => {
          if (isPanningRef.current) return;
          const target = canvas.findTarget(opt.e);
          if (target) {
            canvas.remove(target);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }
        };
        bind();
        break;
      }

      // ── SHAPE ───────────────────────────────────────────────────────────────
      case "shape": {
        canvas.defaultCursor = "crosshair";
        const FILL = "rgba(99,102,241,0.12)";
        const STROKE = "#6366f1";
        const STROKE_W = 2;

        mdHandler = (opt) => {
          if (isPanningRef.current || opt.e.altKey) return;
          isDrawingRef.current = true;
          const ptr = canvas.getPointer(opt.e);
          startPtRef.current = { x: ptr.x, y: ptr.y };

          const base = {
            left: ptr.x,
            top: ptr.y,
            fill: FILL,
            stroke: STROKE,
            strokeWidth: STROKE_W,
            selectable: false,
            evented: false,
            id: uid("shape"),
            customName: activeShape,
          };

          let shape;
          switch (activeShape) {
            case "circle":
              shape = new fabric.Ellipse({ ...base, rx: 0, ry: 0 });
              break;
            case "triangle":
              shape = new fabric.Triangle({ ...base, width: 0, height: 0 });
              break;
            case "line":
              shape = new fabric.Line([ptr.x, ptr.y, ptr.x, ptr.y], {
                stroke: STROKE,
                strokeWidth: STROKE_W,
                selectable: false,
                evented: false,
                id: uid("line"),
                customName: "Line",
              });
              break;
            case "arrow":
              shape = null;
              break;
            case "diamond":
              shape = new fabric.Polygon(
                [
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                ],
                { ...base },
              );
              break;
            default:
              shape = new fabric.Rect({
                ...base,
                width: 0,
                height: 0,
                rx: 3,
                ry: 3,
              });
          }

          if (shape) {
            shapeRef.current = shape;
            canvas.add(shape);
          }
        };

        mmHandler = (opt) => {
          if (!isDrawingRef.current) return;
          const ptr = canvas.getPointer(opt.e);
          const start = startPtRef.current;
          const w = Math.abs(ptr.x - start.x);
          const h = Math.abs(ptr.y - start.y);
          const left = Math.min(ptr.x, start.x);
          const top = Math.min(ptr.y, start.y);

          if (!shapeRef.current && activeShape !== "arrow") return;

          switch (activeShape) {
            case "line":
              shapeRef.current.set({ x2: ptr.x, y2: ptr.y });
              break;
            case "circle":
              shapeRef.current.set({ rx: w / 2, ry: h / 2, left, top });
              break;
            case "diamond": {
              const hw = w / 2,
                hh = h / 2;
              shapeRef.current.set({
                points: [
                  { x: left + hw, y: top },
                  { x: left + w, y: top + hh },
                  { x: left + hw, y: top + h },
                  { x: left, y: top + hh },
                ],
                left,
                top,
                width: w,
                height: h,
              });
              break;
            }
            case "arrow":
              break;
            default:
              shapeRef.current.set({ left, top, width: w, height: h });
          }
          canvas.requestRenderAll();
        };

        muHandler = (opt) => {
          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;

          const ptr = canvas.getPointer(opt.e);
          const start = startPtRef.current;

          if (activeShape === "arrow") {
            const arrow = createArrowGroup(
              start.x,
              start.y,
              ptr.x,
              ptr.y,
              STROKE,
              STROKE_W,
            );
            arrow.id = uid("arrow");
            arrow.customName = "Arrow";
            canvas.add(arrow);
            canvas.setActiveObject(arrow);
          } else if (shapeRef.current) {
            shapeRef.current.set({ selectable: true, evented: true });
            canvas.setActiveObject(shapeRef.current);
          }

          shapeRef.current = null;
          syncLayers(canvas);
          saveHistory(canvas);
          canvas.requestRenderAll();
        };

        bind();
        break;
      }

      // ── TEXT ────────────────────────────────────────────────────────────────
      case "text": {
        canvas.defaultCursor = "text";
        mdHandler = (opt) => {
          if (isPanningRef.current || opt.e.altKey) return;
          if (opt.target?.type === "i-text") return;

          const ptr = canvas.getPointer(opt.e);
          const iText = new fabric.IText("Type here...", {
            left: ptr.x,
            top: ptr.y,
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 20,
            fill: "#1e1e2e",
            id: uid("text"),
            customName: "Text",
          });
          canvas.add(iText);
          canvas.setActiveObject(iText);
          iText.enterEditing();
          iText.selectAll();
          syncLayers(canvas);

          iText.on("editing:exited", () => saveHistory(canvas));
        };
        bind();
        break;
      }

      // ── STICKY NOTE ─────────────────────────────────────────────────────────
      case "sticky": {
        canvas.defaultCursor = "crosshair";
        const STICKY_COLORS = [
          "#fef08a",
          "#bbf7d0",
          "#bfdbfe",
          "#fecdd3",
          "#e9d5ff",
          "#fed7aa",
        ];

        mdHandler = (opt) => {
          if (isPanningRef.current || opt.e.altKey) return;
          const ptr = canvas.getPointer(opt.e);
          const color =
            STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];

          const sticky = new fabric.Textbox("Click to edit...", {
            left: ptr.x - 90,
            top: ptr.y - 80,
            width: 200,
            minHeight: 170,
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            fill: "#374151",
            backgroundColor: color,
            padding: 14,
            textAlign: "left",
            shadow: new fabric.Shadow({
              color: "rgba(0,0,0,0.14)",
              blur: 12,
              offsetX: 0,
              offsetY: 4,
            }),
            id: uid("sticky"),
            customName: "Sticky Note",
            customType: "sticky",
          });

          canvas.add(sticky);
          canvas.setActiveObject(sticky);
          syncLayers(canvas);
          saveHistory(canvas);

          // Auto-switch back to select after placing using dispatch
          dispatch(setActiveTool("select"));
        };
        bind();
        break;
      }

      default:
        break;
    }

    return () => {
      if (mdHandler) canvas.off("mouse:down", mdHandler);
      if (mmHandler) canvas.off("mouse:move", mmHandler);
      if (muHandler) canvas.off("mouse:up", muHandler);
    };
  }, [
    activeTool,
    activeShape,
    penColor,
    penWidth,
    syncLayers,
    saveHistory,
    dispatch,
  ]);

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
