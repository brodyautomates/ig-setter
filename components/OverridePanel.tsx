"use client";

import { useState } from "react";
import { DMThread } from "@/lib/supabase";

interface OverridePanelProps {
  thread: DMThread;
  onSent: () => void;
}

export default function OverridePanel({ thread, onSent }: OverridePanelProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOverride = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: thread.id, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Send failed");
      }

      setSent(true);
      setMessage("");
      onSent();
      setTimeout(() => setSent(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const hasDraft = thread.pending_ai_draft && thread.status === "active";

  return (
    <div className="override-panel">
      <div className="override-header">
        <div className="override-title">Manual Override</div>
        <div className="override-subtitle">Jump in and send your own message</div>
      </div>

      {hasDraft && (
        <div className="draft-preview">
          <div className="draft-preview-label">
            <span className="draft-dot" />
            AI Draft — pending send
          </div>
          <div className="draft-preview-text">{thread.pending_ai_draft}</div>
        </div>
      )}

      {!hasDraft && thread.status !== "active" && (
        <div className="no-draft-state">
          <span className="no-draft-icon">
            {thread.status === "closed" ? "✓" : thread.status === "booked" ? "📅" : "→"}
          </span>
          <span className="no-draft-text">
            {thread.status === "closed"
              ? "Deal closed — no action needed"
              : thread.status === "booked"
              ? "Call booked — AI on standby"
              : "AI is monitoring for a reply"}
          </span>
        </div>
      )}

      <div className="override-input-area">
        <textarea
          className="override-textarea"
          placeholder="Type a custom message to send instead..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          disabled={sending}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", padding: "0 2px" }}>{error}</div>
      )}

      <div className="override-actions">
        <button
          className={`btn-override ${sent ? "btn-override--sent" : ""}`}
          onClick={handleSendOverride}
          disabled={!message.trim() || sending || sent}
        >
          {sending ? "Sending…" : sent ? "Sent ✓" : "Send Override"}
        </button>
      </div>
    </div>
  );
}
