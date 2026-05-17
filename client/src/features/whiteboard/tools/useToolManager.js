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
  const lastPtRef = useRef({ x: 0, y: 0 });

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
          const target = opt.target || canvas.findTarget?.(opt.e);
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

        mdHandler = (opt) => {
          if (opt.e.altKey) return;
          isDrawingRef.current = true;
          const ptr = canvas.getScenePoint(opt.e);
          startPtRef.current = { x: ptr.x, y: ptr.y };
          lastPtRef.current = { x: ptr.x, y: ptr.y };

          const baseConfig = {
            left: ptr.x,
            top: ptr.y,
            fill: "transparent",
            stroke: penColor,
            strokeWidth: penWidth,
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
          else if (activeShape === "circle")
            shapeRef.current = new fabric.Ellipse({
              ...baseConfig,
              rx: 0,
              ry: 0,
            });
          else if (activeShape === "triangle")
            shapeRef.current = new fabric.Triangle({
              ...baseConfig,
              width: 0,
              height: 0,
            });
          else if (activeShape === "diamond")
            shapeRef.current = new fabric.Polygon([
              { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }
            ], {
              ...baseConfig,
            });
          else if (activeShape === "line" || activeShape === "arrow")
            shapeRef.current = new fabric.Line([ptr.x, ptr.y, ptr.x, ptr.y], {
              ...baseConfig,
            });

          if (shapeRef.current) canvas.add(shapeRef.current);
        };

        mmHandler = (opt) => {
          if (!isDrawingRef.current || !shapeRef.current) return;
          const ptr = canvas.getScenePoint(opt.e);
          lastPtRef.current = { x: ptr.x, y: ptr.y };
          const start = startPtRef.current;

          const w = Math.abs(ptr.x - start.x);
          const h = Math.abs(ptr.y - start.y);

          if (activeShape === "rect" || activeShape === "triangle") {
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
          } else if (activeShape === "diamond") {
            shapeRef.current.set({
              width: w,
              height: h,
              left: Math.min(ptr.x, start.x),
              top: Math.min(ptr.y, start.y),
              points: [
                { x: w / 2, y: 0 },
                { x: w, y: h / 2 },
                { x: w / 2, y: h },
                { x: 0, y: h / 2 },
              ],
            });
          } else if (activeShape === "line" || activeShape === "arrow") {
            shapeRef.current.set({ x2: ptr.x, y2: ptr.y });
          }
          canvas.requestRenderAll();
        };

        muHandler = () => {
          if (!isDrawingRef.current) return;
          isDrawingRef.current = false;
          
          if (activeShape === "arrow" && shapeRef.current) {
            canvas.remove(shapeRef.current);
            const arrow = createArrowGroup(
              startPtRef.current.x, 
              startPtRef.current.y, 
              lastPtRef.current.x, 
              lastPtRef.current.y, 
              penColor, 
              penWidth
            );
            arrow.set({ id: uid("arrow"), customName: "arrow", selectable: true, evented: true });
            canvas.add(arrow);
            shapeRef.current = arrow;
          } else if (shapeRef.current) {
            shapeRef.current.set({ selectable: true, evented: true });
          }
          
          if (shapeRef.current) {
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
            fill: penColor,
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

      case "sticky":
        canvas.defaultCursor = "crosshair";
        mdHandler = (opt) => {
          if (opt.target || opt.e.altKey) return;
          const ptr = canvas.getScenePoint(opt.e);
          
          const SIZE = 150;
          const rect = new fabric.Rect({
            width: SIZE,
            height: SIZE,
            fill: penColor,
            rx: 8,
            ry: 8,
            originX: "center",
            originY: "center",
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.2)',
              blur: 10,
              offsetX: 2,
              offsetY: 4
            })
          });

          const text = new fabric.Textbox("Type here", {
            width: SIZE - 20,
            fontSize: 18,
            fontFamily: '"DM Sans", sans-serif',
            fill: "#ffffff",
            textAlign: "center",
            originX: "center",
            originY: "center",
            splitByGrapheme: true
          });

          const group = new fabric.Group([rect, text], {
            left: ptr.x - SIZE / 2,
            top: ptr.y - SIZE / 2,
            id: uid("sticky"),
            customName: "Sticky Note"
          });

          canvas.add(group);
          canvas.setActiveObject(group);
          syncLayers(canvas);
          saveHistory(canvas);

          // Handle double-click to edit
          group.on("mousedblclick", () => {
            // Hide inner text
            text.visible = false;
            canvas.requestRenderAll();

            // Create standalone editable textbox
            const groupMatrix = group.calcTransformMatrix();
            const textMatrix = text.calcTransformMatrix();
            const absoluteMatrix = fabric.util.multiplyTransformMatrices(groupMatrix, textMatrix);
            const opt = fabric.util.qrDecompose(absoluteMatrix);

            const editableText = new fabric.Textbox(text.text, {
              left: opt.translateX - (text.width * opt.scaleX) / 2,
              top: opt.translateY - (text.height * opt.scaleY) / 2,
              width: text.width,
              fontSize: text.fontSize * opt.scaleY,
              fontFamily: text.fontFamily,
              fill: text.fill,
              textAlign: text.textAlign,
              scaleX: 1,
              scaleY: 1,
              splitByGrapheme: true,
              backgroundColor: "transparent",
            });

            canvas.add(editableText);
            canvas.setActiveObject(editableText);
            editableText.enterEditing();
            editableText.selectAll();

            editableText.on("editing:exited", () => {
              text.set({ text: editableText.text });
              text.visible = true;
              canvas.remove(editableText);
              canvas.setActiveObject(group);
              canvas.requestRenderAll();
              saveHistory(canvas);
            });
          });
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
