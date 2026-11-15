"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Compass,
  Home,
  Landmark,
  MapPinned,
  PawPrint,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import CitizenButton from "@/components/auth/CitizenButton";
import CityMetrics from "@/components/world/CityMetrics";
import WorldCanvas from "@/components/world/WorldCanvas";
import { ANIMAL_EMOJI, ANIMAL_LABELS, CITIZEN_SPECIES, isCitizenSpecies } from "@/lib/animals";

type TownPanel = "overview" | "missions" | "districts" | "residents" | null;
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
};

const previewMissions: Mission[] = [
  { missionKey: "welcome-to-novaria", title: "Meet Mayor Otti", detail: "Visit City Hall and explore the civic plaza.", rewardNvc: 120, completed: false },
  { missionKey: "visit-the-harbor", title: "Discover the waterfront", detail: "Walk along the coastal promenade and look around the harbor.", rewardNvc: 180, completed: false },
  { missionKey: "help-the-town", title: "Help shape the city", detail: "Visit the town center and review a city proposal.", rewardNvc: 250, completed: false },
];

const districts = [
  { icon: Landmark, name: "City Hall", category: "GOVERNMENT", description: "Mayor Otti's civic headquarters and the heart of the city." },
  { icon: Building2, name: "Central Business District", category: "CITY CENTER", description: "A modern skyline of glass towers, offices and city landmarks." },
  { icon: Sparkles, name: "Modern Market", category: "COMMERCE", description: "A lively shopping square with stores, cafés and local activity." },
  { icon: Compass, name: "Green Park", category: "PUBLIC SPACE", description: "A leafy city park with walking paths, trees and a central fountain." },
  { icon: Home, name: "Harbor View", category: "RESIDENTIAL", description: "The growing neighborhood where citizens can claim a community home." },
];

