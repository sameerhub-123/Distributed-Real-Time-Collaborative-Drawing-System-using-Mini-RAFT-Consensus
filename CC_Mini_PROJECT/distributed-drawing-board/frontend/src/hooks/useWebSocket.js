/**
 * useWebSocket — manages the WebSocket connection to the gateway.
 * Handles auto-reconnect, identity assignment, and message routing.
 */
import { useEffect, useRef, useCallback, useState } from "react";

const GATEWAY_WS = import.meta.env.VITE_GATEWAY_WS || "ws://localhost:3000";

export function useWebSocket({ onStroke, onCursor, onChat, onClear, onUndo, onRedo, onUserJoined, onUserLeft, onReaction, onOnlineList }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState(null); // { userId, color, label }

  const connect = useCallback(() => {
    const ws = new WebSocket(GATEWAY_WS);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "identity":    setIdentity({ userId: msg.userId, color: msg.color, label: msg.label }); break;
        case "stroke":      onStroke?.(msg.data); break;
        case "cursor":      onCursor?.(msg); break;
        case "chat":        onChat?.(msg); break;
        case "clear":       onClear?.(); break;
        case "undo":        onUndo?.(msg); break;
        case "redo":        onRedo?.(msg); break;
        case "user_joined": onUserJoined?.(msg); break;
        case "user_left":   onUserLeft?.(msg); break;
        case "reaction":    onReaction?.(msg); break;
        case "online_list": onOnlineList?.(msg.users); break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 2000); // auto-reconnect
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  /** Send any message to the gateway */
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, identity, send };
}
