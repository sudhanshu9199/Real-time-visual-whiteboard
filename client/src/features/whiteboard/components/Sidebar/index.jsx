import React from 'react';
import { X, Palette, Sparkles, Layers } from 'lucide-react';
import { useWhiteboardStore } from '../../store/useWhiteboardStore';
import PropertiesPanel from './PropertiesPanel';
import AIPanel         from './AIPanel';
 
// ─── Tab button ───────────────────────────────────────────────────────────────
const Tab = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all
      ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/6'
      }
    `}
  >
    <Icon size={13} />
    {label}
  </button>
);
 
// ─── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar = () => {
  const {
    isSidebarOpen,
    sidebarMode,
    setSidebarMode,
    closeSidebar,
    selectedObject,
  } = useWhiteboardStore();
 
  // Auto-switch to properties tab when an object is selected
  // (the store handles this via setSidebarMode('properties') on selection:created)
 
  return (
    <div
      className={`
        absolute right-3 top-16 bottom-16 z-50
        flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl
        transition-all duration-300 ease-out
        ${isSidebarOpen
          ? 'opacity-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 translate-x-4 pointer-events-none'
        }
      `}
      style={{
        width: '260px',
        background: 'rgba(13,13,20,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Header / Tabs ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/8">
        <div className="flex gap-1">
          <Tab
            icon={Palette}
            label="Properties"
            active={sidebarMode === 'properties'}
            onClick={() => setSidebarMode('properties')}
          />
          <Tab
            icon={Sparkles}
            label="AI"
            active={sidebarMode === 'ai'}
            onClick={() => setSidebarMode('ai')}
          />
          <Tab
            icon={Layers}
            label="Layers"
            active={sidebarMode === 'layers'}
            onClick={() => setSidebarMode('layers')}
          />
        </div>
 
        <button
          onClick={closeSidebar}
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>
 
      {/* ── Panel Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {sidebarMode === 'properties' && <PropertiesPanel />}
        {sidebarMode === 'ai'         && <AIPanel         />}
        {sidebarMode === 'layers'     && <LazyLayersPanel />}
      </div>
    </div>
  );
};
 
// Lazy-load LayersPanel to avoid circular dep issues
const LazyLayersPanel = React.lazy(() =>
  import('../LayersPanel').catch(() => ({ default: () => (
    <div className="p-4 text-gray-500 text-sm">Layers panel unavailable.</div>
  )}))
);
 
export default Sidebar;