import React, { useRef, useState, useCallback, useEffect } from "react";
import Canvas from "./components/Canvas";
import { useWebSocket } from "./hooks/useWebSocket";

const T = {
  bg:"#f8fafc", panel:"#ffffff", primary:"#7c3aed", primaryHov:"#6d28d9",
  secondary:"#06b6d4", secondaryH:"#0891b2", accent:"#f43f5e", accentHov:"#e11d48",
  text:"#0f172a", textMuted:"#64748b", textLight:"#94a3b8", border:"#e2e8f0",
  success:"#22c55e", successBg:"#f0fdf4", successBdr:"#bbf7d0",
  warning:"#f59e0b", danger:"#ef4444", dangerBg:"#fef2f2",
};

const GATEWAY_HTTP = import.meta.env.VITE_GATEWAY_HTTP || "http://localhost:3000";

// Preset color swatches (Canva-style palette)
const SWATCHES = [
  "#0f172a","#ef4444","#f97316","#eab308","#22c55e",
  "#06b6d4","#3b82f6","#7c3aed","#ec4899","#ffffff",
];

function Btn({ onClick, disabled, children, color=T.primary, hov=T.primaryHov, sm=false }) {
  const s = {
    display:"inline-flex", alignItems:"center", gap:5,
    padding: sm ? "4px 10px" : "6px 13px",
    borderRadius:9, fontSize: sm ? 12 : 13, fontWeight:600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.38 : 1, transition:"all 0.15s",
    background:color, color:"#fff", border:"none", userSelect:"none", flexShrink:0,
  };
  return (
    <button style={s} onClick={onClick} disabled={disabled}
      onMouseEnter={(e)=>{ if(!disabled) e.currentTarget.style.background=hov; }}
      onMouseLeave={(e)=>{ if(!disabled) e.currentTarget.style.background=color; }}>
      {children}
    </button>
  );
}

const Sep = () => <div style={{width:1,height:22,background:T.border,flexShrink:0}} />;

// ── Cluster Panel ─────────────────────────────────────────────────────────────
function ClusterPanel({ connected }) {
  const [nodes, setNodes] = useState([]);
  useEffect(() => {
    async function poll() {
      try { const r = await fetch(`${GATEWAY_HTTP}/cluster-status`); setNodes(await r.json()); } catch {}
    }
    poll(); const id = setInterval(poll, 2000); return () => clearInterval(id);
  }, []);

  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,
                 boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",flexShrink:0}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,
                   display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:15}}>⚡</span>
        <span style={{fontWeight:700,fontSize:13,color:T.text}}>Cluster Info</span>
        <span style={{marginLeft:"auto",fontSize:10,color:T.textLight,
                      background:"#f1f5f9",padding:"2px 8px",borderRadius:99,fontWeight:600}}>RAFT</span>
      </div>
      <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:5}}>
        {nodes.length===0 && <p style={{fontSize:12,color:T.textLight,textAlign:"center",padding:"10px 0"}}>Connecting…</p>}
        {nodes.map((node) => {
          const L=node.state==="LEADER", D=node.state==="UNREACHABLE", C=node.state==="CANDIDATE";
          return (
            <div key={node.url} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"9px 11px",borderRadius:11,opacity:D?0.45:1,
              background:L?T.successBg:C?"#fffbeb":"#f8fafc",
              border:`1px solid ${L?T.successBdr:C?"#fde68a":T.border}`,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:30,height:30,borderRadius:9,fontSize:14,
                             display:"flex",alignItems:"center",justifyContent:"center",
                             background:L?"#dcfce7":D?"#fee2e2":`${T.primary}10`,
                             border:`1px solid ${L?"#bbf7d0":D?"#fecaca":`${T.primary}25`}`}}>
                  {L?"👑":D?"💀":"🖥"}
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:T.text,lineHeight:1.2}}>{node.nodeId??"—"}</p>
                  {!D && <p style={{fontSize:10,color:T.textLight,fontFamily:"monospace",marginTop:1}}>T{node.currentTerm} · Log {node.logLength}</p>}
                </div>
              </div>
              {L && <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:99,background:T.success,color:"#fff"}}>LEADER</span>}
              {C && <span style={{fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:99,background:T.warning,color:"#fff"}}>VOTING</span>}
              {!L&&!D&&!C && <span style={{fontSize:11,color:T.textLight,fontWeight:500}}>Follower</span>}
              {D && <span style={{fontSize:11,color:T.danger,fontWeight:600}}>Down</span>}
            </div>
          );
        })}
      </div>
      <div style={{padding:"9px 14px",borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,
                      background:connected?T.success:T.danger,
                      animation:connected?"pulse 2s infinite":"none"}} />
        <span style={{fontSize:12,fontWeight:600,color:connected?T.success:T.danger}}>
          {connected?"Connected":"Reconnecting…"}
        </span>
        <span style={{marginLeft:"auto",fontSize:10,color:T.textLight}}>
          {nodes.filter(n=>n.state!=="UNREACHABLE").length}/3 alive
        </span>
      </div>
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
const BC = ["#7c3aed","#06b6d4","#f43f5e","#059669","#d97706","#2563eb","#db2777"];
function bColor(s="") { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0xffffffff; return BC[Math.abs(h)%BC.length]; }

