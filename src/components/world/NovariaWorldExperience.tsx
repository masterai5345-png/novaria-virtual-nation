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
  Moon,
  Sun,
  Zap,
  Bot,
  Search,
  Shuffle,
  IdCard,
  Send,
  Download,
} from "lucide-react";
import CitizenButton from "@/components/auth/CitizenButton";
import CityMetrics from "@/components/world/CityMetrics";
import WorldCanvas, { type WorldResident } from "@/components/world/WorldCanvas";
import { ANIMAL_EMOJI, ANIMAL_LABELS, CITIZEN_SPECIES, isCitizenSpecies } from "@/lib/animals";

type TownPanel = "overview" | "missions" | "districts" | "residents" | null;
type CityChatMessage = { role: "user" | "assistant"; content: string };
type ResidentSearchResponse = { source: "database" | "preview"; residents: WorldResident[]; message?: string; error?: string };
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
  const [residentMascot, setResidentMascot] = useState<{ citizenId: string; displayName: string; species: string } | null>(null);
  const [isNight, setIsNight] = useState(false);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<WorldResident[]>([]);
  const [selectedResident, setSelectedResident] = useState<WorldResident | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<CityChatMessage[]>([
    { role: "assistant", content: "Halo warga! Aku Pak Wali Kota Otti 🦦. Mau mencari maskot, menjelajahi distrik, atau bertanya tentang NOVARIA?" },
  ]);
  const [cardOpen, setCardOpen] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const citizenId = session.user.id;
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
            citizenId,
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

  async function searchResidents(random = false) {
    if (!random && searchTerm.trim().replace(/^@/, "").length < 2) {
      setSearchError("Masukkan username Instagram minimal 2 karakter.");
      setSearchResults([]);
      return;
    }
    setSearchBusy(true);
    setSearchError("");
    try {
      const endpoint = random
        ? "/api/citizens/search?random=1"
        : `/api/citizens/search?handle=${encodeURIComponent(searchTerm.trim().replace(/^@/, ""))}`;
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json() as ResidentSearchResponse;
      if (!response.ok) throw new Error(data.error || "Pencarian warga gagal.");
      if (!data.residents?.length) {
        setSearchResults([]);
        setSearchError(data.source === "preview"
          ? "Pencarian warga aktif setelah database kota tersambung."
          : "Belum ditemukan. Warga harus menambahkan username Instagram publik di Profil Warga terlebih dahulu.");
        return;
      }
      if (random || data.residents.length === 1) {
        setSelectedResident(data.residents[0]);
        setSearchResults([]);
        setSearchTerm(data.residents[0].publicHandle);
        setSearchError("");
      } else {
        setSearchResults(data.residents);
      }
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : "Pencarian warga gagal.");
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  }

  function chooseResident(resident: WorldResident) {
    setSelectedResident(resident);
    setSearchTerm(resident.publicHandle);
    setSearchResults([]);
    setSearchError("");
  }

  function downloadCitizenCard() {
    if (!selectedResident) return;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1040;
    const context = canvas.getContext("2d");
    if (!context) return;

    const species = isCitizenSpecies(selectedResident.species) ? selectedResident.species : "fox";
    const emoji = ANIMAL_EMOJI[species];
    const speciesName = ANIMAL_LABELS[species];
    const gradient = context.createLinearGradient(0, 0, 720, 1040);
    gradient.addColorStop(0, "#173c3d");
    gradient.addColorStop(0.55, "#234f4a");
    gradient.addColorStop(1, "#b58b57");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 720, 1040);

    context.fillStyle = "rgba(9,24,28,.22)";
    context.beginPath();
    context.arc(600, 120, 240, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f8f2e5";
    context.beginPath();
    context.roundRect(34, 34, 652, 972, 34);
    context.fill();

    context.textAlign = "center";
    context.fillStyle = "#1d4543";
    context.font = "800 36px Arial";
    context.fillText("NOVARIA", 360, 100);
    context.fillStyle = "#af8750";
    context.font = "700 18px Arial";
    context.fillText("VIRTUAL CITIZEN CARD", 360, 136);

    context.fillStyle = "#e3d8c0";
    context.beginPath();
    context.arc(360, 350, 152, 0, Math.PI * 2);
    context.fill();
    context.font = "170px serif";
    context.fillStyle = "#20292a";
    context.fillText(emoji, 360, 410);

    context.fillStyle = "#1f3738";
    context.font = "800 38px Arial";
    context.fillText(selectedResident.displayName.slice(0, 30), 360, 570);
    context.fillStyle = "#b1844f";
    context.font = "700 23px Arial";
    context.fillText(`@${selectedResident.publicHandle}`, 360, 612);

    const rows = [
      ["MASCOT SPECIES", speciesName],
      ["CITY", "NOVARIA"],
      ["MEMBERSHIP", "VERIFIED CITY PROFILE"],
    ];
    rows.forEach(([label, value], index) => {
      const y = 700 + index * 76;
      context.textAlign = "left";
      context.fillStyle = "#8b9188";
      context.font = "700 15px Arial";
      context.fillText(label, 92, y);
      context.fillStyle = "#223d3b";
      context.font = "700 23px Arial";
      context.fillText(value, 92, y + 31);
    });

    context.textAlign = "center";
    context.fillStyle = "#9a927e";
    context.font = "15px Arial";
    context.fillText("A virtual community identity — not a government-issued ID", 360, 950);

    const link = document.createElement("a");
    link.download = `novaria-citizen-${selectedResident.publicHandle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function sendMayorMessage() {
    const message = chatInput.trim();
    if (!message || chatBusy) return;
    const nextMessages: CityChatMessage[] = [...chatMessages, { role: "user", content: message }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/ai/city-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          resident: selectedResident ? {
            displayName: selectedResident.displayName,
            publicHandle: selectedResident.publicHandle,
            species: selectedResident.species,
          } : undefined,
        }),
      });
      const data = await response.json() as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Pak Wali Kota belum bisa menjawab.");
      setChatMessages((current) => [...current, { role: "assistant", content: data.reply || "Maaf, aku belum punya jawaban." }]);
    } catch (caught) {
      setChatMessages((current) => [...current, {
        role: "assistant",
        content: caught instanceof Error ? caught.message : "Pak Wali Kota sedang sibuk. Coba lagi.",
      }]);
    } finally {
      setChatBusy(false);
    }
  }

  function openPanel(next: TownPanel) {
    setPanel((current) => current === next ? null : next);
    setMissionError("");
    setMissionMessage("");
  }

  return (
    <main className="town-experience">
      <WorldCanvas isNight={isNight} quality={quality} focusResident={selectedResident} />
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
          <button type="button" className="town-icon-control" onClick={() => setIsNight((value) => !value)} aria-label={isNight ? "Switch to daytime" : "Switch to nighttime"} title={isNight ? "Daytime" : "Nighttime"}>
            {isNight ? <Sun size={17}/> : <Moon size={17}/>}
          </button>
          <button type="button" className="town-icon-control" onClick={() => setQuality((value) => value === "high" ? "low" : "high")} aria-label={quality === "high" ? "Switch to low graphics" : "Switch to high graphics"} title={quality === "high" ? "High quality" : "Lightweight quality"}>
            {quality === "high" ? <Sparkles size={17}/> : <Zap size={17}/>}
          </button>
          <button type="button" className={`town-icon-control${assistantOpen ? " active" : ""}`} onClick={() => setAssistantOpen((value) => !value)} aria-label="Open Mayor Otti assistant" title="Ask Mayor Otti">
            <Bot size={17}/>
          </button>
          {session?.user?.id ? (
            <Link href="/citizen" className="town-profile-link">
              <PawPrint size={15}/>
              {residentMascot?.citizenId === session.user.id && isCitizenSpecies(residentMascot.species)
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

      <section className="town-search-dock" aria-label="Mascot resident search">
        <div className="town-search-input-wrap">
          <Search size={16}/>
          <input
            value={searchTerm}
            onChange={(event) => { setSearchTerm(event.target.value); setSearchError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") void searchResidents(false); }}
            placeholder="Ketik username Instagram warga"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-label="Instagram username"
          />
        </div>
        <button type="button" className="town-search-button" disabled={searchBusy} onClick={() => void searchResidents(false)}>
          <Search size={15}/> {searchBusy ? "Mencari…" : "Cari"}
        </button>
        <button type="button" className="town-random-button" disabled={searchBusy} onClick={() => void searchResidents(true)} aria-label="Pilih warga acak" title="Warga acak">
          <Shuffle size={16}/>
        </button>
      </section>

      {searchError ? <div className="town-search-feedback" role="status">{searchError}</div> : null}
      {searchResults.length > 0 ? (
        <section className="town-resident-results" aria-label="Search results">
          <div className="town-resident-results-heading">
            <b>Warga ditemukan</b>
            <button type="button" onClick={() => setSearchResults([])} aria-label="Close search results"><X size={15}/></button>
          </div>
          {searchResults.map((resident) => {
            const species = isCitizenSpecies(resident.species) ? resident.species : "fox";
            return (
              <button className="town-resident-result" type="button" key={resident.id} onClick={() => chooseResident(resident)}>
                <span className="town-resident-result-emoji">{ANIMAL_EMOJI[species]}</span>
                <span><b>{resident.displayName}</b><small>@{resident.publicHandle} · {ANIMAL_LABELS[species]}</small></span>
                <span className="town-resident-result-arrow">↗</span>
              </button>
            );
          })}
        </section>
      ) : null}

      {selectedResident ? (
        <section className="town-selected-resident" aria-label="Selected mascot resident">
          <span className="town-selected-emoji">{ANIMAL_EMOJI[isCitizenSpecies(selectedResident.species) ? selectedResident.species : "fox"]}</span>
          <span className="town-selected-copy">
            <small>WARGA TERPILIH · @ {selectedResident.publicHandle}</small>
            <b>{selectedResident.displayName}</b>
          </span>
          <button type="button" onClick={() => setCardOpen(true)}><IdCard size={15}/> Lihat KTP</button>
          <button type="button" className="town-close-selected" onClick={() => setSelectedResident(null)} aria-label="Clear selected resident"><X size={16}/></button>
        </section>
      ) : null}

      {assistantOpen ? (
        <section className="town-assistant-panel" aria-label="Mayor Otti assistant">
          <header>
            <span className="town-assistant-avatar">🦦</span>
            <span><small>ASISTEN KOTA NOVARIA</small><b>Pak Wali Kota Otti</b></span>
            <button type="button" onClick={() => setAssistantOpen(false)} aria-label="Close assistant"><X size={17}/></button>
          </header>
          <div className="town-chat-log" aria-live="polite">
            {chatMessages.map((item, index) => (
              <div className={`town-chat-message ${item.role === "user" ? "user" : "assistant"}`} key={index}>{item.content}</div>
            ))}
            {chatBusy ? <div className="town-chat-message assistant">Otti sedang berpikir…</div> : null}
          </div>
          <form className="town-chat-form" onSubmit={(event) => { event.preventDefault(); void sendMayorMessage(); }}>
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Tanya Pak Wali Kota…" maxLength={1200} />
            <button type="submit" disabled={!chatInput.trim() || chatBusy} aria-label="Send message"><Send size={16}/></button>
          </form>
          <small className="town-assistant-footnote">Asisten dapat memakai panduan lokal; AI provider aktif jika dikonfigurasi admin.</small>
        </section>
      ) : null}

      {cardOpen && selectedResident ? (
        <div className="town-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCardOpen(false); }}>
          <section className="town-ktp-modal" role="dialog" aria-modal="true" aria-label="NOVARIA virtual citizen card">
            <button type="button" className="town-modal-close" onClick={() => setCardOpen(false)} aria-label="Close card"><X size={18}/></button>
            <div className="town-ktp-card">
              <div className="town-ktp-brand"><span>N</span><div><b>NOVARIA</b><small>VIRTUAL CITIZEN CARD</small></div></div>
              <div className="town-ktp-avatar">{ANIMAL_EMOJI[isCitizenSpecies(selectedResident.species) ? selectedResident.species : "fox"]}</div>
              <h2>{selectedResident.displayName}</h2>
              <p className="town-ktp-handle">@{selectedResident.publicHandle}</p>
              <div className="town-ktp-details">
                <div><small>SPECIES</small><b>{ANIMAL_LABELS[isCitizenSpecies(selectedResident.species) ? selectedResident.species : "fox"]}</b></div>
                <div><small>COMMUNITY</small><b>NOVARIA</b></div>
                <div><small>MEMBERSHIP</small><b>PUBLIC CITIZEN PROFILE</b></div>
              </div>
              <small className="town-ktp-disclaimer">Virtual community identity — not a government-issued ID.</small>
            </div>
            <button type="button" className="town-ktp-download" onClick={downloadCitizenCard}><Download size={16}/> Download card</button>
          </section>
        </div>
      ) : null}

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
              <p className="town-muted">Use the city controls to explore the districts, then select a resident from the public mascot finder.</p>
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
