"use client";

import { useCallback, useEffect, useState } from "react";
import { Home, RefreshCw } from "lucide-react";

type HomeInfo = {
  configured: boolean;
  home: null | { id: string; type: string; designKey: string; plotKey: string; district: string };
  availableHomes: number | null;
};

export default function HouseClaimCard() {
  const [info, setInfo] = useState<HomeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/citizen/home", { cache: "no-store" });
      const data = await response.json() as HomeInfo & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load home status.");
      setInfo(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load home status.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/citizen/home", { method: "POST" });
      const data = await response.json() as { error?: string; alreadyClaimed?: boolean };
      if (!response.ok) throw new Error(data.error || "Could not claim a home.");
      setMessage(data.alreadyClaimed ? "You already have a home in NOVARIA." : "Your community home has been claimed!");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not claim a home.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="house-claim-card">
      <div className="house-claim-icon"><Home size={20}/></div>
      <div className="house-claim-content">
        <span className="eyebrow">YOUR PLACE IN NOVARIA</span>
        <h3>{info?.home ? "Your NOVARIA home" : "Claim your first home"}</h3>
        {info?.home ? (
          <p>{info.home.type.replaceAll("_", " ")} · {info.home.district} · Plot {info.home.plotKey}</p>
        ) : info?.configured ? (
          <p>{info.availableHomes === 0 ? "The founding neighborhood is waiting for its first houses." : `${info.availableHomes ?? 0} community homes are currently available to claim.`}</p>
        ) : (
          <p>Connect the citizen database to claim and save your home.</p>
        )}
        {info?.configured && !info.home ? <button type="button" disabled={busy || info.availableHomes === 0} onClick={() => void claim()}>{busy ? "Claiming…" : "Claim a community home"}</button> : null}
        {message ? <small className="house-claim-success">{message}</small> : null}
        {error ? <small className="house-claim-error">{error}</small> : null}
      </div>
      <button className="house-claim-refresh" type="button" aria-label="Refresh home status" onClick={() => void refresh()}><RefreshCw size={14}/></button>
    </section>
  );
}
