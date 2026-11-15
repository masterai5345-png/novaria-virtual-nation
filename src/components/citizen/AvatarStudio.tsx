"use client";

import { useEffect, useState } from "react";
import { Check, PawPrint, Save } from "lucide-react";
import { ANIMAL_EMOJI, ANIMAL_LABELS, isCitizenSpecies, type CitizenSpecies } from "@/lib/animals";

type FurTone = "river-brown" | "warm-cocoa" | "silver" | "honey";
type Outfit = "citizen-teal" | "explorer" | "builder" | "harbor-guard";
type Accessory = "none" | "scarf" | "cap" | "backpack";
type AvatarStyle = { furTone: FurTone; outfit: Outfit; accessory: Accessory };
type ProfileResponse = {
  profile: {
    displayName: string;
    species: string;
    avatarStyle: Partial<AvatarStyle>;
    publicHandle?: string | null;
  };
};

const defaultStyle: AvatarStyle = { furTone: "river-brown", outfit: "citizen-teal", accessory: "none" };
const furOptions: { id: FurTone; label: string; color: string }[] = [
  { id: "river-brown", label: "River Brown", color: "#8d654b" },
  { id: "warm-cocoa", label: "Warm Cocoa", color: "#684633" },
  { id: "silver", label: "Silver", color: "#a7aaa6" },
  { id: "honey", label: "Honey", color: "#bd8b50" },
];
const outfitOptions: { id: Outfit; label: string; description: string }[] = [
  { id: "citizen-teal", label: "Town Citizen", description: "Classic NOVARIA teal" },
  { id: "explorer", label: "Explorer", description: "Adventure-ready outfit" },
  { id: "builder", label: "City Builder", description: "Construction overalls" },
  { id: "harbor-guard", label: "Harbor Guard", description: "Navy civic uniform" },
];
const accessoryOptions: { id: Accessory; label: string }[] = [
  { id: "none", label: "No accessory" },
  { id: "scarf", label: "Scarf" },
  { id: "cap", label: "Cap" },
  { id: "backpack", label: "Backpack" },
];

export default function AvatarStudio() {
  const [displayName, setDisplayName] = useState("");
  const [species, setSpecies] = useState<CitizenSpecies>("fox");
  const [publicHandle, setPublicHandle] = useState("");
  const [style, setStyle] = useState<AvatarStyle>(defaultStyle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    void fetch("/api/citizen/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load avatar settings.");
        return await response.json() as ProfileResponse;
      })
      .then((data) => {
        if (!mounted) return;
        setDisplayName(data.profile.displayName || "");
        setSpecies(isCitizenSpecies(data.profile.species) ? data.profile.species : "fox");
        setPublicHandle(data.profile.publicHandle ?? "");
        setStyle({
          furTone: furOptions.some((item) => item.id === data.profile.avatarStyle?.furTone) ? data.profile.avatarStyle!.furTone as FurTone : "river-brown",
          outfit: outfitOptions.some((item) => item.id === data.profile.avatarStyle?.outfit) ? data.profile.avatarStyle!.outfit as Outfit : "citizen-teal",
          accessory: accessoryOptions.some((item) => item.id === data.profile.avatarStyle?.accessory) ? data.profile.avatarStyle!.accessory as Accessory : "none",
        });
      })
      .catch((caught: unknown) => {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load avatar settings.");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/citizen/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarStyle: style, publicHandle }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save your mascot.");
      setMessage("Your mascot look and public username settings have been saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your mascot.");
    } finally {
      setSaving(false);
    }
  }

  const fur = furOptions.find((item) => item.id === style.furTone)?.color ?? "#8d654b";
  const outfitColor = style.outfit === "builder" ? "#d18a3e" : style.outfit === "explorer" ? "#55734e" : style.outfit === "harbor-guard" ? "#263f61" : "#1c5555";
  const speciesLabel = ANIMAL_LABELS[species];

  return (
    <section className="avatar-studio">
      <div className="avatar-studio-heading"><span><PawPrint size={17}/></span><div><b>Your animal mascot</b><small>Your assigned species is permanent and saved to your citizen profile.</small></div></div>
      <div className="avatar-preview-row">
        <div className="avatar-preview" aria-label={`${speciesLabel} mascot preview with ${style.outfit} outfit`}>
          <div className="avatar-tail" style={{ background: fur }} />
          <div className="avatar-body" style={{ background: outfitColor }} />
          <div className="avatar-head" style={{ background: fur }}>
            <i className="avatar-ear avatar-ear-left" />
            <i className="avatar-ear avatar-ear-right" />
            <i className="avatar-eye avatar-eye-left" />
            <i className="avatar-eye avatar-eye-right" />
            <i className="avatar-muzzle" />
            {style.accessory === "cap" ? <i className="avatar-cap" /> : null}
          </div>
          <span className="avatar-species-emoji" aria-hidden="true">{ANIMAL_EMOJI[species]}</span>
          {style.accessory === "scarf" ? <i className="avatar-scarf" /> : null}
          {style.accessory === "backpack" ? <i className="avatar-backpack" /> : null}
        </div>
        <div className="avatar-preview-copy"><span className="eyebrow">YOUR PERMANENT SPECIES</span><h3>{displayName || "NOVARIA Citizen"}</h3><p>{ANIMAL_EMOJI[species]} {speciesLabel} · {outfitOptions.find((item) => item.id === style.outfit)?.label}</p><small>Your 3D resident mascot keeps this animal identity when you return to NOVARIA.</small></div>
      </div>

      <label className="avatar-label" htmlFor="citizen-display-name">Citizen name</label>
      <input id="citizen-display-name" className="avatar-name-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={28} minLength={2} />

      <label className="avatar-label" htmlFor="citizen-instagram-handle">Instagram username <span>Optional · public</span></label>
      <div className="avatar-handle-field">
        <span>@</span>
        <input
          id="citizen-instagram-handle"
          className="avatar-name-input"
          value={publicHandle}
          onChange={(event) => setPublicHandle(event.target.value.replace(/^@/, "").toLowerCase())}
          placeholder="username"
          maxLength={30}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <small className="avatar-public-note">Share this username to appear in the city's public mascot finder. Leave it empty to stay unlisted.</small>

      <div className="avatar-option-block"><b>Coat color</b><div className="fur-options">{furOptions.map((item) => <button key={item.id} type="button" className={style.furTone === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, furTone: item.id }))} aria-label={item.label} title={item.label}><span style={{ background: item.color }} />{style.furTone === item.id ? <Check size={12}/> : null}</button>)}</div><small className="avatar-current-option">{furOptions.find((item) => item.id === style.furTone)?.label}</small></div>
      <div className="avatar-option-block"><b>Outfit</b><div className="outfit-options">{outfitOptions.map((item) => <button key={item.id} type="button" className={style.outfit === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, outfit: item.id }))}><span>{item.label}</span><small>{item.description}</small></button>)}</div></div>
      <div className="avatar-option-block"><b>Accessory</b><div className="accessory-options">{accessoryOptions.map((item) => <button key={item.id} type="button" className={style.accessory === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, accessory: item.id }))}>{item.label}</button>)}</div></div>

      {message ? <p className="avatar-message" role="status">{message}</p> : null}
      {error ? <p className="avatar-error" role="alert">{error}</p> : null}
      <button type="button" className="avatar-save" disabled={loading || saving || displayName.trim().length < 2} onClick={() => void save()}><Save size={14}/>{loading ? "Loading…" : saving ? "Saving…" : "Save my mascot look"}</button>
    </section>
  );
}
