"use client";

import { useEffect, useState } from "react";
import { fetchTodayStats, subscribeToStats, DailyStats } from "@/lib/supabase";

export default function DailySummary() {
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
    return () => { sub.unsubscribe(); };
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const total = stats?.total_handled ?? 0;
  const qualified = stats?.qualified ?? 0;
  const booked = stats?.booked ?? 0;
  const closed = stats?.closed ?? 0;
  const revenue = stats?.revenue ?? 0;
  const dealsProgressed = stats?.deals_progressed ?? 0;
  const repliesReceived = stats?.replies_received ?? 0;

  const pipelineHealth = total > 0
    ? Math.round(((booked + closed) / total) * 100)
    : 0;

  const statCards = [
    { label: "Handled", value: total, color: "#ffffff" },
    { label: "Qualified", value: qualified, color: "#3b82f6" },
    { label: "Booked", value: booked, color: "#7c3aed" },
    { label: "Closed", value: closed, color: "#22c55e" },
  ];

  return (
    <div className="daily-summary">
      <div className="summary-header">
        <div className="summary-title">Today&apos;s Results</div>
        <div className="summary-date">{today}</div>
      </div>

      <div className="summary-stats-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="summary-stat-card">
            <div className="summary-stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="summary-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="revenue-line">
        <span className="revenue-amount">${revenue.toLocaleString()}</span>
        <span className="revenue-label">in DM revenue</span>
      </div>

      <div className="pipeline-section">
        <div className="pipeline-header">
          <span className="pipeline-label">Pipeline health</span>
          <span className="pipeline-pct">{pipelineHealth}%</span>
        </div>
        <div className="pipeline-bar-track">
          <div className="pipeline-bar-fill" style={{ width: `${pipelineHealth}%` }} />
        </div>
        <div className="pipeline-sub">
          {dealsProgressed} deals progressed · {repliesReceived} replies received
        </div>
      </div>
    </div>
  );
}
