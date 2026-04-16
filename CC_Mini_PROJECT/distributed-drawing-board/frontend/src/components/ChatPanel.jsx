import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* Deterministic avatar color from userId string */
function avatarColor(str = "") {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

/* Avatar circle with initials */
function Avatar({ label = "?", userId = "" }) {
  const bg  = avatarColor(userId);
  const ini = label.replace("User ", "U").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: bg, boxShadow: `0 0 8px ${bg}55` }}>
      {ini}
    </div>
  );
}

export default function ChatPanel({ messages, onSend, identity }) {
  const [input, setInput] = useState("");
  const bottomRef         = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text); setInput("");
  }

  const isMe = (msg) => msg.userId === identity?.userId;

  return (
    <div className="glass rounded-2xl flex flex-col overflow-hidden"
      style={{ minHeight: 0, maxHeight: "55%" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-sm font-semibold text-t1">Chat</span>
        <button className="text-t3 hover:text-t2 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="2" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="12" cy="7" r="1"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-t3 text-center mt-4">No messages yet 👋</p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const mine = isMe(msg);
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-start gap-2"
              >
                <Avatar label={msg.label} userId={msg.userId} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-t1">{mine ? "You" : msg.label}</span>
                    <span className="text-[10px] text-t3">
                      {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={[
                    "text-xs px-3 py-2 rounded-xl rounded-tl-sm break-words max-w-[180px]",
                    mine
                      ? "text-white"
                      : "bg-white/8 text-t1 border border-white/8",
                  ].join(" ")}
                    style={mine ? { background: avatarColor(msg.userId) } : {}}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/8">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a message..."
          maxLength={200}
          className="flex-1 min-w-0 bg-white/6 border border-white/10 rounded-xl
                     px-3 py-2 text-xs text-t1 placeholder:text-t3
                     outline-none focus:border-indigo/50 transition-colors"
        />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
          type="submit" disabled={!input.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white
                     disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          Send
        </motion.button>
      </form>
    </div>
  );
}
