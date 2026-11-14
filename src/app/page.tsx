"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import CitizenButton from "@/components/auth/CitizenButton";
import CityMetrics from "@/components/world/CityMetrics";
import WorldCanvas from "@/components/world/WorldCanvas";

type Panel = "overview" | "missions" | "homes" | "citizens";
type Mission = {
  missionKey: string;
  title: string;
  detail: string;
  rewardNvc: number;
  completed: boolean;
  status?: string;
};
type MissionResponse = {
  source: "database" | "preview";
  authenticated: boolean;
  missions: Mission[];
  wallet: { balanceNvc: number; cashValue: 0 } | null;
  note?: string;
};

const previewMissions: Mission[] = [
  { missionKey: "welcome-to-novaria", title: "Welcome to NOVARIA", detail: "Explore the town square and meet Mayor Otti.", rewardNvc: 120, completed: false },
  { missionKey: "visit-the-harbor", title: "Visit the Harbor", detail: "Explore the waterfront district and discover the harbor.", rewardNvc: 180, completed: false },
  { missionKey: "help-the-town", title: "Help the Town", detail: "Visit City Hall and review the latest town proposal.", rewardNvc: 250, completed: false },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [panel, setPanel] = useState<Panel>("overview");
  const [missions, setMissions] = useState<Mission[]>(previewMissions);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [missionSource, setMissionSource] = useState<"loading" | "preview" | "database">("loading");
  const [missionBusy, setMissionBusy] = useState("");
  const [missionMessage, setMissionMessage] = useState("");
  const [missionError, setMissionError] = useState("");

  const nav = useMemo(
    () => [
      { id: "overview" as const, label: "Town overview" },
      { id: "missions" as const, label: "Missions" },
      { id: "homes" as const, label: "Homes" },
      { id: "citizens" as const, label: "Citizens" },
    ],
    [],
  );

  const refreshMissions = useCallback(async () => {
    try {
      const response = await fetch("/api/missions", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as MissionResponse;
      if (Array.isArray(data.missions)) setMissions(data.missions);
      setMissionSource(data.source);
      setWalletBalance(data.wallet?.balanceNvc ?? null);
    } catch {
      setMissionSource("preview");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshMissions(), 0);
    return () => window.clearTimeout(initial);
  }, [refreshMissions]);

  async function completeMission(mission: Mission) {
    if (!session?.user?.id) {
      setMissionError("Sign in with Google to complete missions and save your citizen progress.");
      return;
    }
    if (missionSource !== "database") {
      setMissionError("Citizen database is not connected yet. Your progress cannot be saved.");
      return;
    }
    if (mission.completed || missionBusy) return;

    setMissionBusy(mission.missionKey);
    setMissionError("");
    setMissionMessage("");
    try {
      const response = await fetch(`/api/missions/${mission.missionKey}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmExploration: true }),
      });
      const data = await response.json() as {
        error?: string;
        rewardNvc?: number;
        balanceNvc?: number;
      };
      if (!response.ok) throw new Error(data.error || "Mission could not be completed.");
      setMissions((current) => current.map((item) =>
        item.missionKey === mission.missionKey
          ? { ...item, completed: true, status: "Completed" }
          : item,
      ));
      setWalletBalance(data.balanceNvc ?? null);
      setMissionMessage(`Mission completed. +${data.rewardNvc ?? mission.rewardNvc} NVC added to your non-cash game wallet.`);
    } catch (caught) {
      setMissionError(caught instanceof Error ? caught.message : "Mission could not be completed.");
      await refreshMissions();
    } finally {
      setMissionBusy("");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="NOVARIA home">
          <span className="brand-mark">N</span>
          <span><strong>NOVARIA</strong><small>A LIVING VIRTUAL NATION</small></span>
        </Link>
        <div className="topbar-right">
          <span className="online-pill"><i /> WORLD PREVIEW</span>
          <CitizenButton />
        </div>
      </header>

      <section className="hero-grid">
        <div className="world-frame">
          <WorldCanvas />
          <div className="world-vignette" />
          <div className="world-title">
            <span className="eyebrow">WELCOME TO YOUR NEXT HOME</span>
            <h1>Find your place<br /><em>in NOVARIA.</em></h1>
            <p>A small coastal town with a big future. Explore, meet the citizens, and help shape what comes next.</p>
            <div className="world-actions">
              <button type="button" className="primary-button" onClick={() => setPanel("missions")}>Explore missions <span>↗</span></button>
              <span className="world-note">3D interactive preview · desktop & mobile</span>
            </div>
          </div>
          <div className="world-chip chip-population"><span className="chip-icon">⌂</span><span><small>DEMO POPULATION</small><b>1,284</b></span></div>
          <div className="world-chip chip-mayor"><span className="mayor-avatar">🦦</span><span><small>YOUR MAYOR</small><b>Mayor Otti</b></span></div>
          <div className="world-controls-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>
        </div>

        <aside className="side-panel">
          <div className="mayor-card">
            <div className="mayor-copy">
              <span className="eyebrow">A MESSAGE FROM CITY HALL</span>
              <h2>Welcome, future citizen.</h2>
              <p>Mayor Otti is preparing the town for its next chapter. Come explore what we are building together.</p>
              <button type="button" className="text-button" onClick={() => setPanel("citizens")}>Meet the town <span>→</span></button>
            </div>
            <div className="mayor-art" aria-label="Otter mayor mascot" role="img">🦦</div>
          </div>

          <div className="wallet-card">
            <div><span className="eyebrow">CITIZEN GAME WALLET</span><small>NOVA COIN · NON-CASH</small></div>
            <strong>{walletBalance === null ? "—" : walletBalance.toLocaleString("en-US")} <span>NVC</span></strong>
            <p>{walletBalance === null ? "Sign in and connect the citizen database to load your balance." : "Game balance only · cannot be withdrawn or exchanged for cash."}</p>
          </div>

          <CityMetrics />
        </aside>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR NOVARIA</span><h2>Explore the town</h2></div>
          <span className="section-caption">A living world, one day at a time. Preview metrics are labelled.</span>
        </div>
        <nav className="section-tabs" aria-label="Town sections">
          {nav.map((item) => (
            <button key={item.id} type="button" className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}>{item.label}</button>
          ))}
        </nav>

        {panel === "overview" && (
          <div className="feature-grid">
            <article className="feature-card feature-green"><span className="feature-icon">⌂</span><small>RESIDENTIAL DISTRICT</small><h3>Find a home</h3><p>Discover modern starter homes, family houses, and future neighborhoods.</p><button type="button" onClick={() => setPanel("homes")}>Explore homes →</button></article>
            <article className="feature-card feature-sand"><span className="feature-icon">⚑</span><small>DAILY ADVENTURES</small><h3>Make your mark</h3><p>Complete town missions and earn non-cash NOVA Coins in your citizen wallet.</p><button type="button" onClick={() => setPanel("missions")}>View missions →</button></article>
            <article className="feature-card feature-blue"><span className="feature-icon">♙</span><small>COMMUNITY</small><h3>Meet your neighbors</h3><p>Get to know the citizens and discover the people behind the town.</p><button type="button" onClick={() => setPanel("citizens")}>Meet citizens →</button></article>
          </div>
        )}

        {panel === "missions" && (
          <div className="mission-list">
            {missionSource === "loading" ? <p className="mission-feedback">Loading missions…</p> : null}
            {missions.map((mission) => (
              <article className="mission-row" key={mission.missionKey}>
                <div className="mission-symbol">✦</div>
                <div className="mission-copy"><h3>{mission.title}</h3><p>{mission.detail}</p></div>
                <strong className="mission-reward">+{mission.rewardNvc} NVC</strong>
                <button
                  className="small-action"
                  type="button"
                  disabled={mission.completed || missionBusy === mission.missionKey || missionSource !== "database" || !session?.user?.id}
                  onClick={() => void completeMission(mission)}
                >
                  {mission.completed ? "Completed" : missionBusy === mission.missionKey ? "Saving…" : !session?.user?.id ? "Sign in" : missionSource !== "database" ? "Coming soon" : "Complete"}
                </button>
              </article>
            ))}
            <p className="mission-feedback">Mission completion is currently self-confirmed. NOVA Coin is a non-cash game balance and cannot be withdrawn.</p>
            {missionMessage ? <p className="mission-success" role="status">{missionMessage}</p> : null}
            {missionError ? <p className="mission-error" role="alert">{missionError}</p> : null}
          </div>
        )}

        {panel === "homes" && (
          <div className="home-grid">
            {[["Starter Home","A practical first home","01"],["Family Home","Room to grow together","02"],["Premium Residence","A refined modern address","03"],["Patron Estate","A prestige cosmetic residence","04"]].map(([name, detail, num]) => <article className="home-card" key={name}><div className={`home-swatch home-${num}`}><span>{num}</span></div><div><h3>{name}</h3><p>{detail}</p></div></article>)}
          </div>
        )}

        {panel === "citizens" && (
          <div className="citizen-panel"><div className="citizen-mascot">🦦</div><div><span className="eyebrow">CITY HALL</span><h3>Mayor Otti</h3><p>Your town’s official otter mayor. Otti’s announcements and city decisions will be connected to verified city data.</p></div></div>
        )}
      </section>

      <footer className="site-footer"><span>© NOVARIA · FOUNDING EDITION</span><span>Virtual world preview · NOVA Coin has no cash value</span></footer>
    </main>
  );
}
