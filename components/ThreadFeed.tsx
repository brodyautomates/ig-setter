"use client";

import { DMThread, ThreadStatus } from "@/lib/supabase";

interface ThreadFeedProps {
  threads: DMThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const STATUS_CONFIG: Record<ThreadStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "badge--active" },
  qualified: { label: "Qualified", className: "badge--qualified" },
  booked: { label: "Booked", className: "badge--booked" },
  closed: { label: "Closed", className: "badge--closed" },
};

export default function ThreadFeed({ threads, selectedId, onSelect, loading }: ThreadFeedProps) {
  const activeCount = threads.filter((t) => t.status === "active").length;

  return (
    <div className="thread-feed">
      <div className="thread-feed-header">
        <div className="thread-feed-title">
          <span className="feed-title-text">Conversations</span>
          <span className="live-indicator">
            <span className="live-indicator-dot" />
          </span>
        </div>
        <div className="thread-feed-meta">
          <span className="active-count">{activeCount} active</span>
        </div>
      </div>

      <div className="thread-list">
        {loading && <div className="thread-skeleton">Loading…</div>}
        {!loading && threads.length === 0 && (
          <div className="thread-empty">
            No DMs yet. Messages will appear here in real-time once your workflow is live.
          </div>
        )}
        {threads.map((thread) => {
          const { label, className } = STATUS_CONFIG[thread.status];
          const isSelected = thread.id === selectedId;

          return (
            <button
              key={thread.id}
              className={`thread-card ${isSelected ? "thread-card--selected" : ""}`}
              onClick={() => onSelect(thread.id)}
            >
              <div
                className="thread-avatar"
                style={{
                  backgroundColor: thread.avatar_color + "22",
                  borderColor: thread.avatar_color + "44",
                }}
              >
                <span style={{ color: thread.avatar_color }}>{thread.avatar_initial}</span>
              </div>

              <div className="thread-card-body">
                <div className="thread-card-top">
                  <span className="thread-username">@{thread.username}</span>
                  <span className="thread-timestamp">{thread.last_timestamp}</span>
                </div>
                <div className="thread-card-bottom">
                  <span className="thread-preview">{thread.last_message}</span>
                  <span className={`status-badge ${className}`}>{label}</span>
                </div>
                {thread.status === "active" && thread.pending_ai_draft && (
                  <div className="ai-typing">
                    <span className="ai-typing-text">AI composing</span>
                    <span className="typing-dots">
                      <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                      <span className="typing-dot" style={{ animationDelay: "200ms" }} />
                      <span className="typing-dot" style={{ animationDelay: "400ms" }} />
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
