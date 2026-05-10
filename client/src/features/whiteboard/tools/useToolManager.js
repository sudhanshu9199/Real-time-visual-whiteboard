import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useDispatch, useSelector } from "react-redux";
import {
  setActiveTool,
  setSelectedObject,
} from "../../../store/whiteboardSlice";
import { uid, createArrowGroup } from "../utils/canvasHelpers"; // Assuming you move helpers here

export const useToolManager = (canvas, syncLayers, saveHistory) => {
  const dispatch = useDispatch();
  const { activeTool, activeShape, penColor, penWidth } = useSelector(
    (state) => state.whiteboard,
  );

  const isDrawingRef = useRef(false);
  const shapeRef = useRef(null);
  const startPtRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvas) return;

    // Reset canvas state before applying new tool
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");

    let mdHandler, mmHandler, muHandler;

    const bindEvents = () => {
      if (mdHandler) canvas.on("mouse:down", mdHandler);
      if (mmHandler) canvas.on("mouse:move", mmHandler);
      if (muHandler) canvas.on("mouse:up", muHandler);
    };

    switch (activeTool) {
      case "select":
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas
          .getObjects()
          .forEach((o) => o.set({ selectable: true, evented: true }));
        canvas.requestRenderAll();
        break;

      case "pen":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = penColor;
        canvas.freeDrawingBrush.width = penWidth;
        canvas.defaultCursor = "crosshair";
        break;

      case "eraser":
        canvas.defaultCursor = "crosshair"; // Can use custom SVG cursor here
        mdHandler = (opt) => {
          const target = canvas.findTarget(opt.e);
          if (target) {
            canvas.remove(target);
            canvas.discardActiveObject();
            saveHistory(canvas);
          }
        };
        bindEvents();
        break;

      case "shape":
        canvas.defaultCursor = "crosshair";
        const FILL = "rgba(99,102,241,0.12)";
        const STROKE = "#6366f1";

        mdHandler = (opt) => {
          if (opt.e.altKey) return;
          isDrawingRef.current = true;
          const ptr = canvas.getScenePoint(opt.e);
          startPtRef.current = { x: ptr.x, y: ptr.y };

          const baseConfig = {
            left: ptr.x,
            top: ptr.y,
            fill: FILL,
            stroke: STROKE,
            strokeWidth: 2,
            selectable: false,
            evented: false,
            id: uid("shape"),
            customName: activeShape,
          };

          if (activeShape === "rect")
            shapeRef.current = new fabric.Rect({
              ...baseConfig,
              width: 0,
              height: 0,
            });
          if (activeShape === "circle")
            shapeRef.current = new fabric.Ellipse({
              ...baseConfig,
              rx: 0,
              ry: 0,
            });
          // Add other shapes as needed...

          if (shapeRef.current) canvas.add(shapeRef.current);
        };

        mmHandler = (opt) => {
          if (!isDrawingRef.current || !shapeRef.current) return;
          const ptr = canvas.getScenePoint(opt.e);
          const start = startPtRef.current;

          const w = Math.abs(ptr.x - start.x);
          const h = Math.abs(ptr.y - start.y);

          if (activeShape === "rect") {
            shapeRef.current.set({
              width: w,
              height: h,
              left: Math.min(ptr.x, start.x),
              top: Math.min(ptr.y, start.y),
            });
          } else if (activeShape === "circle") {
            shapeRef.current.set({
              rx: w / 2,
              ry: h / 2,
              left: Math.min(ptr.x, start.x),
              top: Math.min(ptr.y, start.y),
            });
          }
          canvas.requestRenderAll();
        };

        muHandler = () => {
          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;
          if (shapeRef.current) {
            shapeRef.current.set({ selectable: true, evented: true });
            canvas.setActiveObject(shapeRef.current);
          }
          shapeRef.current = null;
          syncLayers(canvas);
          saveHistory(canvas);
        };
        bindEvents();
        break;

      case "text":
        canvas.defaultCursor = "text";
        mdHandler = (opt) => {
          if (opt.target?.type === "i-text" || opt.e.altKey) return;
          const ptr = canvas.getScenePoint(opt.e);
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
        bindEvents();
        break;
    }

    // Cleanup listeners on tool change
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
    canvas,
    dispatch,
    saveHistory,
    syncLayers,
  ]);
};
