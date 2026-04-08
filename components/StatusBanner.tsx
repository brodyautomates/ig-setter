"use client";

import { useEffect, useState } from "react";

interface StatusChecks {
  supabase: boolean;
  n8n: boolean;
  anthropic: boolean;
  instagram: boolean;
}

export default function StatusBanner() {
  const [checks, setChecks] = useState<StatusChecks | null>(null);
  const [allOk, setAllOk] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setChecks(data.checks);
        setAllOk(data.ok);
      })
      .catch(() => {});
  }, []);

  if (!checks || allOk) return null;

  const missing = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return (
    <div className="status-banner">
      <span className="status-banner-icon">⚠</span>
      <span className="status-banner-text">
        Setup incomplete — missing:{" "}
        {missing.map((m, i) => (
          <span key={m}>
            <strong>{m}</strong>
            {i < missing.length - 1 ? ", " : ""}
          </span>
        ))}
        . See the{" "}
        <a
          href="https://github.com/brodyautomates/ig-setter/blob/main/docs/SETUP.md"
          target="_blank"
          rel="noreferrer"
          className="status-banner-link"
        >
          Setup Guide
        </a>{" "}
        to finish configuration.
      </span>
    </div>
  );
}