export default function NovariaWorldExperience() {
  const { data: session } = useSession();
  const [panel, setPanel] = useState<TownPanel>(null);
  const [missions, setMissions] = useState<Mission[]>(previewMissions);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [missionSource, setMissionSource] = useState<"loading" | "preview" | "database">("loading");
  const [missionBusy, setMissionBusy] = useState("");
  const [missionMessage, setMissionMessage] = useState("");
  const [missionError, setMissionError] = useState("");
  const [residentMascot, setResidentMascot] = useState<{ displayName: string; species: string } | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setResidentMascot(null);
      return;
    }
    const fallbackName = session.user?.name || "Citizen";
    const controller = new AbortController();
    fetch("/api/citizen/profile", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { profile?: { displayName?: string; species?: string } };
      })
      .then((data) => {
        if (data?.profile?.species) {
          setResidentMascot({
            displayName: data.profile.displayName || fallbackName,
            species: data.profile.species,
          });
        }
      })
      .catch(() => {
        // The public city remains explorable if a citizen profile cannot be loaded.
      });
    return () => controller.abort();
  }, [session?.user?.id, session?.user?.name]);

  const refreshMissions = useCallback(async () => {
    try {
      const response = await fetch("/api/missions", { cache: "no-store" });
      if (!response.ok) {
        setMissionSource("preview");
        return;
      }
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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

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
      const data = await response.json() as { error?: string; rewardNvc?: number; balanceNvc?: number };
      if (!response.ok) throw new Error(data.error || "Mission could not be completed.");
      setMissions((current) => current.map((item) =>
        item.missionKey === mission.missionKey ? { ...item, completed: true, status: "Completed" } : item,
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

  function openPanel(next: TownPanel) {
    setPanel((current) => current === next ? null : next);
    setMissionError("");
    setMissionMessage("");
  }

  return (
    <main className="town-experience">
      <WorldCanvas />
      <div className="town-world-shade" aria-hidden="true" />

      <header className="town-topbar">
        <Link href="/" className="town-brand" aria-label="NOVARIA city home">
          <span className="town-brand-mark">N</span>
          <span><strong>NOVARIA</strong><small>COASTAL METROPOLIS</small></span>
        </Link>
        <div className="town-topbar-center">
          <span className="town-status-dot" />
          <span>YOUR WORLD IS WAITING</span>
        </div>
        <div className="town-topbar-actions">
          {session?.user?.id ? (
            <Link href="/citizen" className="town-profile-link">
              <PawPrint size={15}/>
              {residentMascot && isCitizenSpecies(residentMascot.species)
                ? `${ANIMAL_EMOJI[residentMascot.species]} ${ANIMAL_LABELS[residentMascot.species]}`
                : "My mascot"}
            </Link>
          ) : null}
          <CitizenButton />
        </div>
      </header>

      <nav className="town-rail" aria-label="City navigation">
        <button type="button" className={!panel ? "active" : ""} onClick={() => setPanel(null)} aria-label="Show city" title="City"><Compass size={19}/></button>
        <button type="button" className={panel === "overview" ? "active" : ""} onClick={() => openPanel("overview")} aria-label="City overview" title="Overview"><MapPinned size={19}/></button>
        <button type="button" className={panel === "missions" ? "active" : ""} onClick={() => openPanel("missions")} aria-label="Missions" title="Missions"><Trophy size={19}/></button>
        <button type="button" className={panel === "districts" ? "active" : ""} onClick={() => openPanel("districts")} aria-label="Districts" title="Districts"><Building2 size={19}/></button>
        <button type="button" className={panel === "residents" ? "active" : ""} onClick={() => openPanel("residents")} aria-label="Animal residents" title="Residents"><Users size={19}/></button>
      </nav>

      <div className="town-location-tag">
        <span className="town-location-pin">✦</span>
        <span><b>NOVARIA</b><small>METROPOLITAN ISLAND</small></span>
      </div>

      <aside className="town-mayor-card">
        <span className="town-mayor-avatar">🦦</span>
        <span className="town-mayor-copy"><small>YOUR MAYOR</small><b>Mayor Otti</b><em>Welcome to our city!</em></span>
        <button type="button" onClick={() => openPanel("residents")} aria-label="Meet the residents">→</button>
      </aside>

      <div className="town-bottom-hint">
        <span>W A S D</span> MOVE
        <i />
        <span>DRAG</span> ROTATE
        <i />
        <span>SCROLL</span> ZOOM
      </div>

      {panel ? (
        <section className="town-drawer" aria-label="NOVARIA city panel">
          <div className="town-drawer-heading">
            <div>
              <small>EXPLORE NOVARIA</small>
              <h2>{panel === "overview" ? "City overview" : panel === "missions" ? "City missions" : panel === "districts" ? "Discover districts" : "Meet the residents"}</h2>
            </div>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close panel"><X size={18}/></button>
          </div>

          {panel === "overview" ? (
            <div className="town-overview-content">
              <p>A modern coastal city shaped by its districts, residents and community. Walk the streets, visit the plazas and discover your place in NOVARIA.</p>
              <CityMetrics />
              <div className="town-wallet">
                <span><small>YOUR NOVA COIN WALLET</small><b>{walletBalance === null ? "—" : walletBalance.toLocaleString("en-US")} NVC</b></span>
                <em>Non-cash game balance</em>
              </div>
              <button className="town-primary-action" type="button" onClick={() => setPanel("missions")}>Explore city missions <span>→</span></button>
            </div>
          ) : null}

          {panel === "missions" ? (
            <div className="town-mission-content">
              <div className="town-wallet"><span><small>GAME WALLET · NON-CASH</small><b>{walletBalance === null ? "—" : walletBalance.toLocaleString("en-US")} NVC</b></span><em>Cannot be withdrawn</em></div>
              {missionSource === "loading" ? <p className="town-muted">Loading city missions…</p> : null}
              {missions.map((mission) => (
                <article className="town-mission-card" key={mission.missionKey}>
                  <div className="town-mission-icon"><Trophy size={16}/></div>
                  <div className="town-mission-copy"><b>{mission.title}</b><p>{mission.detail}</p><small>REWARD · +{mission.rewardNvc} NVC</small></div>
                  <button type="button" disabled={mission.completed || missionBusy === mission.missionKey || missionSource !== "database" || !session?.user?.id} onClick={() => void completeMission(mission)}>
                    {mission.completed ? "Done" : missionBusy === mission.missionKey ? "Saving…" : !session?.user?.id ? "Sign in" : missionSource !== "database" ? "Preview" : "Complete"}
                  </button>
                </article>
              ))}
              <p className="town-muted">Mission completion is currently self-confirmed. NOVA Coin is a non-cash game balance.</p>
              {missionMessage ? <p className="town-success" role="status">{missionMessage}</p> : null}
              {missionError ? <p className="town-error" role="alert">{missionError}</p> : null}
            </div>
          ) : null}

          {panel === "districts" ? (
            <div className="town-district-list">
              {districts.map((district) => {
                const Icon = district.icon;
                return <article className="town-district-card" key={district.name}>
                  <span><Icon size={18}/></span>
                  <div><small>{district.category}</small><b>{district.name}</b><p>{district.description}</p></div>
                </article>;
              })}
              <p className="town-muted">The city map is a live 3D preview. New districts will be added as NOVARIA expands.</p>
            </div>
          ) : null}

          {panel === "residents" ? (
            <div className="town-residents-content">
              <div className="town-mayor-profile"><span>🦦</span><div><small>OFFICIAL CITY LEADER</small><b>Mayor Otti</b><p>The founding otter mayor. Otti is a unique city character and is never randomly reassigned.</p></div></div>
              <div className="town-species-heading"><b>Animal citizens</b><small>27 PERMANENT SPECIES</small></div>
              <div className="town-species-grid">
                {CITIZEN_SPECIES.map((species) => (
                  <div key={species}><span>{ANIMAL_EMOJI[species]}</span><b>{ANIMAL_LABELS[species]}</b></div>
                ))}
              </div>
              <p className="town-muted">Every registered citizen receives one randomly assigned animal mascot. Their species stays the same whenever they sign in.</p>
              {session?.user?.id ? <Link href="/citizen" className="town-primary-action">Customize my mascot <span>→</span></Link> : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
