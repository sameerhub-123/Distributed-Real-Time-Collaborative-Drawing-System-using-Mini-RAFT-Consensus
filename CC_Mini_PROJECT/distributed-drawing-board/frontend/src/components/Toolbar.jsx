import React from "react";
import { motion } from "framer-motion";

/* ── Small icon button ────────────────────────────────────────────────────── */
function Btn({ onClick, title, children, disabled, danger, accent, className = "" }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.08, y: -1 }}
      whileTap={disabled   ? {} : { scale: 0.93 }}
      onClick={onClick} title={title} disabled={disabled}
      className={[
        "flex items-center justify-center rounded-xl transition-all duration-150 select-none",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        danger  ? "text-red-400   hover:bg-red-500/20"
        : accent ? "text-indigo-300 hover:bg-indigo-500/20"
        : "text-t2 hover:text-t1 hover:bg-white/10",
        className,
      ].join(" ")}
    >
      {children}
    </motion.button>
  );
}

const Sep = () => <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />;

export default function Toolbar({
  color, onColorChange, brushSize, onBrushChange,
  onUndo, onRedo, onClear, onSave, onLoad,
  canUndo, canRedo, connected, clusterInfo,
}) {
  return (
    <div className="flex items-center h-14 px-5 gap-3">

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mr-4">
        {/* Gradient icon mark */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 13L6 5l4 5 2-3" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-base font-bold text-t1 tracking-tight">DrawSync</span>
        {/* Small icon badge */}
        <div className="w-6 h-6 rounded-lg glass flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="10" height="10" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
            <path d="M3 6h6M6 3v6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* ── Color picker ──────────────────────────────────────────────────── */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="w-9 h-9 rounded-xl border-2 border-white/20 group-hover:border-white/40
                        transition-colors overflow-hidden shrink-0 shadow-glow-sm"
          style={{ background: color }}>
          <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer" />
        </div>
        <span className="text-xs font-mono text-t2 uppercase tracking-wider">{color}</span>
      </label>

      <Sep />

      {/* ── Brush size ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <input type="range" min="1" max="40" value={brushSize}
          onChange={(e) => onBrushChange(Number(e.target.value))}
          className="w-28" />
        {/* Live dot preview */}
        <div className="rounded-full bg-t2 shrink-0 transition-all"
          style={{ width: Math.max(4, Math.min(brushSize * 0.6, 16)), height: Math.max(4, Math.min(brushSize * 0.6, 16)) }} />
      </div>

      <Sep />

      {/* ── Undo / Redo ───────────────────────────────────────────────────── */}
      <Btn onClick={onUndo} title="Undo Ctrl+Z" disabled={!canUndo} className="w-9 h-9">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M3 7H9a3 3 0 010 6H6"/><path d="M3 7L6 4M3 7l3 3"/>
        </svg>
      </Btn>
      <Btn onClick={onRedo} title="Redo Ctrl+Y" disabled={!canRedo} className="w-9 h-9">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M13 7H7a3 3 0 000 6h3"/><path d="M13 7l-3-3M13 7l-3 3"/>
        </svg>
      </Btn>

      <Sep />

      {/* ── Clear ─────────────────────────────────────────────────────────── */}
      <Btn onClick={onClear} title="Clear canvas" danger className="w-9 h-9">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4h11M5 4V3h5v1M4 4l1 8h5l1-8"/>
        </svg>
      </Btn>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <Btn onClick={onSave} title="Save JSON" accent className="gap-1.5 px-3 h-9 text-xs font-semibold">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2h8l2 2v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/>
          <path d="M4 2v3h6V2M7 8v3M5 10h4"/>
        </svg>
        Save
      </Btn>

      {/* ── Load ──────────────────────────────────────────────────────────── */}
      <label title="Load JSON"
        className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer
                   text-t2 hover:text-t1 hover:bg-white/10 transition-all">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 5a1 1 0 011-1h3l2 2h4a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5z"/>
        </svg>
        <input type="file" accept=".json" onChange={onLoad} className="hidden" />
      </label>

      {/* ── Spacer ────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right icons (bell, search, window) ────────────────────────────── */}
      {[
        <path key="bell" d="M7 2a4 4 0 014 4v2l1 2H2l1-2V6a4 4 0 014-4zM5.5 12a1.5 1.5 0 003 0"/>,
        <><circle key="s1" cx="6" cy="6" r="3.5"/><path key="s2" d="M10 10l2.5 2.5"/></>,
        <rect key="win" x="2" y="3" width="11" height="9" rx="1.5"/>,
      ].map((icon, i) => (
        <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-t3 hover:text-t2 hover:bg-white/8 transition-all">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">{icon}</svg>
        </button>
      ))}
    </div>
  );
}
