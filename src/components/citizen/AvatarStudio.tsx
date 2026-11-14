"use client";

import { useEffect, useState } from "react";
import { Check, PawPrint, Save } from "lucide-react";

type FurTone = "river-brown" | "warm-cocoa" | "silver" | "honey";
type Outfit = "citizen-teal" | "explorer" | "builder" | "harbor-guard";
type Accessory = "none" | "scarf" | "cap" | "backpack";

type AvatarStyle = { furTone: FurTone; outfit: Outfit; accessory: Accessory };
type ProfileResponse = { profile: { displayName: string; avatarStyle: Partial<AvatarStyle> } };

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
        body: JSON.stringify({ displayName, avatarStyle: style }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save your Otter.");
      setMessage("Your citizen name and Otter look have been saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your Otter.");
    } finally {
      setSaving(false);
    }
  }

  const fur = furOptions.find((item) => item.id === style.furTone)?.color ?? "#8d654b";
  const outfitColor = style.outfit === "builder" ? "#d18a3e" : style.outfit === "explorer" ? "#55734e" : style.outfit === "harbor-guard" ? "#263f61" : "#1c5555";

  return (
    <section className="avatar-studio">
      <div className="avatar-studio-heading"><span><PawPrint size={17}/></span><div><b>Customize your Otter</b><small>Your look is saved to your citizen profile.</small></div></div>
      <div className="avatar-preview-row">
        <div className="avatar-preview" aria-label={`Otter preview with ${style.outfit} outfit`}>
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
          {style.accessory === "scarf" ? <i className="avatar-scarf" /> : null}
          {style.accessory === "backpack" ? <i className="avatar-backpack" /> : null}
        </div>
        <div className="avatar-preview-copy"><span className="eyebrow">YOUR CHARACTER</span><h3>{displayName || "NOVARIA Citizen"}</h3><p>Otter · {outfitOptions.find((item) => item.id === style.outfit)?.label}</p><small>3D world model customization will use these saved preferences.</small></div>
      </div>

      <label className="avatar-label" htmlFor="citizen-display-name">Citizen name</label>
      <input id="citizen-display-name" className="avatar-name-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={28} minLength={2} />

      <div className="avatar-option-block"><b>Fur color</b><div className="fur-options">{furOptions.map((item) => <button key={item.id} type="button" className={style.furTone === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, furTone: item.id }))} aria-label={item.label} title={item.label}><span style={{ background: item.color }} />{style.furTone === item.id ? <Check size={12}/> : null}</button>)}</div><small className="avatar-current-option">{furOptions.find((item) => item.id === style.furTone)?.label}</small></div>
      <div className="avatar-option-block"><b>Outfit</b><div className="outfit-options">{outfitOptions.map((item) => <button key={item.id} type="button" className={style.outfit === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, outfit: item.id }))}><span>{item.label}</span><small>{item.description}</small></button>)}</div></div>
      <div className="avatar-option-block"><b>Accessory</b><div className="accessory-options">{accessoryOptions.map((item) => <button key={item.id} type="button" className={style.accessory === item.id ? "selected" : ""} onClick={() => setStyle((current) => ({ ...current, accessory: item.id }))}>{item.label}</button>)}</div></div>

      {message ? <p className="avatar-message" role="status">{message}</p> : null}
      {error ? <p className="avatar-error" role="alert">{error}</p> : null}
      <button type="button" className="avatar-save" disabled={loading || saving || displayName.trim().length < 2} onClick={() => void save()}><Save size={14}/>{loading ? "Loading…" : saving ? "Saving…" : "Save my Otter"}</button>
    </section>
  );
}
