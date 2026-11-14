"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CitizenButton from "@/components/auth/CitizenButton";
import WorldCanvas from "@/components/world/WorldCanvas";

type Panel = "overview" | "missions" | "homes" | "citizens";

const missions = [
  { title: "Welcome to NOVARIA", detail: "Explore the town square and meet Mayor Otti.", reward: 120, status: "Available" },
  { title: "Visit the Harbor", detail: "Walk to the pier and discover the coastal district.", reward: 180, status: "Available" },
  { title: "Help the Town", detail: "Visit the City Hall and review the latest town proposal.", reward: 250, status: "Coming soon" },
];

export default function HomePage() {
  const [panel, setPanel] = useState<Panel>("overview");
  const [coins, setCoins] = useState(1250);
  const [completed, setCompleted] = useState<string[]>([]);
  const nav = useMemo(
    () => [
      { id: "overview" as const, label: "Town overview" },
      { id: "missions" as const, label: "Missions" },
      { id: "homes" as const, label: "Homes" },
      { id: "citizens" as const, label: "Citizens" },
    ],
    [],
  );

  function completeMission(title: string, reward: number) {
    if (completed.includes(title)) return;
    setCompleted((current) => [...current, title]);
    setCoins((current) => current + reward);
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
            <div><span className="eyebrow">DEMO WALLET</span><small>NOVA COIN</small></div>
            <strong>{coins.toLocaleString("en-US")} <span>NVC</span></strong>
            <p>Preview balance only · no cash value</p>
          </div>

          <div className="quick-stats">
            <div><small>SAMPLE HOMES</small><strong>842</strong></div>
            <div><small>NPC PREVIEW</small><strong>96</strong></div>
            <div><small>OPEN QUESTS</small><strong>{missions.length - completed.length}</strong></div>
          </div>
        </aside>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR NOVARIA</span><h2>Explore the town</h2></div>
          <span className="section-caption">A living world, one day at a time. Metrics shown are prototype values.</span>
        </div>
        <nav className="section-tabs" aria-label="Town sections">
          {nav.map((item) => (
            <button key={item.id} type="button" className={panel === item.id ? "active" : ""} onClick={() => setPanel(item.id)}>{item.label}</button>
          ))}
        </nav>

        {panel === "overview" && (
          <div className="feature-grid">
            <article className="feature-card feature-green"><span className="feature-icon">⌂</span><small>RESIDENTIAL DISTRICT</small><h3>Find a home</h3><p>Discover modern starter homes, family houses, and future neighborhoods.</p><button type="button" onClick={() => setPanel("homes")}>Explore homes →</button></article>
            <article className="feature-card feature-sand"><span className="feature-icon">⚑</span><small>DAILY ADVENTURES</small><h3>Make your mark</h3><p>Complete town missions and earn demo NOVA Coins as you explore.</p><button type="button" onClick={() => setPanel("missions")}>View missions →</button></article>
            <article className="feature-card feature-blue"><span className="feature-icon">♙</span><small>COMMUNITY</small><h3>Meet your neighbors</h3><p>Get to know the citizens and discover the people behind the town.</p><button type="button" onClick={() => setPanel("citizens")}>Meet citizens →</button></article>
          </div>
        )}

        {panel === "missions" && (
          <div className="mission-list">
            {missions.map((mission) => {
              const done = completed.includes(mission.title);
              return <article className="mission-row" key={mission.title}><div className="mission-symbol">✦</div><div className="mission-copy"><h3>{mission.title}</h3><p>{mission.detail}</p></div><strong className="mission-reward">+{mission.reward} NVC</strong><button className="small-action" type="button" disabled={done || mission.status !== "Available"} onClick={() => completeMission(mission.title, mission.reward)}>{done ? "Completed" : mission.status === "Available" ? "Start" : "Soon"}</button></article>;
            })}
          </div>
        )}

        {panel === "homes" && (
          <div className="home-grid">
            {[["Starter Home","A practical first home","01"],["Family Home","Room to grow together","02"],["Premium Residence","A refined modern address","03"],["Patron Estate","A prestige cosmetic residence","04"]].map(([name, detail, num]) => <article className="home-card" key={name}><div className={`home-swatch home-${num}`}><span>{num}</span></div><div><h3>{name}</h3><p>{detail}</p></div></article>)}
          </div>
        )}

        {panel === "citizens" && (
          <div className="citizen-panel"><div className="citizen-mascot">🦦</div><div><span className="eyebrow">CITY HALL</span><h3>Mayor Otti</h3><p>Your town’s official otter mayor. Otti’s announcements and city decisions will be connected to verified NOVARIA data in a later milestone.</p></div></div>
        )}
      </section>

      <footer className="site-footer"><span>© NOVARIA · FOUNDING EDITION</span><span>Virtual world preview · Demo balances have no cash value</span></footer>
    </main>
  );
}