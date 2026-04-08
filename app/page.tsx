"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchThreads,
  subscribeToThreads,
  subscribeToMessages,
  DMThread,
} from "@/lib/supabase";
import StatsBar from "@/components/StatsBar";
import ThreadFeed from "@/components/ThreadFeed";
import ConversationChain from "@/components/ConversationChain";
import OverridePanel from "@/components/OverridePanel";
import DailySummary from "@/components/DailySummary";
import StatusBanner from "@/components/StatusBanner";

export default function Home() {
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    try {
      const data = await fetchThreads();
      setThreads(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadThreads();
    const threadSub = subscribeToThreads(() => loadThreads());
    return () => {
      threadSub.unsubscribe();
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) return;
    const msgSub = subscribeToMessages(selectedId, () => loadThreads());
    return () => {
      msgSub.unsubscribe();
    };
  }, [selectedId, loadThreads]);

  const selectedThread = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="app-shell">
      <StatusBanner />

      <header className="app-nav">
        <div className="app-nav-brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">ig-setter</span>
        </div>
        <StatsBar />
        <div className="app-nav-right">
          <div className="nav-avatar">◈</div>
        </div>
      </header>

      <main className="app-main">
        <aside className="col-left">
          <ThreadFeed
            threads={threads}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
        </aside>

        <section className="col-center">
          {selectedThread ? (
            <ConversationChain thread={selectedThread} />
          ) : (
            <div className="empty-state">
              {loading
                ? "Loading conversations…"
                : "No conversations yet. DMs will appear here in real-time."}
            </div>
          )}
        </section>

        <aside className="col-right">
          {selectedThread && (
            <OverridePanel thread={selectedThread} onSent={loadThreads} />
          )}
          <DailySummary />
        </aside>
      </main>
    </div>
  );
}
