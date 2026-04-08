"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DMThread, DMMessage, fetchMessages, subscribeToMessages } from "@/lib/supabase";

interface ConversationChainProps {
  thread: DMThread;
}

export default function ConversationChain({ thread }: ConversationChainProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages(thread.id);
      setMessages(data);
    } catch {}
  }, [thread.id]);

  useEffect(() => {
    loadMessages();
    const sub = subscribeToMessages(thread.id, () => loadMessages());
    return () => { sub.unsubscribe(); };
  }, [thread.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const statusLabel = {
    active: "Active — AI is handling this",
    qualified: "Qualified — awaiting next step",
    booked: "Call Booked",
    closed: "Deal Closed",
  }[thread.status];

  return (
    <div className="conversation-chain">
      <div className="chain-header">
        <div className="chain-header-left">
          <div
            className="chain-avatar"
            style={{
              backgroundColor: thread.avatar_color + "22",
              borderColor: thread.avatar_color + "44",
            }}
          >
            <span style={{ color: thread.avatar_color }}>
              {thread.avatar_initial}
            </span>
          </div>
          <div className="chain-header-info">
            <span className="chain-username">@{thread.username}</span>
            <span className={`chain-status-label chain-status--${thread.status}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="chain-header-right">
          {thread.status === "active" && (
            <div className="ai-running-badge">
              <span className="ai-running-dot" />
              AI Running
            </div>
          )}
          {thread.status === "closed" && <div className="closed-badge">Deal Closed ✓</div>}
          {thread.status === "booked" && <div className="booked-badge">Call Booked ✓</div>}
        </div>
      </div>

      <div className="messages-list">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`message-row message-row--${msg.direction}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {msg.direction === "outbound" && msg.is_ai && (
              <div className="ai-badge-inline">AI</div>
            )}
            {msg.direction === "outbound" && msg.override && (
              <div className="ai-badge-inline" style={{ color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}>OVERRIDE</div>
            )}
            <div
              className={`message-bubble ${
                msg.direction === "inbound" ? "bubble--inbound" : "bubble--outbound"
              }`}
            >
              {msg.content}
            </div>
            <span className="message-time">
              {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}

        {thread.status === "active" && thread.pending_ai_draft && (
          <div className="message-row message-row--outbound composing-row">
            <div className="ai-badge-inline ai-badge--composing">AI</div>
            <div className="bubble--composing">
              <span className="composing-typing">
                <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="typing-dot" style={{ animationDelay: "200ms" }} />
                <span className="typing-dot" style={{ animationDelay: "400ms" }} />
              </span>
              <span className="composing-preview">{thread.pending_ai_draft}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
