import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette, Pencil, Layers, AlignLeft, AlignCenter, AlignRight,
  ChevronUp, ChevronDown, Lock, Unlock, Trash2, RotateCcw,
  Bold, Italic,
} from 'lucide-react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
 
// ─── Color swatch palette ────────────────────────────────────────────────────
const SWATCHES = [
  'transparent','#ffffff','#f1f5f9','#94a3b8','#475569','#1e293b','#0f172a',
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899',
  'rgba(99,102,241,0.15)','rgba(236,72,153,0.15)','rgba(34,197,94,0.15)',
  'rgba(245,158,11,0.15)','rgba(239,68,68,0.15)',
];
 
const ColorPicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
 
  return (
    <div className="relative">
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
        {label}
      </label>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
      >
        <span
          className="w-5 h-5 rounded-md flex-shrink-0 border border-white/15"
          style={{
            backgroundColor: value === 'transparent' ? 'transparent' : value,
            backgroundImage: value === 'transparent'
              ? 'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)'
              : undefined,
            backgroundSize: value === 'transparent' ? '8px 8px' : undefined,
            backgroundPosition: value === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
          }}
        />
        <span className="text-xs text-gray-300 font-mono flex-1 text-left">
          {value === 'transparent' ? 'None' : value}
        </span>
      </button>
 
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl bg-[#0f0f1a] border border-white/10 shadow-2xl">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={`w-6 h-6 rounded-md border transition-all hover:scale-110 ${
                  value === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0f0f1a]' : 'border-white/10'
                }`}
                style={{
                  backgroundColor: c === 'transparent' ? 'transparent' : c,
                  backgroundImage: c === 'transparent'
                    ? 'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)'
                    : undefined,
                  backgroundSize: c === 'transparent' ? '8px 8px' : undefined,
                  backgroundPosition: c === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                }}
              />
            ))}
          </div>
          <input
            type="color"
            value={value.startsWith('#') ? value : '#6366f1'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-7 rounded-md cursor-pointer bg-transparent border border-white/10"
          />
        </div>
      )}
    </div>
  );
};
 
// ─── Slider control ──────────────────────────────────────────────────────────
const SliderControl = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</label>
      <span className="text-xs text-gray-400 font-mono">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-indigo-500 cursor-pointer"
    />
  </div>
);
 
// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div className="mb-4">
    <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold mb-2 px-1">{title}</p>
    <div className="space-y-3">{children}</div>
  </div>
);
 
// ─── Main PropertiesPanel ─────────────────────────────────────────────────────
const PropertiesPanel = () => {
  const { canvas, selectedObject, setSelectedObject } = useWhiteboardStore();
  const [, forceRender] = useState(0);
 
  const refresh = useCallback(() => forceRender((n) => n + 1), []);
 
  // Re-render when selected object changes externally
  useEffect(() => {
    if (!selectedObject) return;
    selectedObject.on('modified', refresh);
    return () => selectedObject.off('modified', refresh);
  }, [selectedObject, refresh]);
 
  if (!selectedObject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <Palette size={28} className="text-gray-600 mb-3" />
        <p className="text-gray-500 text-sm font-medium">No object selected</p>
        <p className="text-gray-600 text-xs mt-1">Click an object on the canvas to edit its properties</p>
      </div>
    );
  }
 
  const obj  = selectedObject;
  const type = obj.type; // rect, circle, i-text, textbox, path, group, line, ellipse, triangle, polygon
 
  const update = (props) => {
    if (!canvas || !obj) return;
    obj.set(props);
    canvas.requestRenderAll();
  };
 
  const isText    = ['i-text', 'textbox'].includes(type);
  const isGroup   = type === 'group';
  const hasStroke = !['i-text', 'textbox'].includes(type);
  const hasFill   = !['line'].includes(type);
  const isLocked  = !!(obj.lockMovementX && obj.lockMovementY);
 
  const toggleLock = () => {
    const lock = !isLocked;
    update({
      lockMovementX: lock, lockMovementY: lock,
      lockRotation: lock, lockScalingX: lock, lockScalingY: lock,
      hasControls: !lock, selectable: true, evented: true,
    });
    refresh();
  };
 
  const deleteObject = () => {
    if (!canvas || !obj) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    setSelectedObject(null);
    canvas.requestRenderAll();
  };
 
  const bringForward  = () => { canvas.bringForward(obj);  canvas.requestRenderAll(); };
  const sendBackward  = () => { canvas.sendBackwards(obj); canvas.requestRenderAll(); };
  const bringToFront  = () => { canvas.bringToFront(obj);  canvas.requestRenderAll(); };
  const sendToBack    = () => { canvas.sendToBack(obj);    canvas.requestRenderAll(); };
 
  return (
    <div className="p-3 overflow-y-auto h-full">
      {/* ── Object type badge ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-medium capitalize">
            {obj.customName || type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLock}
            title={isLocked ? 'Unlock' : 'Lock'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            onClick={deleteObject}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
 
      {/* ── Fill ── */}
      {hasFill && !isText && (
        <Section title="Fill">
          <ColorPicker
            label="Fill Color"
            value={obj.fill || 'transparent'}
            onChange={(v) => update({ fill: v })}
          />
        </Section>
      )}
 
      {/* ── Text fill ── */}
      {isText && (
        <Section title="Text">
          <ColorPicker
            label="Text Color"
            value={obj.fill || '#1e1e2e'}
            onChange={(v) => update({ fill: v })}
          />
          <SliderControl
            label="Font Size"
            value={Math.round(obj.fontSize || 18)}
            min={8} max={120} step={1}
            onChange={(v) => update({ fontSize: v })}
          />
          {/* Font style toggles */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">Style</label>
            <div className="flex gap-1">
              {[
                { Icon: Bold,   prop: 'fontWeight', onVal: 'bold',   offVal: 'normal', label: 'Bold'   },
                { Icon: Italic, prop: 'fontStyle',  onVal: 'italic', offVal: 'normal', label: 'Italic' },
              ].map(({ Icon, prop, onVal, offVal, label }) => (
                <button
                  key={label}
                  title={label}
                  onClick={() => update({ [prop]: obj[prop] === onVal ? offVal : onVal })}
                  className={`p-2 rounded-lg transition-all text-sm ${
                    obj[prop] === onVal
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
          {/* Text align */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">Align</label>
            <div className="flex gap-1">
              {[
                { Icon: AlignLeft,   val: 'left'   },
                { Icon: AlignCenter, val: 'center' },
                { Icon: AlignRight,  val: 'right'  },
              ].map(({ Icon, val }) => (
                <button
                  key={val}
                  onClick={() => update({ textAlign: val })}
                  className={`p-2 rounded-lg transition-all flex-1 ${
                    obj.textAlign === val
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={13} className="mx-auto" />
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}
 
      {/* ── Stroke ── */}
      {hasStroke && (
        <Section title="Stroke">
          <ColorPicker
            label="Stroke Color"
            value={obj.stroke || 'transparent'}
            onChange={(v) => update({ stroke: v })}
          />
          <SliderControl
            label="Stroke Width"
            value={obj.strokeWidth ?? 0}
            min={0} max={20} step={0.5}
            onChange={(v) => update({ strokeWidth: v })}
          />
        </Section>
      )}
 
      {/* ── Opacity ── */}
      <Section title="Appearance">
        <SliderControl
          label="Opacity"
          value={Math.round((obj.opacity ?? 1) * 100)}
          min={0} max={100} step={1}
          unit="%"
          onChange={(v) => update({ opacity: v / 100 })}
        />
        {/* Corner radius for rects */}
        {type === 'rect' && (
          <SliderControl
            label="Corner Radius"
            value={obj.rx ?? 0}
            min={0} max={60} step={1}
            onChange={(v) => update({ rx: v, ry: v })}
          />
        )}
      </Section>
 
      {/* ── Transform ── */}
      <Section title="Transform">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'X', val: Math.round(obj.left  || 0) },
            { label: 'Y', val: Math.round(obj.top   || 0) },
            { label: 'W', val: Math.round(obj.getScaledWidth()  || 0) },
            { label: 'H', val: Math.round(obj.getScaledHeight() || 0) },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/8">
              <span className="text-[10px] text-gray-500 font-medium w-3">{label}</span>
              <span className="text-xs text-gray-300 font-mono">{val}</span>
            </div>
          ))}
        </div>
        <SliderControl
          label="Rotation"
          value={Math.round(obj.angle || 0)}
          min={0} max={360} step={1}
          unit="°"
          onChange={(v) => update({ angle: v })}
        />
      </Section>
 
      {/* ── Layer order ── */}
      <Section title="Layer Order">
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'To Front', icon: ChevronUp,   action: bringToFront },
            { label: 'To Back',  icon: ChevronDown, action: sendToBack   },
            { label: 'Forward',  icon: Layers,      action: bringForward },
            { label: 'Backward', icon: RotateCcw,   action: sendBackward },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};
 
export default PropertiesPanel;