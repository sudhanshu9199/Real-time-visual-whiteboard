import React, { useState, useRef, useEffect } from "react";
import {
  Share2,
  Download,
  ChevronDown,
  Users,
  Check,
  FileImage,
  FileCode,
  Copy,
  Link,
  Wand2,
  Network,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  setBoardName,
  setSidebarMode,
} from "../../../../store/whiteboardSlice";
import style from "./TopNav.module.scss";
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
          width: size,
          height: size,
          fontSize: size * 0.38,
          backgroundColor: user.color,
          letterSpacing: "-0.02em",
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
  const { canvas, boardName } = useSelector((state) => state.whiteboard);

  const exportAs = (format) => {
    if (!canvas) return;
    if (format === "png") {
      const url = canvas.toDataURL({ format: "png", multiplier: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${boardName}.png`;
      a.click();
    } else if (format === "svg") {
      const svg = canvas.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${boardName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      const json = JSON.stringify(
        canvas.toJSON(["id", "customName", "customType"]),
        null,
        2,
      );
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${boardName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  };

  const items = [
    { label: "Export as PNG", icon: FileImage, action: () => exportAs("png") },
    { label: "Export as SVG", icon: FileCode, action: () => exportAs("svg") },
    { label: "Export as JSON", icon: Download, action: () => exportAs("json") },
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
            <p className="text-gray-400 text-xs">
              Invite others to collaborate in real time
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <Link size={14} className="text-gray-500 shrink-0" />
            <span className="text-gray-300 text-xs truncate flex-1 font-mono">
              {shareLink}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
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
  const { boardName, activeUsers } = useSelector((state) => state.whiteboard);
  const dispatch = useDispatch();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(boardName);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [aiCleanupActive, setAiCleanupActive] = useState(false);
  const [archAssistActive, setArchAssistActive] = useState(false);

  const nameInputRef = useRef(null);
  const exportBtnRef = useRef(null);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.select();
  }, [isEditingName]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e) => {
      if (!exportBtnRef.current?.contains(e.target)) setShowExport(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExport]);

  const commitName = () => {
    const trimmed = nameValue.trim() || "Untitled Board";
    dispatch(setBoardName(trimmed));
    setNameValue(trimmed);
    setIsEditingName(false);
  };

  // Show only first 3 users; overflow indicator for the rest
  const visibleUsers = activeUsers.slice(0, 3);
  const overflow = Math.max(0, activeUsers.length - 3);

  return (
    <>
      <header className={style.topnavWrapper}>
        {/* ── Left: logo + board name ──────────────────────────────────────── */}
        <div className={style.navGroup}>
          {/* Logo mark */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/30">
            {/* Minimal Logo */}
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="1"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="8"
                y="1"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="1"
                y="8"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="8"
                y="8"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.3"
              />
            </svg>
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
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameValue(boardName);
                    setIsEditingName(false);
                  }
                }}
                className={style.boardNameInput}
                maxLength={64}
              />
            ) : (
            <button
              className={style['btn-ghost']}
              style={{ border: 'none', background: 'transparent' }}
              onDoubleClick={() => setIsEditingName(true)}
              title="Double-click to rename"
            >
              <span>{boardName}</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
          )}
        </div>
      </div>

        {/* ── Center: AI Floating Toggles ── */}
        <div className={style.navGroup}>
          <div className={style['ai-tools-pill']}>
            <button 
              className={`${style['ai-btn']} ${aiCleanupActive ? style.active : ''}`}
              onClick={() => setAiCleanupActive(!aiCleanupActive)}
            >
              <Wand2 size={14} /> Mess Cleanup
            </button>
            <button 
              className={`${style['ai-btn']} ${archAssistActive ? style.active : ''}`}
              onClick={() => setArchAssistActive(!archAssistActive)}
            >
              <Network size={14} /> Architecture Assist
            </button>
          </div>
        </div>

        {/* ── Right: Users + Actions ── */}
        <div className={style.navGroup}>
          {/* Active users stack */}
          <div className="flex -space-x-2 mr-2">
            {visibleUsers.map((u) => (
              <Avatar key={u.id} user={u} size={32} />
            ))}
            {overflow > 0 && (
              <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#09090b] flex items-center justify-center text-xs text-gray-300 font-medium z-10">
                +{overflow}
              </div>
            )}
          </div>

          <div className={style.divider} />

          <button onClick={() => setShowShare(true)} className={style['btn-ghost']}>
            <Share2 size={14} /> Share
          </button>

          <div className="relative" ref={exportBtnRef}>
            <button onClick={() => setShowExport((p) => !p)} className={style['btn-solid']}>
              <Download size={14} /> Export
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
