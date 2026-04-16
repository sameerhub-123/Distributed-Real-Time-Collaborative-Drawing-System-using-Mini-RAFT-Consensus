/**
 * ClusterPanel — shows live RAFT cluster status.
 * Polls GET /cluster-status on the gateway every 2 seconds.
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const GATEWAY_HTTP = import.meta.env.VITE_GATEWAY_HTTP || "http://localhost:3000";

const STATE_COLORS = {
  LEADER:      "text-success",
  FOLLOWER:    "text-accent",
  CANDIDATE:   "text-yellow-400",
  UNREACHABLE: "text-danger",
};

export default function ClusterPanel({ onClusterInfo }) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res  = await fetch(`${GATEWAY_HTTP}/cluster-status`);
        const data = await res.json();
        setNodes(data);

        // Bubble up summary to parent (for toolbar display)
        const leader = data.find((n) => n.state === "LEADER");
        const alive  = data.filter((n) => n.state !== "UNREACHABLE").length;
        onClusterInfo?.({
          leader: leader?.nodeId ?? null,
          term:   leader?.currentTerm ?? "?",
          alive,
        });
      } catch {
        // Gateway not ready yet
      }
    }

    fetchStatus();
    const id = setInterval(fetchStatus, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="flex flex-col w-48 bg-panel border-l border-border shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">Cluster</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {nodes.map((node) => (
          <motion.div
            key={node.url}
            layout
            className="bg-surface rounded-xl p-2.5 border border-border"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text">{node.nodeId ?? node.url.split(":")[1]}</span>
              <span className={`text-xs font-bold ${STATE_COLORS[node.state] ?? "text-muted"}`}>
                {node.state === "LEADER" ? "👑" : node.state === "UNREACHABLE" ? "💀" : "●"}{" "}
                {node.state}
              </span>
            </div>
            {node.state !== "UNREACHABLE" && (
              <div className="flex gap-2 text-xs text-muted">
                <span>T{node.currentTerm}</span>
                <span>Log:{node.logLength}</span>
              </div>
            )}
          </motion.div>
        ))}

        {nodes.length === 0 && (
          <p className="text-xs text-muted text-center mt-4">Connecting to cluster…</p>
        )}
      </div>
    </aside>
  );
}