function ChatPanel({ messages, onSend, identity }) {
  const [input,setInput]=useState(""); const [focused,setFocused]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  function handleSend(e) { e.preventDefault(); const t=input.trim(); if(!t) return; onSend(t); setInput(""); }
  const isMe=(msg)=>msg.userId===identity?.userId;
  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,
                 boxShadow:"0 1px 4px rgba(0,0,0,0.06)",display:"flex",
                 flexDirection:"column",overflow:"hidden",maxHeight:"50%"}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,
                   display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{fontSize:15}}>💬</span>
        <span style={{fontWeight:700,fontSize:13,color:T.text}}>Chat</span>
        {messages.length>0 && <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,
          background:`${T.primary}15`,color:T.primary,padding:"2px 8px",borderRadius:99,
          border:`1px solid ${T.primary}30`}}>{messages.length}</span>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
        {messages.length===0 && <div style={{textAlign:"center",padding:"16px 0"}}>
          <div style={{fontSize:26,marginBottom:4}}>👋</div>
          <p style={{fontSize:12,color:T.textLight}}>No messages yet!</p>
        </div>}
        {messages.map((msg,i)=>{
          const mine=isMe(msg); const c=bColor(msg.userId);
          return (
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start",gap:2}}>
              <div style={{display:"flex",alignItems:"center",gap:4,paddingInline:3}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:c,flexShrink:0}} />
                <span style={{fontSize:10,fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:"0.04em"}}>{mine?"You":msg.label}</span>
                <span style={{fontSize:10,color:T.textLight}}>{new Date(msg.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              <div style={{padding:"7px 11px",maxWidth:"88%",wordBreak:"break-word",fontSize:13,lineHeight:1.5,
                           borderRadius:mine?"14px 3px 14px 14px":"3px 14px 14px 14px",
                           background:mine?c:"#f1f5f9",color:mine?"#fff":T.text,
                           boxShadow:mine?`0 2px 6px ${c}30`:"0 1px 2px rgba(0,0,0,0.05)"}}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{display:"flex",gap:7,padding:"9px 10px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Enter a message..."
          maxLength={200} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{flex:1,minWidth:0,padding:"7px 11px",borderRadius:9,fontSize:13,color:T.text,
                  background:"#f8fafc",outline:"none",
                  border:`1.5px solid ${focused?T.primary:T.border}`,transition:"border-color 0.15s"}} />
        <button type="submit" disabled={!input.trim()}
          style={{padding:"7px 13px",borderRadius:9,fontSize:13,fontWeight:600,
                  background:T.secondary,color:"#fff",border:"none",
                  cursor:input.trim()?"pointer":"not-allowed",opacity:input.trim()?1:0.4,transition:"all 0.15s"}}
          onMouseEnter={(e)=>{if(input.trim())e.currentTarget.style.background=T.secondaryH;}}
          onMouseLeave={(e)=>{e.currentTarget.style.background=T.secondary;}}>Send</button>
      </form>
    </div>
  );
}

// ── Presence Panel — online users ────────────────────────────────────────────
function PresencePanel({ users, identity }) {
  if (users.length === 0) return null;
  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,
                 boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden",flexShrink:0}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
                   display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>👥</span>
        <span style={{fontWeight:700,fontSize:13,color:T.text}}>Online</span>
        <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,
                      background:`${T.success}20`,color:T.success,
                      padding:"2px 7px",borderRadius:99}}>{users.length}</span>
      </div>
      <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:4}}>
        {users.map((u) => {
          const isMe = u.userId === identity?.userId;
          return (
            <div key={u.userId} style={{display:"flex",alignItems:"center",gap:8,
                                        padding:"6px 8px",borderRadius:10,
                                        background:isMe?`${T.primary}08`:"transparent"}}>
              {/* Avatar circle */}
              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                           display:"flex",alignItems:"center",justifyContent:"center",
                           fontSize:11,fontWeight:800,color:"#fff",
                           background:u.color,boxShadow:`0 2px 6px ${u.color}50`}}>
                {u.label.replace("User ","U").slice(0,2)}
              </div>
              <span style={{fontSize:12,fontWeight:600,color:T.text}}>
                {isMe ? `${u.label} (you)` : u.label}
              </span>
              {/* Online dot */}
              <span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",
                            background:T.success,flexShrink:0}} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Floating Reactions overlay ────────────────────────────────────────────────
