/** Minimal SVG icon set — all icons are 16×16 viewBox, stroke-based */
import React from "react";

const I = ({ d, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d}
  </svg>
);

export const PenIcon       = (p) => <I {...p} d={<><path d="M11 2l3 3-9 9H2v-3L11 2z"/></>} />;
export const EraserIcon    = (p) => <I {...p} d={<><path d="M2 13h12M9 2l5 5-6 6-5-5 6-6z"/></>} />;
export const RectIcon      = (p) => <I {...p} d={<rect x="2" y="4" width="12" height="8" rx="1"/>} />;
export const CircleIcon    = (p) => <I {...p} d={<circle cx="8" cy="8" r="5.5"/>} />;
export const UndoIcon      = (p) => <I {...p} d={<><path d="M3 7H10a3 3 0 010 6H7"/><path d="M3 7L6 4M3 7l3 3"/></>} />;
export const RedoIcon      = (p) => <I {...p} d={<><path d="M13 7H6a3 3 0 000 6h3"/><path d="M13 7l-3-3M13 7l-3 3"/></>} />;
export const TrashIcon     = (p) => <I {...p} d={<><path d="M2 4h12M5 4V3h6v1M6 7v5M10 7v5M3 4l1 9h8l1-9"/></>} />;
export const SaveIcon      = (p) => <I {...p} d={<><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 2v4h6V2M8 9v4M6 11h4"/></>} />;
export const FolderIcon    = (p) => <I {...p} d={<><path d="M2 5a1 1 0 011-1h4l2 2h4a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5z"/></>} />;
export const SendIcon      = (p) => <I {...p} d={<><path d="M14 2L2 7l5 2 2 5 5-12z"/><path d="M7 9l3-3"/></>} />;
export const UsersIcon     = (p) => <I {...p} d={<><circle cx="6" cy="6" r="2.5"/><path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4"/><circle cx="12" cy="5" r="2"/><path d="M15 12c0-2-1.5-3-3-3"/></>} />;
export const ServerIcon    = (p) => <I {...p} d={<><rect x="2" y="3" width="12" height="4" rx="1"/><rect x="2" y="9" width="12" height="4" rx="1"/><circle cx="5" cy="5" r="0.8" fill="currentColor" stroke="none"/><circle cx="5" cy="11" r="0.8" fill="currentColor" stroke="none"/></>} />;
export const CrownIcon     = (p) => <I {...p} d={<><path d="M2 12l2-6 4 3 4-3 2 6H2z"/><path d="M2 12h12"/></>} />;
export const WifiIcon      = (p) => <I {...p} d={<><path d="M1 6a9.5 9.5 0 0114 0M4 9a5.5 5.5 0 018 0M7 12a2 2 0 012 0"/><circle cx="8" cy="14" r="0.8" fill="currentColor" stroke="none"/></>} />;
export const WifiOffIcon   = (p) => <I {...p} d={<><path d="M2 2l12 12M1 6a9.5 9.5 0 012.5-2M7 4.5A9.4 9.4 0 0115 6M4 9a5.5 5.5 0 012-1.5M10.5 9a5.4 5.4 0 011.5 1"/><circle cx="8" cy="14" r="0.8" fill="currentColor" stroke="none"/></>} />;
export const ChatIcon      = (p) => <I {...p} d={<><path d="M2 3h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V4a1 1 0 011-1z"/></>} />;
