import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer2,
  Pen,
  Shapes,
  Type,
  StickyNote,
  Eraser,
  Circle,
  Square,
  Triangle,
  Minus,
  ArrowRight,
  Diamond,
  Minus as LineIcon,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  setActiveTool,
  setActiveShape,
  setPenColor,
  setPenWidth,
  undo,
  redo,
} from "../../../../store/whiteboardSlice";
import style from "./Toolbar.module.scss";

// ─── Tool button ─────────────────────────────────────────────────────────────
const ToolBtn = ({ icon: Icon, label, active, onClick, shortcut, danger }) => (
  <button
    onClick={onClick}
    title={`${label}${shortcut ? ` (${shortcut})` : ""}`}
    className={`${style.toolBtn} ${active ? style.toolBtnActive : ""} ${
      danger ? style.toolBtnDanger : ""
    }`}
  >
    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
    {/* Active indicator pip */}
    {active && <span className={style.pip} />}
  </button>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = () => <div className={style.divider} />;

// ─── Shape picker sub-menu ───────────────────────────────────────────────────
const ShapeSubmenu = ({ activeShape, onSelect, onClose }) => {
  const shapes = [
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Ellipse" },
    { id: "triangle", icon: Triangle, label: "Triangle" },
    { id: "diamond", icon: Diamond, label: "Diamond" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
  ];

  return (
    <div
      className={style.submenu}
      style={{ minWidth: "148px" }}
    >
      <p className={style.submenuTitle}>
        Shape
      </p>
      <div className={style.shapeGrid}>
        {shapes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              onSelect(id);
              onClose();
            }}
            title={label}
            className={`${style.shapeBtn} ${
                activeShape === id ? style.shapeBtnActive : ""
              }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Pen settings sub-menu ───────────────────────────────────────────────────
const PEN_COLORS = [
  "#1e1e2e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
  "#94a3b8",
];
const PEN_WIDTHS = [1, 2, 3, 5, 8, 12];

const PenSubmenu = ({
  penColor,
  penWidth,
  onColorChange,
  onWidthChange,
  onClose,
}) => (
  <div
    className={style.submenu}
    style={{ minWidth: "172px" }}
  >
    <p className={style.submenuTitle}>
      Color
    </p>
    <div className={style.colorGrid}>
      {PEN_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className={`${style.colorBtn} ${
            penColor === c ? style.colorBtnActive : ""
          }`}
          style={{
            backgroundColor: c,
            border:
              c === "#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none",
          }}
        />
      ))}
    </div>

    <p className={style.submenuTitle}>
      Width
    </p>
    <div className={style.widthGrid}>
      {PEN_WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => onWidthChange(w)}
          className={`${style.widthBtn} ${
            penWidth === w ? style.widthBtnActive : ""
          }`}
        >
          {w}
        </button>
      ))}
    </div>

    {/* Preview stroke */}
    <div className={style.strokePreviewContainer}>
      <div
        className={style.strokePreview}
        style={{
          width: Math.min(penWidth * 8, 100),
          height: penWidth,
          backgroundColor: penColor,
        }}
      />
    </div>
  </div>
);

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
const Toolbar = () => {
  const {
    activeTool,
    activeShape,
    penColor,
    penWidth,
    canvas,
    history,
    historyIndex,
  } = useSelector((state) => state.whiteboard);
  const dispatch = useDispatch();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showPenMenu, setShowPenMenu] = useState(false);
  const shapeRef = useRef(null);
  const penRef = useRef(null);

  // Close submenus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (shapeRef.current && !shapeRef.current.contains(e.target))
        setShowShapeMenu(false);
      if (penRef.current && !penRef.current.contains(e.target))
        setShowPenMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClearAll = () => {
    if (!canvas) return;
    if (window.confirm("Clear the entire board? This cannot be undone.")) {
      canvas.clear();
      canvas.backgroundColor = "transparent";
      canvas.requestRenderAll();
    }
  };

  // Shape icon to display on the shape button
  const shapeIconMap = {
    rect: Square,
    circle: Circle,
    triangle: Triangle,
    diamond: Diamond,
    line: LineIcon,
    arrow: ArrowRight,
  };
  const ActiveShapeIcon = shapeIconMap[activeShape] || Square;

  return (
    <div className={style.toolbarWrapper}>
      <div className={style.toolbarPanel}>
        {/* ── Select ── */}
        <ToolBtn
          icon={MousePointer2}
          label="Select"
          shortcut="V"
          active={activeTool === "select"}
          onClick={() => dispatch(setActiveTool("select"))}
        />

        <Divider />

        {/* ── Pen ── */}
        <div ref={penRef} className="relative">
          <ToolBtn
            icon={Pen}
            label="Pen"
            shortcut="P"
            active={activeTool === "pen"}
            onClick={() => {
              dispatch(setActiveTool("pen"));
              setShowPenMenu((p) => !p);
              setShowShapeMenu(false);
            }}
          />
          {showPenMenu && activeTool === "pen" && (
            <PenSubmenu
              penColor={penColor}
              penWidth={penWidth}
              onColorChange={(c) => dispatch(setPenColor(c))}
              onWidthChange={(w) => dispatch(setPenWidth(w))}
              onClose={() => setShowPenMenu(false)}
            />
          )}
        </div>

        {/* ── Shapes ── */}
        <div ref={shapeRef} className="relative">
          <ToolBtn
            icon={activeTool === "shape" ? ActiveShapeIcon : Shapes}
            label="Shape"
            shortcut="S"
            active={activeTool === "shape"}
            onClick={() => {
              dispatch(setActiveTool("shape"));
              setShowShapeMenu((p) => !p);
              setShowPenMenu(false);
            }}
          />
          {showShapeMenu && (
            <ShapeSubmenu
              activeShape={activeShape}
              onSelect={(s) => dispatch(setActiveShape(s))}
              onClose={() => setShowShapeMenu(false)}
            />
          )}
        </div>

        {/* ── Text ── */}
        <ToolBtn
          icon={Type}
          label="Text"
          shortcut="T"
          active={activeTool === "text"}
          onClick={() => {
            dispatch(setActiveTool("text"));
            setShowShapeMenu(false);
            setShowPenMenu(false);
          }}
        />

        {/* ── Sticky Note ── */}
        <ToolBtn
          icon={StickyNote}
          label="Sticky Note"
          shortcut="N"
          active={activeTool === "sticky"}
          onClick={() => {
            dispatch(setActiveTool("sticky"));
            setShowShapeMenu(false);
            setShowPenMenu(false);
          }}
        />

        {/* ── Eraser ── */}
        <ToolBtn
          icon={Eraser}
          label="Eraser"
          shortcut="E"
          active={activeTool === "eraser"}
          onClick={() => {
            dispatch(setActiveTool("eraser"));
            setShowShapeMenu(false);
            setShowPenMenu(false);
          }}
        />

        <Divider />

        {/* ── Undo ── */}
        <ToolBtn
          icon={Undo2}
          label="Undo"
          shortcut="Ctrl+Z"
          active={canUndo}
          onClick={() => dispatch(undo())}
        />

        {/* ── Redo ── */}
        <ToolBtn
          icon={Redo2}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          active={canRedo}
          onClick={() => dispatch(redo())}
        />

        <Divider />

        {/* ── Clear All ── */}
        <ToolBtn
          icon={Trash2}
          label="Clear Board"
          active={false}
          danger
          onClick={handleClearAll}
        />
      </div>

      {/* Keyboard hint */}
      <p className={style.keyboardHint}>
        Alt + drag to pan
      </p>
    </div>
  );
};

export default Toolbar;