function ReactionsOverlay({ reactions }) {
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:50,overflow:"hidden"}}>
      {reactions.map((r) => (
        <div key={r.id} style={{
          position:"absolute",
          left:`${(r.x/1600)*100}%`,
          top:`${(r.y/900)*100}%`,
          fontSize:28,
          animation:"reactionFloat 2.5s ease-out forwards",
          pointerEvents:"none",
          filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}>
          {r.emoji}
          <span style={{
            position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",
            fontSize:9,fontWeight:700,color:r.color,whiteSpace:"nowrap",
            background:"rgba(255,255,255,0.9)",padding:"1px 5px",borderRadius:99,
            border:`1px solid ${r.color}40`,
          }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
export default function App() {
  const [tool,        setTool]        = useState("pen");
  const [color,       setColor]       = useState("#7c3aed");
  const [brushSize,   setBrushSize]   = useState(4);
  const [opacity,     setOpacity]     = useState(1);
  const [fillShape,   setFillShape]   = useState(false);
  const [strokeStyle, setStrokeStyle] = useState("solid");
  const [fontSize,    setFontSize]    = useState(24);
  const [showGrid,    setShowGrid]    = useState(false);
  const [canUndo,     setCanUndo]     = useState(false);
  const [canRedo,     setCanRedo]     = useState(false);
  const [chatMessages,  setChatMessages]  = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  // New features
  const [onlineUsers,   setOnlineUsers]   = useState([]);
  const [reactions,     setReactions]     = useState([]);
  const [chaosMsg,      setChaosMsg]      = useState("");
  const [showReactions, setShowReactions] = useState(false);

  const canvasRef     = useRef(null);
  const strokeHistory = useRef([]);

  function refreshUndoRedo() {
    setCanUndo(canvasRef.current?.canUndo()??false);
    setCanRedo(canvasRef.current?.canRedo()??false);
  }

  const handleRemoteStroke = useCallback((data)=>{ canvasRef.current?.drawRemoteStroke(data); strokeHistory.current.push(data); refreshUndoRedo(); },[]);
  const handleCursor   = useCallback((msg)=>setRemoteCursors((p)=>({...p,[msg.userId]:msg})),[]);
  const handleChat     = useCallback((msg)=>setChatMessages((p)=>[...p,msg]),[]);
  const handleClear    = useCallback(()=>{ canvasRef.current?.clear(); strokeHistory.current=[]; refreshUndoRedo(); },[]);
  const handleUndo     = useCallback(()=>{ canvasRef.current?.undo(); refreshUndoRedo(); },[]);
  const handleRedo     = useCallback(()=>{ canvasRef.current?.redo(); refreshUndoRedo(); },[]);
  const handleUserLeft = useCallback((msg)=>{
    setRemoteCursors((p)=>{ const n={...p}; delete n[msg.userId]; return n; });
    setOnlineUsers((p)=>p.filter(u=>u.userId!==msg.userId));
  },[]);
  const handleUserJoined = useCallback((msg)=>{
    setOnlineUsers((p)=>{ if(p.find(u=>u.userId===msg.userId)) return p; return [...p,{userId:msg.userId,color:msg.color,label:msg.label}]; });
  },[]);
  const handleOnlineList = useCallback((users)=>setOnlineUsers(users),[]);
  const handleReaction   = useCallback((msg)=>{
    const id = msg.id || Math.random().toString(36).slice(2);
    setReactions((p)=>[...p,{...msg,id}]);
    setTimeout(()=>setReactions((p)=>p.filter(r=>r.id!==id)),2600);
  },[]);

  const { connected, identity, send } = useWebSocket({
    onStroke:handleRemoteStroke, onCursor:handleCursor, onChat:handleChat,
    onClear:handleClear, onUndo:handleUndo, onRedo:handleRedo,
    onUserLeft:handleUserLeft, onUserJoined:handleUserJoined,
    onOnlineList:handleOnlineList, onReaction:handleReaction,
  });

  // Chaos mode — kill a random replica
  async function doChaos() {
    setChaosMsg("💥 Triggering chaos…");
    try {
      const res  = await fetch(`${GATEWAY_HTTP}/chaos`, { method:"POST" });
      const data = await res.json();
      const name = data.killed?.split(":")[1]?.replace("//","") ?? "a replica";
      setChaosMsg(`💀 Killed ${name}! Watch re-election…`);
    } catch {
      setChaosMsg("⚠️ Chaos failed (gateway unreachable)");
    }
    setTimeout(()=>setChaosMsg(""),4000);
  }

  // Send a reaction emoji
  function sendReaction(emoji) {
    // Place it in the center of the canvas
    const id = Math.random().toString(36).slice(2);
    const x  = 800 + (Math.random()-0.5)*400;
    const y  = 450 + (Math.random()-0.5)*200;
    send({ type:"reaction", emoji, x, y, id });
    setShowReactions(false);
  }

  useEffect(()=>{
    function onKey(e) {
      if((e.ctrlKey||e.metaKey)&&e.key==="z"){ e.preventDefault(); doUndo(); }
      if((e.ctrlKey||e.metaKey)&&e.key==="y"){ e.preventDefault(); doRedo(); }
      if((e.ctrlKey||e.metaKey)&&e.key==="="){ e.preventDefault(); canvasRef.current?.zoomIn(); }
      if((e.ctrlKey||e.metaKey)&&e.key==="-"){ e.preventDefault(); canvasRef.current?.zoomOut(); }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);

  function doUndo(){ if(canvasRef.current?.undo()) send({type:"undo"}); refreshUndoRedo(); }
  function doRedo(){ if(canvasRef.current?.redo()) send({type:"redo"}); refreshUndoRedo(); }
  function doClear(){ canvasRef.current?.clear(); strokeHistory.current=[]; send({type:"clear"}); refreshUndoRedo(); }
  function doSave(){
    const blob=new Blob([JSON.stringify({strokes:strokeHistory.current},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    Object.assign(document.createElement("a"),{href:url,download:"drawing.json"}).click();
    URL.revokeObjectURL(url);
  }
  function doDownloadPNG(){ canvasRef.current?.downloadPNG(); }

  // All tools including new Canva-style ones
  const TOOLS = [
    { id:"pen",       icon:"✏️",  label:"Pen"      },
    { id:"eraser",    icon:"🧽",  label:"Eraser"   },
    { id:"line",      icon:"╱",   label:"Line"     },
    { id:"arrow",     icon:"→",   label:"Arrow"    },
    { id:"rectangle", icon:"⬛",  label:"Rect"     },
    { id:"circle",    icon:"⭕",  label:"Circle"   },
    { id:"triangle",  icon:"△",   label:"Triangle" },
    { id:"star",      icon:"★",   label:"Star"     },
    { id:"text",      icon:"T",   label:"Text"     },
  ];

  const isShapeTool = ["rectangle","circle","triangle","star","line","arrow"].includes(tool);

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",
                 background:T.bg,color:T.text,fontFamily:"Inter,sans-serif"}}>

      {/* ── TOP TOOLBAR ─────────────────────────────────────────────────────── */}
      <div style={{height:60,display:"flex",alignItems:"center",justifyContent:"space-between",
                   padding:"0 20px",background:T.panel,flexShrink:0,
                   borderBottom:`1px solid ${T.border}`,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:9,marginRight:16}}>
          <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
                       background:`linear-gradient(135deg,${T.primary},#a855f7)`,
                       display:"flex",alignItems:"center",justifyContent:"center",
                       boxShadow:`0 3px 10px ${T.primary}40`}}>
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M3 15L6 6l5 6 2.5-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{fontSize:15,fontWeight:800,color:T.primary,lineHeight:1.1,letterSpacing:"-0.02em"}}>DrawSync</h1>
            <p style={{fontSize:9,color:T.textLight,lineHeight:1}}>Distributed Canvas</p>
          </div>
        </div>

        <Sep />

        {/* Color swatch + palette */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{cursor:"pointer"}}>
            <div style={{width:32,height:32,borderRadius:9,overflow:"hidden",flexShrink:0,
                         border:`2px solid ${T.border}`,background:color,
                         boxShadow:`0 2px 6px ${color}50`,cursor:"pointer"}}>
              <input type="color" value={color} onChange={(e)=>setColor(e.target.value)}
                style={{opacity:0,width:"100%",height:"100%",cursor:"pointer"}} />
            </div>
          </label>
          {/* Preset swatches */}
          <div style={{display:"flex",gap:3}}>
            {SWATCHES.map((s)=>(
              <button key={s} onClick={()=>setColor(s)}
                style={{width:18,height:18,borderRadius:5,background:s,border:color===s?`2px solid ${T.primary}`:`1px solid ${T.border}`,
                        cursor:"pointer",flexShrink:0,transition:"transform 0.1s"}}
                onMouseEnter={(e)=>e.currentTarget.style.transform="scale(1.2)"}
                onMouseLeave={(e)=>e.currentTarget.style.transform="scale(1)"} />
            ))}
          </div>
        </div>

        <Sep />

        {/* Brush size */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:T.textLight,fontWeight:500,whiteSpace:"nowrap"}}>Size</span>
          <input type="range" min="1" max="40" value={brushSize}
            onChange={(e)=>setBrushSize(Number(e.target.value))} style={{width:80}} />
          <div style={{width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{borderRadius:"50%",background:T.primary,flexShrink:0,
                         width:Math.max(3,Math.min(brushSize*0.5,14)),height:Math.max(3,Math.min(brushSize*0.5,14))}} />
          </div>
        </div>

        {/* Opacity */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,color:T.textLight,fontWeight:500}}>Opacity</span>
          <input type="range" min="0.1" max="1" step="0.05" value={opacity}
            onChange={(e)=>setOpacity(Number(e.target.value))} style={{width:70}} />
          <span style={{fontSize:10,color:T.textMuted,width:28,textAlign:"right"}}>
            {Math.round(opacity*100)}%
          </span>
        </div>

        <Sep />

        {/* Stroke style */}
        <div style={{display:"flex",gap:4}}>
          {[["solid","—"],["dashed","- -"],["dotted","···"]].map(([s,lbl])=>(
            <button key={s} onClick={()=>setStrokeStyle(s)}
              style={{padding:"4px 8px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                      border:`1.5px solid ${strokeStyle===s?T.primary:T.border}`,
                      background:strokeStyle===s?`${T.primary}12`:"transparent",
                      color:strokeStyle===s?T.primary:T.textMuted,transition:"all 0.12s"}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Fill toggle (shapes only) */}
        {isShapeTool && (
          <button onClick={()=>setFillShape(f=>!f)}
            style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                    border:`1.5px solid ${fillShape?T.primary:T.border}`,
                    background:fillShape?`${T.primary}12`:"transparent",
                    color:fillShape?T.primary:T.textMuted,transition:"all 0.12s"}}>
            {fillShape?"● Fill":"○ Outline"}
          </button>
        )}

        {/* Font size (text tool) */}
        {tool==="text" && (
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:10,color:T.textLight}}>Font</span>
            <input type="number" min="10" max="120" value={fontSize}
              onChange={(e)=>setFontSize(Number(e.target.value))}
              style={{width:52,padding:"3px 6px",borderRadius:7,border:`1px solid ${T.border}`,
                      fontSize:12,color:T.text,outline:"none"}} />
          </div>
        )}

        <Sep />

        {/* Action buttons */}
        <Btn onClick={doUndo} disabled={!canUndo}>↩ Undo</Btn>
        <Btn onClick={doRedo} disabled={!canRedo}>↪ Redo</Btn>
        <Btn onClick={doClear} color={T.accent} hov={T.accentHov}>✕ Clear</Btn>

        <Sep />

        {/* Zoom controls */}
        <div style={{display:"flex",gap:3}}>
          <Btn onClick={()=>canvasRef.current?.zoomOut()} sm color="#64748b" hov="#475569">−</Btn>
          <Btn onClick={()=>canvasRef.current?.resetZoom()} sm color="#64748b" hov="#475569">100%</Btn>
          <Btn onClick={()=>canvasRef.current?.zoomIn()} sm color="#64748b" hov="#475569">+</Btn>
        </div>

        {/* Grid toggle */}
        <button onClick={()=>{ setShowGrid(g=>!g); canvasRef.current?.toggleGrid(); }}
          style={{padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                  border:`1.5px solid ${showGrid?T.primary:T.border}`,
                  background:showGrid?`${T.primary}12`:"transparent",
                  color:showGrid?T.primary:T.textMuted,transition:"all 0.12s"}}>
          ⊞ Grid
        </button>

        <Sep />

        {/* Save / Export */}
        <Btn onClick={doSave} color={T.secondary} hov={T.secondaryH}>↓ JSON</Btn>
        <Btn onClick={doDownloadPNG} color="#059669" hov="#047857">🖼 PNG</Btn>

        <Sep />

        {/* 💥 Chaos Mode */}
        <div style={{position:"relative"}}>
          <Btn onClick={doChaos} color="#dc2626" hov="#b91c1c">💥 Chaos</Btn>
          {chaosMsg && (
            <div style={{position:"absolute",top:44,right:0,zIndex:100,
                         background:"#1e293b",color:"#fff",fontSize:12,fontWeight:600,
                         padding:"8px 14px",borderRadius:10,whiteSpace:"nowrap",
                         boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
              {chaosMsg}
            </div>
          )}
        </div>

        {/* 😄 Reactions */}
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowReactions(r=>!r)}
            style={{padding:"5px 11px",borderRadius:9,fontSize:18,cursor:"pointer",
                    border:`1.5px solid ${T.border}`,background:"transparent",
                    transition:"all 0.12s"}}
            onMouseEnter={(e)=>e.currentTarget.style.background="#f1f5f9"}
            onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
            😄
          </button>
          {showReactions && (
            <div style={{position:"absolute",top:44,right:0,zIndex:100,
                         background:T.panel,border:`1px solid ${T.border}`,
                         borderRadius:14,padding:10,display:"flex",gap:6,flexWrap:"wrap",
                         width:180,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
              {["👍","❤️","🔥","🎉","😂","👏","🚀","💡","⭐","😮"].map((e)=>(
                <button key={e} onClick={()=>sendReaction(e)}
                  style={{fontSize:22,background:"none",border:"none",cursor:"pointer",
                          borderRadius:8,padding:"4px 6px",transition:"transform 0.1s"}}
                  onMouseEnter={(ev)=>ev.currentTarget.style.transform="scale(1.3)"}
                  onMouseLeave={(ev)=>ev.currentTarget.style.transform="scale(1)"}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Connection */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 11px",borderRadius:99,fontSize:12,fontWeight:600,
                     background:connected?T.successBg:T.dangerBg,
                     border:`1px solid ${connected?T.successBdr:"#fecaca"}`,
                     color:connected?T.success:T.danger}}>
          <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                        background:connected?T.success:T.danger,
                        animation:connected?"pulse 2s infinite":"none"}} />
          {connected?"Connected":"Reconnecting…"}
        </div>
      </div>

      {/* ── MAIN AREA ───────────────────────────────────────────────────────── */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* LEFT SIDEBAR */}
        <div style={{width:74,background:T.panel,flexShrink:0,borderRight:`1px solid ${T.border}`,
                     display:"flex",flexDirection:"column",alignItems:"center",
                     padding:"12px 0",gap:4,boxShadow:"1px 0 3px rgba(0,0,0,0.04)"}}>
          <span style={{fontSize:8,fontWeight:700,color:T.textLight,textTransform:"uppercase",
                        letterSpacing:"0.1em",marginBottom:4}}>Tools</span>
          {TOOLS.map((t)=>{
            const active=tool===t.id;
            return (
              <button key={t.id} onClick={()=>setTool(t.id)} title={t.label}
                style={{width:50,height:50,borderRadius:13,border:"none",
                        display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",gap:2,cursor:"pointer",transition:"all 0.13s",
                        background:active?`${T.primary}12`:"transparent",
                        outline:active?`2px solid ${T.primary}40`:"2px solid transparent",
                        boxShadow:active?`0 3px 10px ${T.primary}20`:"none"}}
                onMouseEnter={(e)=>{ if(!active) e.currentTarget.style.background="#f1f5f9"; }}
                onMouseLeave={(e)=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
                <span style={{fontSize:t.id==="text"?16:18,lineHeight:1,fontWeight:t.id==="text"?"800":"normal",
                               color:active?T.primary:"inherit"}}>{t.icon}</span>
                <span style={{fontSize:8,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase",
                               color:active?T.primary:T.textLight}}>{t.label}</span>
              </button>
            );
          })}
          <div style={{flex:1}} />
          <button title="Collaborators"
            style={{width:50,height:50,borderRadius:13,border:"none",display:"flex",
                    alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer",
                    background:"transparent",transition:"background 0.13s"}}
            onMouseEnter={(e)=>e.currentTarget.style.background="#f1f5f9"}
            onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>👥</button>
        </div>

        {/* CANVAS CENTER */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
                     padding:20,overflow:"hidden",background:"#f1f5f9"}}>
          <div style={{position:"relative",overflow:"hidden",borderRadius:18,
                       width:"100%",maxWidth:920,aspectRatio:"16/9",background:"#ffffff",
                       border:`1px solid ${T.border}`,
                       boxShadow:"0 8px 32px rgba(0,0,0,0.1),0 2px 8px rgba(0,0,0,0.06)"}}>
            {/* Rainbow top accent */}
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,zIndex:10,
                         background:`linear-gradient(90deg,${T.primary},${T.secondary},${T.accent})`,
                         borderRadius:"18px 18px 0 0"}} />
            <Canvas
              ref={canvasRef}
              tool={tool} color={color} brushSize={brushSize}
              opacity={opacity} fillShape={fillShape}
              strokeStyle={strokeStyle} fontSize={fontSize}
              send={send} remoteCursors={remoteCursors}
            />
            <ReactionsOverlay reactions={reactions} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:286,display:"flex",flexDirection:"column",gap:10,
                     padding:10,overflowY:"auto",flexShrink:0,
                     background:T.bg,borderLeft:`1px solid ${T.border}`}}>
          <PresencePanel users={onlineUsers} identity={identity} />
          <ChatPanel messages={chatMessages} onSend={(text)=>send({type:"chat",text})} identity={identity} />
          <ClusterPanel connected={connected} />
        </div>

      </div>
    </div>
  );
}
