import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2, Pen, Shapes, Type, StickyNote,
  Eraser, Circle, Square, Triangle, Minus,
  ArrowRight, Diamond, Minus as LineIcon,
  Undo2, Redo2, Trash2,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
 
// ─── Tool button ─────────────────────────────────────────────────────────────
const ToolBtn = ({ icon: Icon, label, active, onClick, shortcut, danger }) => (
  <button
    onClick={onClick}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    className={`
      relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150
      ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-95'
        : danger
          ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
          : 'text-gray-400 hover:bg-white/8 hover:text-white'
      }
    `}
  >
    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
    {/* Active indicator pip */}
    {active && (
      <span className="absolute -right-0.5 -top-0.5 w-2 h-2 bg-indigo-400 rounded-full ring-2 ring-[#0f0f14]" />
    )}
  </button>
);
 
// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = () => (
  <div className="w-6 h-px bg-white/10 mx-auto my-1" />
);
 
// ─── Shape picker sub-menu ───────────────────────────────────────────────────
const ShapeSubmenu = ({ activeShape, onSelect, onClose }) => {
  const shapes = [
    { id: 'rect',     icon: Square,    label: 'Rectangle' },
    { id: 'circle',   icon: Circle,    label: 'Ellipse'   },
    { id: 'triangle', icon: Triangle,  label: 'Triangle'  },
    { id: 'diamond',  icon: Diamond,   label: 'Diamond'   },
    { id: 'line',     icon: Minus,     label: 'Line'      },
    { id: 'arrow',    icon: ArrowRight, label: 'Arrow'    },
  ];
 
  return (
    <div
      className="absolute left-full top-0 ml-3 p-2 rounded-xl bg-[#1a1a2a] border border-white/10 shadow-2xl z-50"
      style={{ minWidth: '148px' }}
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium px-2 pb-1.5">Shape</p>
      <div className="grid grid-cols-3 gap-1">
        {shapes.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { onSelect(id); onClose(); }}
            title={label}
            className={`
              flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all text-[10px]
              ${activeShape === id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:bg-white/8 hover:text-white'
              }
            `}
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
  '#1e1e2e', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#94a3b8',
];
const PEN_WIDTHS = [1, 2, 3, 5, 8, 12];
 
const PenSubmenu = ({ penColor, penWidth, onColorChange, onWidthChange, onClose }) => (
  <div
    className="absolute left-full top-0 ml-3 p-3 rounded-xl bg-[#1a1a2a] border border-white/10 shadow-2xl z-50"
    style={{ minWidth: '172px' }}
  >
    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-2">Color</p>
    <div className="grid grid-cols-5 gap-1.5 mb-3">
      {PEN_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${
            penColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1a1a2a]' : ''
          }`}
          style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.2)' : 'none' }}
        />
      ))}
    </div>
 
    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-2">Width</p>
    <div className="flex items-center gap-1.5 flex-wrap">
      {PEN_WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => onWidthChange(w)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all text-xs font-mono
            ${penWidth === w ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
          {w}
        </button>
      ))}
    </div>
 
    {/* Preview stroke */}
    <div className="mt-3 flex items-center justify-center py-2 bg-white/5 rounded-lg">
      <div
        className="rounded-full transition-all"
        style={{ width: Math.min(penWidth * 8, 100), height: penWidth, backgroundColor: penColor }}
      />
    </div>
  </div>
);
 
// ─── Main Toolbar ─────────────────────────────────────────────────────────────
const Toolbar = () => {
  const {
    activeTool, setActiveTool,
    activeShape, setActiveShape,
    penColor, setPenColor,
    penWidth, setPenWidth,
    canvas, undo, redo,
    canUndo, canRedo,
  } = useWhiteboardStore();
 
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showPenMenu,   setShowPenMenu]   = useState(false);
  const shapeRef  = useRef(null);
  const penRef    = useRef(null);
 
  // Close submenus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (shapeRef.current && !shapeRef.current.contains(e.target)) setShowShapeMenu(false);
      if (penRef.current   && !penRef.current.contains(e.target))   setShowPenMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  const handleClearAll = () => {
    if (!canvas) return;
    if (window.confirm('Clear the entire board? This cannot be undone.')) {
      canvas.clear();
      canvas.backgroundColor = 'transparent';
      canvas.requestRenderAll();
    }
  };
 
  // Shape icon to display on the shape button
  const shapeIconMap = {
    rect: Square, circle: Circle, triangle: Triangle,
    diamond: Diamond, line: LineIcon, arrow: ArrowRight,
  };
  const ActiveShapeIcon = shapeIconMap[activeShape] || Square;
 
  return (
    <div
      className="absolute left-4 top-1/2 -translate-y-1/2 z-50"
      style={{ userSelect: 'none' }}
    >
      <div
        className="flex flex-col items-center gap-1 p-2 rounded-2xl border border-white/10 shadow-2xl"
        style={{
          background: 'rgba(15,15,20,0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* ── Select ── */}
        <ToolBtn
          icon={MousePointer2}
          label="Select"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
        />
 
        <Divider />
 
        {/* ── Pen ── */}
        <div ref={penRef} className="relative">
          <ToolBtn
            icon={Pen}
            label="Pen"
            shortcut="P"
            active={activeTool === 'pen'}
            onClick={() => {
              setActiveTool('pen');
              setShowPenMenu((p) => !p);
              setShowShapeMenu(false);
            }}
          />
          {showPenMenu && activeTool === 'pen' && (
            <PenSubmenu
              penColor={penColor}
              penWidth={penWidth}
              onColorChange={setPenColor}
              onWidthChange={setPenWidth}
              onClose={() => setShowPenMenu(false)}
            />
          )}
        </div>
 
        {/* ── Shapes ── */}
        <div ref={shapeRef} className="relative">
          <ToolBtn
            icon={activeTool === 'shape' ? ActiveShapeIcon : Shapes}
            label="Shape"
            shortcut="S"
            active={activeTool === 'shape'}
            onClick={() => {
              setActiveTool('shape');
              setShowShapeMenu((p) => !p);
              setShowPenMenu(false);
            }}
          />
          {showShapeMenu && (
            <ShapeSubmenu
              activeShape={activeShape}
              onSelect={setActiveShape}
              onClose={() => setShowShapeMenu(false)}
            />
          )}
        </div>
 
        {/* ── Text ── */}
        <ToolBtn
          icon={Type}
          label="Text"
          shortcut="T"
          active={activeTool === 'text'}
          onClick={() => {
            setActiveTool('text');
            setShowShapeMenu(false);
            setShowPenMenu(false);
          }}
        />
 
        {/* ── Sticky Note ── */}
        <ToolBtn
          icon={StickyNote}
          label="Sticky Note"
          shortcut="N"
          active={activeTool === 'sticky'}
          onClick={() => {
            setActiveTool('sticky');
            setShowShapeMenu(false);
            setShowPenMenu(false);
          }}
        />
 
        {/* ── Eraser ── */}
        <ToolBtn
          icon={Eraser}
          label="Eraser"
          shortcut="E"
          active={activeTool === 'eraser'}
          onClick={() => {
            setActiveTool('eraser');
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
          active={false}
          onClick={undo}
        />
 
        {/* ── Redo ── */}
        <ToolBtn
          icon={Redo2}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          active={false}
          onClick={redo}
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
      <p className="text-center text-[9px] text-gray-600 mt-2 font-mono tracking-wide">
        Alt + drag to pan
      </p>
    </div>
  );
};
 
export default Toolbar;