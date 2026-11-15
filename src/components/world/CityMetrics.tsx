"use client";

import { useEffect, useState } from "react";

type Overview = {
  source: "database" | "preview";
  database: string;
  activeCitizens: number | null;
  homes: number | null;
  districts?: number;
  mayor: { name: string; species: string };
  note?: string;
};

export default function CityMetrics({ compact = false }: { compact?: boolean }) {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/city/overview", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as Overview;
        if (mounted) setOverview(data);
      } catch {
        // Keep the explicitly-labelled preview figures if the API is temporarily unavailable.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!overview) {
    if (compact) return <span className="town-population-chip">28 warga demo</span>;
    return (
      <div className="quick-stats" aria-label="Preview city metrics">
        <div><small>DEMO HOMES</small><strong>842</strong></div>
        <div><small>NPC PREVIEW</small><strong>96</strong></div>
        <div><small>OPEN QUESTS</small><strong>3</strong></div>
      </div>
    );
  }

  if (overview.database !== "connected") {
    if (compact) return <span className="town-population-chip">28 warga demo</span>;
    return (
      <div className="quick-stats" aria-label="Preview city metrics">
        <div><small>DEMO HOMES</small><strong>842</strong></div>
        <div><small>NPC PREVIEW</small><strong>96</strong></div>
        <div><small>DATABASE</small><strong>OFF</strong></div>
      </div>
    );
  }

  if (compact) return <span className="town-population-chip">{(overview.activeCitizens ?? 0).toLocaleString("id-ID")} warga</span>;

  return (
    <div className="quick-stats" aria-label="Live city metrics">
      <div><small>REGISTERED CITIZENS</small><strong>{(overview.activeCitizens ?? 0).toLocaleString("en-US")}</strong></div>
      <div><small>COMMUNITY HOMES</small><strong>{(overview.homes ?? 0).toLocaleString("en-US")}</strong></div>
      <div><small>DISTRICTS</small><strong>{(overview.districts ?? 0).toLocaleString("en-US")}</strong></div>
    </div>
  );
}
