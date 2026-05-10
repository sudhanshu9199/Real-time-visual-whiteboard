import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as fabric from 'fabric';
import { useSelector, useDispatch } from 'react-redux';
import { setZoom } from '../../../../store/whiteboardSlice';
 
const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
 
const ZoomControls = () => {
  const { canvas, zoom } = useSelector((state) => state.whiteboard);
  const dispatch = useDispatch();
 
  const zoomToCenter = (newZoom) => {
    if (!canvas) return;
    const clamped = Math.min(Math.max(newZoom, 0.08), 12);
    const center  = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, clamped);
    dispatch(setZoom(clamped));
  };
 
  const handleZoomIn = () => {
    if (!canvas) return;
    const current = canvas.getZoom();
    const next    = ZOOM_LEVELS.find((z) => z > current + 0.001) || 12;
    zoomToCenter(next);
  };
 
  const handleZoomOut = () => {
    if (!canvas) return;
    const current = canvas.getZoom();
    const prev    = [...ZOOM_LEVELS].reverse().find((z) => z < current - 0.001) || 0.08;
    zoomToCenter(prev);
  };
 
  const handleResetZoom = () => {
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    dispatch(setZoom(1));
  };
 
  const handleFitToWindow = () => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (!objects.length) {
      handleResetZoom();
      return;
    }
    // Compute bounding box of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach((obj) => {
      const bounds = obj.getBoundingRect(true, true);
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.left + bounds.width);
      maxY = Math.max(maxY, bounds.top  + bounds.height);
    });
    const padding   = 60;
    const w         = maxX - minX + padding * 2;
    const h         = maxY - minY + padding * 2;
    const fitZoom   = Math.min(canvas.getWidth() / w, canvas.getHeight() / h, 2);
    const offsetX   = (canvas.getWidth()  - w * fitZoom) / 2 - (minX - padding) * fitZoom;
    const offsetY   = (canvas.getHeight() - h * fitZoom) / 2 - (minY - padding) * fitZoom;
    canvas.setViewportTransform([fitZoom, 0, 0, fitZoom, offsetX, offsetY]);
    dispatch(setZoom(fitZoom));
  };
 
  const formatZoom = (z) => `${Math.round(z * 100)}%`;
 
  return (
    <div
      className="absolute bottom-4 right-[220px] z-50 flex items-center gap-0.5 p-1 rounded-xl border border-white/10 shadow-2xl"
      style={{
        background: 'rgba(15,15,20,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Zoom out */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= 0.09}
        title="Zoom Out (-)"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ZoomOut size={14} />
      </button>
 
      {/* Percentage (click to reset) */}
      <button
        onClick={handleResetZoom}
        title="Reset to 100%"
        className="px-2.5 h-8 rounded-lg text-xs font-mono text-gray-300 hover:text-white hover:bg-white/8 transition-colors min-w-[52px] text-center"
      >
        {formatZoom(zoom)}
      </button>
 
      {/* Zoom in */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= 11.9}
        title="Zoom In (+)"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ZoomIn size={14} />
      </button>
 
      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-0.5" />
 
      {/* Fit to content */}
      <button
        onClick={handleFitToWindow}
        title="Fit to content"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
};
 
export default ZoomControls;