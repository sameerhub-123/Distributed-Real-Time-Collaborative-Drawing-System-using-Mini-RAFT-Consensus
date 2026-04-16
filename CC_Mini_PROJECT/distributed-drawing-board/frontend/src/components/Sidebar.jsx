import React from "react";
import { motion } from "framer-motion";

const TOOLS = [
  {
    id: "pen", label: "Pen",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2l3 3-9 9H4v-3L13 2z"/>
      </svg>
    ),
  },
  {
    id: "eraser", label: "Eraser",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15h14M10 2l6 6-7 7-6-6 7-7z"/>
      </svg>
    ),
  },
  {
    id: "pen2", label: "Marker",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 15l3-1 8-8-2-2-8 8-1 3zM12 4l2 2"/>
        <circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: "rectangle", label: "Rectangle",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="3" y="5" width="12" height="8" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: "circle", label: "Circle",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="9" r="6"/>
      </svg>
    ),
  },
];

// Bottom icon — users/collaborators
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="7" cy="7" r="3"/><path d="M1 16c0-3 2.5-5 6-5s6 2 6 5"/>
    <circle cx="13" cy="6" r="2"/><path d="M17 15c0-2-1.5-3.5-4-3.5"/>
  </svg>
);

export default function Sidebar({ activeTool, onToolChange }) {
  return (
    <aside className="glass border-r border-white/10 flex flex-col items-center py-4 gap-2 w-[72px] shrink-0">

      {TOOLS.map((tool) => {
        const active = activeTool === tool.id;
        return (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={[
              "relative w-12 h-12 rounded-2xl flex items-center justify-center",
              "transition-all duration-200",
              active
                ? "text-white shadow-glow-sm"
                : "text-t3 hover:text-t2 hover:bg-white/8",
            ].join(" ")}
            style={active ? {
              background: "linear-gradient(135deg, rgba(99,102,241,0.5), rgba(124,58,237,0.4))",
              boxShadow: "0 0 16px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
              border: "1px solid rgba(99,102,241,0.5)",
            } : {}}
          >
            {tool.icon}
          </motion.button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Collaborators button at bottom */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-t3 hover:text-t2 hover:bg-white/8 transition-all"
        title="Collaborators"
      >
        <UsersIcon />
      </motion.button>
    </aside>
  );
}
