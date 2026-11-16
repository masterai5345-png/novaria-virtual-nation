import Link from "next/link";

// Public landing is the exact premium Kota Maskot 3D scene, converted to empty Desa Nol.
// Preserves original lighting, materials, controls and mascot model; buildings come only
// from approved Instagram vote results in the authoritative database.
export default function HomePage() {
  return (
    <main aria-label="NOVARIA — Desa Nol" style={{position:"fixed",inset:0,width:"100vw",height:"100dvh",overflow:"hidden",background:"#d6e9de"}}>
      <iframe title="Desa Nol NOVARIA — Jelajahi Desa 3D" src="/novaria-desa-nol-world.html"
        referrerPolicy="same-origin" allow="fullscreen"
        style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0,display:"block"}}/>
      <Link href="/citizen" style={{position:"absolute",right:14,top:70,padding:"11px 15px",
        borderRadius:15,background:"rgba(255,255,255,.94)",color:"#1a5541",fontWeight:800,
        textDecoration:"none",fontSize:13,boxShadow:"0 9px 28px rgba(18,43,34,.22)",
        fontFamily:"system-ui,sans-serif"}}>🐾 Jadi Warga</Link>
    </main>
  );
}
