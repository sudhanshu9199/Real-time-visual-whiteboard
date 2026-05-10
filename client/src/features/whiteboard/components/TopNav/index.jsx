
import React, { useState, useRef, useEffect } from 'react';
import {
  Share2, Download, ChevronDown, Users, Check,
  FileImage, FileCode, Copy, Link,
} from 'lucide-react';
import { useWhiteboardStore } from '../../'
 
// ─── Avatar component ────────────────────────────────────────────────────────
const Avatar = ({ user, size = 28, showTooltip = true }) => {
  const [tip, setTip] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold select-none cursor-default ring-2 ring-[#0f0f14]"
        style={{
          width:           size,
          height:          size,
          fontSize:        size * 0.38,
          backgroundColor: user.color,
          letterSpacing:   '-0.02em',
        }}
      >
        {user.initials}
      </div>
      {showTooltip && tip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-[#1e1e2e] text-white text-xs whitespace-nowrap z-50 pointer-events-none shadow-xl">
          {user.name}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#1e1e2e]" />
        </div>
      )}
    </div>
  );
};
 
// ─── Export dropdown ─────────────────────────────────────────────────────────
const ExportDropdown = ({ onClose }) => {
  const { canvas, boardName } = useWhiteboardStore();
 
  const exportAs = (format) => {
    if (!canvas) return;
    if (format === 'png') {
      const url  = canvas.toDataURL({ format: 'png', multiplier: 2 });
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${boardName}.png`;
      a.click();
    } else if (format === 'svg') {
      const svg  = canvas.toSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${boardName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const json = JSON.stringify(canvas.toJSON(['id', 'customName', 'customType']), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${boardName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  };
 
  const items = [
    { label: 'Export as PNG',  icon: FileImage, action: () => exportAs('png') },
    { label: 'Export as SVG',  icon: FileCode,  action: () => exportAs('svg') },
    { label: 'Export as JSON', icon: Download,  action: () => exportAs('json') },
  ];
 
  return (
    <div className="absolute top-full right-0 mt-2 w-52 rounded-xl bg-[#1a1a2a] border border-white/10 shadow-2xl overflow-hidden z-50">
      {items.map(({ label, icon: Icon, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors"
        >
          <Icon size={15} className="opacity-70" />
          {label}
        </button>
      ))}
    </div>
  );
};
 
// ─── Share modal ─────────────────────────────────────────────────────────────
const ShareModal = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareLink = `${window.location.origin}/board/${Math.random().toString(36).slice(2, 10)}`;
 
  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
 
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-[#1a1a2a] border border-white/10 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-500/20">
            <Users size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Share Board</h2>
            <p className="text-gray-400 text-xs">Invite others to collaborate in real time</p>
          </div>
        </div>
 
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <Link size={14} className="text-gray-500 shrink-0" />
            <span className="text-gray-300 text-xs truncate flex-1 font-mono">{shareLink}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
 
        <p className="text-xs text-gray-500 mt-3">
          Anyone with this link can view and edit this board.
        </p>
      </div>
    </div>
  );
};
 
// ─── Main TopNav ─────────────────────────────────────────────────────────────
const TopNav = () => {
  const { boardName, setBoardName, activeUsers, setSidebarMode } = useWhiteboardStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue,     setNameValue]     = useState(boardName);
  const [showExport,    setShowExport]    = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const nameInputRef  = useRef(null);
  const exportBtnRef  = useRef(null);
 
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.select();
  }, [isEditingName]);
 
  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e) => {
      if (!exportBtnRef.current?.contains(e.target)) setShowExport(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExport]);
 
  const commitName = () => {
    const trimmed = nameValue.trim() || 'Untitled Board';
    setBoardName(trimmed);
    setNameValue(trimmed);
    setIsEditingName(false);
  };
 
  // Show only first 3 users; overflow indicator for the rest
  const visibleUsers = activeUsers.slice(0, 3);
  const overflow     = Math.max(0, activeUsers.length - 3);
 
  return (
    <>
      <header
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
        style={{
          height: '52px',
          background: 'linear-gradient(to bottom, rgba(15,15,20,0.92) 0%, rgba(15,15,20,0.0) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* ── Left: logo + board name ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.3"/>
              </svg>
            </div>
          </div>
 
          {/* Board name */}
          <div className="flex items-center gap-1 min-w-0">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  commitName();
                  if (e.key === 'Escape') {
                    setNameValue(boardName);
                    setIsEditingName(false);
                  }
                }}
                className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 w-48"
                maxLength={64}
              />
            ) : (
              <button
                className="flex items-center gap-1.5 text-white text-sm font-medium hover:bg-white/8 px-2 py-1 rounded-lg transition-colors truncate max-w-[200px]"
                onDoubleClick={() => setIsEditingName(true)}
                title="Double-click to rename"
              >
                <span className="truncate">{boardName}</span>
                <ChevronDown size={13} className="opacity-40 shrink-0" />
              </button>
            )}
          </div>
        </div>
 
        {/* ── Right: users + actions ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Active users */}
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {visibleUsers.map((u) => (
                <Avatar key={u.id} user={u} size={28} />
              ))}
            </div>
            {overflow > 0 && (
              <div className="w-7 h-7 -ml-1.5 rounded-full bg-white/10 border-2 border-[#0f0f14] flex items-center justify-center text-xs text-gray-300 font-medium">
                +{overflow}
              </div>
            )}
          </div>
 
          {/* Divider */}
          <div className="w-px h-5 bg-white/10" />
 
          {/* Layers button */}
          <button
            onClick={() => setSidebarMode('layers')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors text-xs font-medium"
            title="Layers"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 7l6-4 6 4-6 4-6-4z"/>
              <path d="M1 10l6 4 6-4" opacity="0.5"/>
            </svg>
            Layers
          </button>
 
          {/* Share button */}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white transition-colors text-xs font-medium"
          >
            <Share2 size={13} />
            Share
          </button>
 
          {/* Export button */}
          <div className="relative" ref={exportBtnRef}>
            <button
              onClick={() => setShowExport((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-xs font-semibold shadow-lg shadow-indigo-900/40"
            >
              <Download size={13} />
              Export
              <ChevronDown size={12} className={`transition-transform ${showExport ? 'rotate-180' : ''}`} />
            </button>
            {showExport && <ExportDropdown onClose={() => setShowExport(false)} />}
          </div>
        </div>
      </header>
 
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  );
};
 
export default TopNav;