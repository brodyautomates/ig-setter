"use client";

import { useEffect, useState } from "react";
import { fetchTodayStats, subscribeToStats, DailyStats } from "@/lib/supabase";

export default function StatsBar() {
  const [stats, setStats] = useState<DailyStats | null>(null);

  const load = async () => {
    try {
      const data = await fetchTodayStats();
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    load();
    const sub = subscribeToStats(() => load());
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const totalHandled = stats?.total_handled ?? 0;
  const closed = stats?.closed ?? 0;
  const revenue = stats?.revenue ?? 0;

  return (
    <div className="stats-bar">
      <div className="stats-bar-inner">
        <div className="stat-item">
          <span className="stat-dot" />
          <span className="stat-label">
            <span className="stat-value">{totalHandled}</span> conversations active
          </span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-label">
            <span className="stat-value">{closed}</span> deals closed today
          </span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value stat-value--mint">
            ${revenue.toLocaleString()}
          </span>
          <span className="stat-label"> revenue</span>
        </div>
        <div className="stats-bar-right">
          <span className="live-badge">
            <span className="live-dot" />
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
