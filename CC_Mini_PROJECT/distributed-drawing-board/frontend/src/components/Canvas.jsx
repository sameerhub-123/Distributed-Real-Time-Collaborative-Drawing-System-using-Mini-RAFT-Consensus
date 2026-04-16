import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";

const MAX_HISTORY = 60;
const CW = 1600, CH = 900;

const Canvas = forwardRef(function Canvas(
  { tool, color, brushSize, opacity = 1, fillShape = false,
    strokeStyle = "solid", fontSize = 20, send, remoteCursors },
  ref
) {
  const canvasRef   = useRef(null);
  const overlayRef  = useRef(null);
  const isDrawing   = useRef(false);
  const startPos    = useRef({ x: 0, y: 0 });
  const history     = useRef([]);
  const redoStack   = useRef([]);

  // Text tool state
  const [textInput, setTextInput]   = useState(null); // { x, y } in canvas coords
  const [textValue, setTextValue]   = useState("");
  const textRef                     = useRef(null);

  // Zoom / pan
  const [zoom, setZoom]   = useState(1);
  const [showGrid, setShowGrid] = useState(false);

  /* ── Public API ─────────────────────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    undo() {
      if (history.current.length <= 1) return false;
      const ctx = canvasRef.current.getContext("2d");
      redoStack.current.push(history.current.pop());
      ctx.putImageData(history.current[history.current.length - 1], 0, 0);
      return true;
    },
    redo() {
      if (!redoStack.current.length) return false;
      const snap = redoStack.current.pop();
      history.current.push(snap);
      canvasRef.current.getContext("2d").putImageData(snap, 0, 0);
      return true;
    },
    clear() {
      canvasRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      snapshot(); redoStack.current = [];
    },
    canUndo: () => history.current.length > 1,
    canRedo: () => redoStack.current.length > 0,
    drawRemoteStroke(data) { paint(data); snapshot(); },
    loadStrokes(strokes) {
      canvasRef.current.getContext("2d").clearRect(0, 0, CW, CH);
      strokes.forEach(paint); snapshot();
    },
    toDataURL: () => canvasRef.current?.toDataURL(),
    downloadPNG() {
      const a = document.createElement("a");
      a.href     = canvasRef.current.toDataURL("image/png");
      a.download = "drawing.png";
      a.click();
    },
    zoomIn()  { setZoom((z) => Math.min(z + 0.1, 3)); },
    zoomOut() { setZoom((z) => Math.max(z - 0.1, 0.3)); },
    resetZoom() { setZoom(1); },
    toggleGrid() { setShowGrid((g) => !g); },
    getZoom: () => zoom,
  }));

  /* ── Snapshot ────────────────────────────────────────────────────────────── */
  function snapshot() {
    const s = canvasRef.current.getContext("2d").getImageData(0, 0, CW, CH);
    history.current.push(s);
    if (history.current.length > MAX_HISTORY) history.current.shift();
  }
  useEffect(() => { snapshot(); }, []);

  /* ── Apply stroke style ──────────────────────────────────────────────────── */
  function applyStrokeStyle(ctx, style) {
    if (style === "dashed")  ctx.setLineDash([12, 6]);
    else if (style === "dotted") ctx.setLineDash([3, 6]);
    else ctx.setLineDash([]);
  }

  /* ── Paint primitive ─────────────────────────────────────────────────────── */
  function paint(d) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = d.opacity ?? 1;

    if (d.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth   = d.width || 20;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
      ctx.restore(); return;
    }

    ctx.strokeStyle = d.color || "#7c3aed";
    ctx.fillStyle   = d.color || "#7c3aed";
    ctx.lineWidth   = d.width || 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    applyStrokeStyle(ctx, d.strokeStyle || "solid");

    switch (d.tool) {
      case "pen":
      case "pen2":
        ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
        break;

      case "line":
        ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
        break;

      case "arrow": {
        const dx = d.x1 - d.x0, dy = d.y1 - d.y0;
        const angle = Math.atan2(dy, dx);
        const len   = Math.sqrt(dx * dx + dy * dy);
        const hw    = Math.min(20, len * 0.3);
        ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x1 - hw * Math.cos(angle - 0.4), d.y1 - hw * Math.sin(angle - 0.4));
        ctx.lineTo(d.x1 - hw * Math.cos(angle + 0.4), d.y1 - hw * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        break;
      }

      case "rectangle":
        if (d.fill) { ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0); }
        ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
        break;

      case "circle": {
        const rx = (d.x1 - d.x0) / 2, ry = (d.y1 - d.y0) / 2;
        ctx.beginPath();
        ctx.ellipse(d.x0 + rx, d.y0 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        if (d.fill) ctx.fill();
        ctx.stroke();
        break;
      }

      case "triangle": {
        const mx = (d.x0 + d.x1) / 2;
        ctx.beginPath();
        ctx.moveTo(mx, d.y0);
        ctx.lineTo(d.x1, d.y1);
        ctx.lineTo(d.x0, d.y1);
        ctx.closePath();
        if (d.fill) ctx.fill();
        ctx.stroke();
        break;
      }

      case "star": {
        const cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2;
        const outerR = Math.min(Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)) / 2;
        const innerR = outerR * 0.4;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r     = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          else         ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        }
        ctx.closePath();
        if (d.fill) ctx.fill();
        ctx.stroke();
        break;
      }

      case "text":
        ctx.font      = `${d.fontSize || 20}px Inter, sans-serif`;
        ctx.fillStyle = d.color || "#0f172a";
        ctx.fillText(d.text || "", d.x0, d.y0);
        break;

      default:
        ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Shape preview overlay ───────────────────────────────────────────────── */
  function showPreview(x0, y0, x1, y1) {
    const ov = overlayRef.current; if (!ov) return;
    const ctx = ov.getContext("2d");
    ctx.clearRect(0, 0, ov.width, ov.height);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth   = brushSize; ctx.lineCap = "round";
    ctx.setLineDash([8, 4]); ctx.globalAlpha = 0.55;
    applyStrokeStyle(ctx, strokeStyle);

    const shapeTools = ["rectangle","circle","triangle","star","line","arrow"];
    if (!shapeTools.includes(tool)) { ctx.restore(); return; }

    switch (tool) {
      case "rectangle": ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); break;
      case "circle": {
        const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
        ctx.beginPath();
        ctx.ellipse(x0 + rx, y0 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke(); break;
      }
      case "triangle": {
        const mx = (x0 + x1) / 2;
        ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1);
        ctx.closePath(); ctx.stroke(); break;
      }
      case "star": {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const outerR = Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
        const innerR = outerR * 0.4;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath(); ctx.stroke(); break;
      }
      case "line":
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); break;
      case "arrow": {
        const dx = x1 - x0, dy = y1 - y0;
        const angle = Math.atan2(dy, dx);
        const hw = 20;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - hw * Math.cos(angle - 0.4), y1 - hw * Math.sin(angle - 0.4));
        ctx.lineTo(x1 - hw * Math.cos(angle + 0.4), y1 - hw * Math.sin(angle + 0.4));
        ctx.closePath(); ctx.fill(); break;
      }
    }
    ctx.restore();
  }

  function clearOverlay() {
    const ov = overlayRef.current;
    if (ov) ov.getContext("2d").clearRect(0, 0, ov.width, ov.height);
  }

  /* ── Coordinate helper ───────────────────────────────────────────────────── */
  function getPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: (s.clientX - r.left) * (CW / r.width), y: (s.clientY - r.top) * (CH / r.height) };
  }

  /* ── Text tool commit ────────────────────────────────────────────────────── */
  function commitText() {
    if (!textInput || !textValue.trim()) { setTextInput(null); setTextValue(""); return; }
    const d = { tool: "text", color, fontSize, text: textValue, x0: textInput.x, y0: textInput.y, opacity };
    paint(d);
    snapshot();
    send({ type: "stroke", data: d });
    setTextInput(null); setTextValue("");
  }

  /* ── Pointer events ──────────────────────────────────────────────────────── */
  const penTools = ["pen", "pen2", "eraser"];
  const shapeTools = ["rectangle", "circle", "triangle", "star", "line", "arrow"];

  function onDown(e) {
    if (tool === "text") {
      const p = getPos(e);
      setTextInput(p); setTextValue("");
      setTimeout(() => textRef.current?.focus(), 50);
      return;
    }
    isDrawing.current = true;
    startPos.current  = getPos(e);
    if (penTools.includes(tool)) snapshot();
    redoStack.current = [];
  }

  function onMove(e) {
    const p = getPos(e);
    send({ type: "cursor", x: p.x, y: p.y });
    if (!isDrawing.current) return;

    if (penTools.includes(tool)) {
      const d = { tool, color, width: brushSize, opacity, strokeStyle,
                  x0: startPos.current.x, y0: startPos.current.y, x1: p.x, y1: p.y };
      paint(d); send({ type: "stroke", data: d }); startPos.current = p;
    } else if (shapeTools.includes(tool)) {
      showPreview(startPos.current.x, startPos.current.y, p.x, p.y);
    }
  }

  function onUp(e) {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (shapeTools.includes(tool)) {
      const p = getPos(e);
      const d = { tool, color, width: brushSize, opacity, strokeStyle, fill: fillShape,
                  x0: startPos.current.x, y0: startPos.current.y, x1: p.x, y1: p.y };
      clearOverlay(); snapshot(); paint(d);
      send({ type: "stroke", data: d });
    }
  }

  const cursorMap = { eraser: "cell", text: "text", default: "crosshair" };
  const cursor = cursorMap[tool] || cursorMap.default;

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Zoom wrapper */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "relative",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.15s",
          width: "100%", height: "100%",
        }}>
          {/* Grid overlay */}
          {showGrid && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5,
              backgroundImage: "linear-gradient(rgba(124,58,237,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
          )}

          {/* Drawing canvas */}
          <canvas ref={canvasRef} width={CW} height={CH}
            style={{ cursor, display: "block", width: "100%", height: "100%" }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
            onMouseLeave={() => { isDrawing.current = false; clearOverlay(); }}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          />

          {/* Shape preview overlay */}
          <canvas ref={overlayRef} width={CW} height={CH}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }}
          />

          {/* Text input overlay */}
          {textInput && (
            <div style={{
              position: "absolute", zIndex: 30,
              left: `${(textInput.x / CW) * 100}%`,
              top:  `${(textInput.y / CH) * 100}%`,
            }}>
              <input
                ref={textRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitText(); if (e.key === "Escape") { setTextInput(null); setTextValue(""); } }}
                onBlur={commitText}
                style={{
                  fontSize: `${fontSize * (100 / CH)}vw`,
                  color, fontFamily: "Inter, sans-serif", fontWeight: 600,
                  background: "rgba(255,255,255,0.9)", border: "2px dashed #7c3aed",
                  borderRadius: 4, padding: "2px 6px", outline: "none",
                  minWidth: 80,
                }}
                placeholder="Type here…"
              />
            </div>
          )}

          {/* Remote cursors */}
          {Object.values(remoteCursors).map((c) => (
            <div key={c.userId} style={{
              position: "absolute", pointerEvents: "none", zIndex: 20,
              left: `${(c.x / CW) * 100}%`, top: `${(c.y / CH) * 100}%`,
              transform: "translate(-2px,-2px)",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 3l13 5.5-6.5 2L7 17 3 3z" fill={c.color} stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <span style={{
                position: "absolute", top: 20, left: 6,
                background: c.color, color: "#fff", fontSize: 10, fontWeight: 700,
                padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)", fontFamily: "Inter,sans-serif",
              }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: "absolute", bottom: 10, right: 12, zIndex: 30,
        fontSize: 11, fontWeight: 600, color: "#94a3b8",
        background: "rgba(255,255,255,0.9)", padding: "3px 8px",
        borderRadius: 6, border: "1px solid #e2e8f0",
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
});

export default Canvas;
