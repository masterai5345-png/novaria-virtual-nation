"use client";

import { useEffect, useState } from "react";
import { Activity, Database, KeyRound, Server } from "lucide-react";

type RuntimeStatus = {
  database: string;
  authentication: string;
  orchestrator: string;
  worker?: { status: string; lastSeenAt: string | null };
  timestamp: string;
};

function label(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

export default function RuntimeHealth() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        const data = await response.json() as RuntimeStatus & { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not read runtime health.");
        if (mounted) {
          setStatus(data);
          setError("");
        }
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Runtime health unavailable.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const items = status ? [
    { label: "PostgreSQL", value: status.database, icon: <Database size={15}/> },
    { label: "Google OAuth", value: status.authentication, icon: <KeyRound size={15}/> },
    { label: "Claude API", value: status.orchestrator, icon: <Activity size={15}/> },
    { label: "AI worker", value: status.worker?.status ?? "unknown", icon: <Server size={15}/> },
  ] : [];

  return (
    <section className="runtime-health" aria-label="NOVARIA runtime health">
      <div className="runtime-health-heading">
        <span className="runtime-health-pulse" />
        <div><b>Runtime health</b><small>{status ? `Last checked ${new Date(status.timestamp).toLocaleTimeString()}` : "Connecting to owner status endpoint…"}</small></div>
      </div>
      <div className="runtime-health-items">
        {items.map((item) => (
          <div className="runtime-health-item" key={item.label}>
            <span>{item.icon}</span>
            <div><small>{item.label}</small><b>{label(item.value)}</b></div>
            <i className={["connected", "credentials-configured", "online"].includes(item.value) ? "is-good" : ["error", "stale", "database-unavailable"].includes(item.value) ? "is-bad" : ""} />
          </div>
        ))}
      </div>
      {error ? <p className="runtime-health-error">{error}</p> : null}
      <p className="runtime-health-note">Worker is marked online only when its heartbeat is newer than 45 seconds. Configured credentials alone do not mean an agent is running.</p>
    </section>
  );
}
