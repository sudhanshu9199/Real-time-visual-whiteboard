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
  X,
} from "lucide-react";
import DraggableToggle from "../DraggableToggle";
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
      className={style.avatarWrap}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <div
        className={style.avatar}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: `linear-gradient(135deg, ${user.color}, ${user.color}cc)`,
          letterSpacing: "-0.02em",
        }}
      >
        {user.initials}
      </div>
      {showTooltip && tip && (
        <div className={style.tooltip}>
          {user.name}
          <div className={style.tooltipArrow} />
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
    {
      label: "Export as PNG",
      sub: "Raster · Best for sharing",
      icon: FileImage,
      action: () => exportAs("png"),
    },
    {
      label: "Export as SVG",
      sub: "Vector · Infinitely scalable",
      icon: FileCode,
      action: () => exportAs("svg"),
    },
    {
      label: "Export as JSON",
      sub: "Raw data · Re-importable",
      icon: Download,
      action: () => exportAs("json"),
    },
  ];

  return (
    <div className={style.exportDropdown}>
      <div className={style.exportHeader}>Export Board</div>
      {items.map(({ label, icon: Icon, action }) => (
        <button key={label} onClick={action} className={style.exportItem}>
          <span className={style.exportIcon}>
            <Icon size={15} />
          </span>
          <span className={style.exportText}>
            <span className={style.exportLabel}>{label}</span>
            <span className={style.exportSub}>{sub}</span>
          </span>
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
    <div className={style.modalOverlay} onClick={onClose}>
      <div className={style.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button className={style.modalClose} onClick={onClose}>
          <X size={14} />
        </button>

        <div className={style.modalHeader}>
          <div className={style.modalIcon}>
            <Users size={17} />
          </div>
          <div>
            <h2 className={style.modalTitle}>Share Board</h2>
            <p className={style.modalSub}>
              Invite others to collaborate in real time
            </p>
          </div>
        </div>

        <div className={style.linkRow}>
          <div className={style.linkBox}>
            <Link size={13} className={style.linkIcon} />
            <span className={style.linkText}>{shareLink}</span>
          </div>
          <button
            onClick={handleCopy}
            className={`${style.copyBtn} ${copied ? style.copied : ""}`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className={style.modalNote}>
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

  const [archAssistActive, setArchAssistActive] = useState(false);

  const nameInputRef = useRef(null);
  const exportBtnRef = useRef(null);
  
  const structureWhiteboard = () => {
    console.log("[AI Action]: Executing structure_whiteboard() algorithm...");
    // Future AI cleanup logic can be tied in here!
  };

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
  const visibleUsers = (activeUsers || []).slice(0, 3);
  const overflow = Math.max(0, (activeUsers || []).length - 3);

  return (
    <>
      <header className={style.topnavWrapper}>
        {/* ── Left: logo + board name ──────────────────────────────────────── */}
        <div className={style.navGroup}>
          {/* Logo mark */}
          <div className={style.logo}>
            {/* Minimal Logo */}
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="1"
                width="5"
                height="5"
                rx="1.2"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="8"
                y="1"
                width="5"
                height="5"
                rx="1.2"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="1"
                y="8"
                width="5"
                height="5"
                rx="1.2"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="8"
                y="8"
                width="5"
                height="5"
                rx="1.2"
                fill="white"
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Board name */}
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
              className={style.boardNameBtn}
              onDoubleClick={() => setIsEditingName(true)}
              title="Double-click to rename"
            >
              <span className={style.boardNameText}>{boardName}</span>
              <ChevronDown size={13} className={style.chevron} />
            </button>
          )}
        </div>

        {/* ── Center: AI Floating Toggles ── */}
        <div className={style.navGroup} style={{ gap: '16px' }}>
          <DraggableToggle onTrigger={structureWhiteboard} />
          
          <div className={style.aiPill}>
            <button
              className={`${style.aiBtn} ${archAssistActive ? style.aiActive : ""}`}
              onClick={() => setArchAssistActive((p) => !p)}
            >
              <Network size={13} /> <span>Arch Assist</span>
              {archAssistActive && <span className={style.aiBadge} />}
            </button>
          </div>
        </div>

        {/* ── Right: Users + Actions ── */}
        <div className={style.navGroup}>
          {/* Active users stack */}
          <div className={style.avatarStack}>
            {visibleUsers.map((u) => (
              <Avatar key={u.id} user={u} size={30} />
            ))}
            {overflow > 0 && (
              <div className={style.avatarOverflow}>+{overflow}</div>
            )}
          </div>

          <span className={style.vDivider} />

          <button onClick={() => setShowShare(true)} className={style.btnGhost}>
            <Share2 size={13} /> <span>Share</span>
          </button>

          <div className={style.exportWrap} ref={exportBtnRef}>
            <button
              onClick={() => setShowExport((p) => !p)}
              className={`${style.btnSolid} ${showExport ? style.exportOpen : ""}`}
            >
              <Download size={13} />
              <span>Export</span>
              <ChevronDown
                size={12}
                className={`${style.exportChevron} ${showExport ? style.rotated : ""}`}
              />
            </button>
            {showExport && (
              <ExportDropdown onClose={() => setShowExport(false)} />
            )}
          </div>
        </div>
      </header>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  );
};

export default TopNav;
