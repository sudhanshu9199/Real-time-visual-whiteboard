import React, { useCallback } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  Trash2, Type, Square, Circle, Minus, Pen,
  StickyNote, Triangle, Layers, Group,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setLayers, setSelectedObject } from '../../../../store/whiteboardSlice';
import * as fabric from 'fabric';
 
// ─── Type → icon map ─────────────────────────────────────────────────────────
const TYPE_ICONS = {
  rect:     Square,
  circle:   Circle,
  ellipse:  Circle,
  triangle: Triangle,
  line:     Minus,
  path:     Pen,
  'i-text': Type,
  textbox:  Type,
  group:    Group,
  polygon:  Square,
};
 
const LayerIcon = ({ type }) => {
  const Icon = TYPE_ICONS[type] || Square;
  return <Icon size={11} className="shrink-0" />;
};
 
// ─── Individual layer row ─────────────────────────────────────────────────────
const LayerRow = ({ layer, onSelect, onToggleVisible, onToggleLock, onDelete, onMoveUp, onMoveDown, isSelected }) => {
  return (
    <div
      className={`
        group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all
        ${isSelected
          ? 'bg-indigo-600/25 border border-indigo-500/30'
          : 'hover:bg-white/5 border border-transparent'
        }
      `}
      onClick={onSelect}
    >
      {/* Type icon */}
      <span className={`${isSelected ? 'text-indigo-300' : 'text-gray-500'}`}>
        <LayerIcon type={layer.type} />
      </span>
 
      {/* Layer name */}
      <span className={`flex-1 text-xs truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
        {layer.name}
      </span>
 
      {/* Action buttons (visible on hover / when active) */}
      <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          title="Move up"
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          title="Move down"
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          title={layer.visible ? 'Hide' : 'Show'}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          {layer.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-gray-600" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          title={layer.locked ? 'Unlock' : 'Lock'}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          {layer.locked ? <Lock size={11} className="text-amber-400" /> : <Unlock size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};
 
// ─── Main LayersPanel ─────────────────────────────────────────────────────────
const LayersPanel = () => {
  const { canvas, layers, selectedObject } = useSelector((state) => state.whiteboard);
  const dispatch = useDispatch();
 
  const getCanvasObj = useCallback((layer) => {
    if (!canvas) return null;
    return canvas.getObjects().find(
      (o) => (o.id && o.id === layer.id) || o === layer.object
    ) || null;
  }, [canvas]);
 
  const syncLayers = useCallback(() => {
    if (!canvas) return;
    const objs = canvas.getObjects();
    const updated = objs.map((obj, i) => ({
      id:      obj.id        || `obj-${i}`,
      name:    obj.customName || `${obj.type} ${i + 1}`,
      type:    obj.type,
      visible: obj.visible !== false,
      locked:  !!(obj.lockMovementX && obj.lockMovementY),
      object:  obj,
    }));
    dispatch(setLayers([...updated].reverse()));
  }, [canvas, setLayers]);
 
  const handleSelect = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    dispatch(setSelectedObject(obj));
  };
 
  const handleToggleVisible = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    obj.set({ visible: !obj.visible });
    canvas.requestRenderAll();
    syncLayers();
  };
 
  const handleToggleLock = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    const lock = !(obj.lockMovementX && obj.lockMovementY);
    obj.set({
      lockMovementX: lock, lockMovementY: lock,
      lockRotation:  lock, lockScalingX:  lock, lockScalingY: lock,
      hasControls:   !lock,
    });
    canvas.requestRenderAll();
    syncLayers();
  };
 
  const handleDelete = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncLayers();
  };
 
  const handleMoveUp = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    canvas.bringForward(obj);
    canvas.requestRenderAll();
    syncLayers();
  };
 
  const handleMoveDown = (layer) => {
    const obj = getCanvasObj(layer);
    if (!obj || !canvas) return;
    canvas.sendBackwards(obj);
    canvas.requestRenderAll();
    syncLayers();
  };
 
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-gray-500" />
          <span className="text-xs text-gray-400 font-medium">
            {layers.length} object{layers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={syncLayers}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          Refresh
        </button>
      </div>
 
      {/* ── Layer list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Layers size={24} className="text-gray-700 mb-2" />
            <p className="text-gray-600 text-xs">No objects on canvas</p>
            <p className="text-gray-700 text-[10px] mt-1">
              Add shapes, text, or drawings to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {layers.map((layer) => (
              <LayerRow
                key={layer.id}
                layer={layer}
                isSelected={selectedObject === layer.object}
                onSelect={() => handleSelect(layer)}
                onToggleVisible={() => handleToggleVisible(layer)}
                onToggleLock={() => handleToggleLock(layer)}
                onDelete={() => handleDelete(layer)}
                onMoveUp={() => handleMoveUp(layer)}
                onMoveDown={() => handleMoveDown(layer)}
              />
            ))}
          </div>
        )}
      </div>
 
      {/* ── Footer: select-all / delete-all ── */}
      {layers.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-2 border-t border-white/8">
          <button
            onClick={() => {
              if (!canvas) return;
              canvas.discardActiveObject();
              const sel = new fabric.ActiveSelection(canvas.getObjects(), { canvas });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            }}
            className="flex-1 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/6 transition-colors font-medium"
          >
            Select All
          </button>
          <button
            onClick={() => {
              if (!canvas || !window.confirm('Delete all objects?')) return;
              canvas.clear();
              canvas.backgroundColor = 'transparent';
              canvas.requestRenderAll();
              dispatch(setLayers([]));
            }}
            className="flex-1 py-1.5 rounded-lg text-[10px] text-gray-600 hover:text-red-400 hover:bg-red-500/8 transition-colors font-medium"
          >
            Delete All
          </button>
        </div>
      )}
    </div>
  );
};
 
export default LayersPanel;