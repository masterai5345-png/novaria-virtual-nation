import VillagePlayHUD from "@/components/village/VillagePlayHUD";
import Link from "next/link";

// Public landing is the exact premium Kota Maskot 3D scene, converted to empty Desa Nol.
// Preserves original lighting, materials, controls and mascot model; buildings come only
// from approved Instagram vote results in the authoritative database.
export default function HomePage() {
  return (
    <main aria-label="NOVARIA — Desa Nol" style={{position:"fixed",inset:0,width:"100vw",height:"100dvh",overflow:"hidden",background:"#d6e9de"}}>
      <iframe id="novaria-game-frame" title="Desa Nol NOVARIA — Jelajahi Desa 3D" src="/novaria-desa-nol-world.html"
        referrerPolicy="same-origin" allow="fullscreen"
        style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0,display:"block"}}/>
      <VillagePlayHUD />
      <aside aria-label="Informasi NOVARIA" style={{
        position:"absolute",right:12,top:127,maxWidth:"min(305px,calc(100vw - 24px))",
        background:"rgba(255,255,255,.92)",border:"1px solid rgba(223,235,219,.8)",
        color:"#285342",fontFamily:"system-ui,sans-serif",borderRadius:14,padding:"11px 13px",
        boxShadow:"0 10px 28px #153e2d1c",lineHeight:1.5
      }}>
        <strong style={{display:"block",fontSize:12,marginBottom:4}}>NOVARIA · Desa Virtual 3D</strong>
        <p style={{fontSize:11,margin:"0 0 7px"}}>Jelajahi Desa Nol tanpa login. Masuk dengan Google untuk memakai maskot hewan acak, KTP warga, dan chat komunitas.</p>
        <nav aria-label="Informasi dan kebijakan NOVARIA" style={{display:"flex",gap:9,flexWrap:"wrap",fontSize:11,fontWeight:700}}>
          <Link href="/tentang" style={{color:"#1e7550"}}>Tentang</Link>
          <Link href="/privacy" style={{color:"#1e7550"}}>Privasi</Link>
          <Link href="/terms" style={{color:"#1e7550"}}>Ketentuan</Link>
          <Link href="/contact" style={{color:"#1e7550"}}>Kontak</Link>
        </nav>
      </aside>

      <Link href="/masuk" style={{position:"absolute",right:14,top:70,padding:"11px 15px",
        borderRadius:15,background:"rgba(255,255,255,.94)",color:"#1a5541",fontWeight:800,
        textDecoration:"none",fontSize:13,boxShadow:"0 9px 28px rgba(18,43,34,.22)",
        fontFamily:"system-ui,sans-serif"}}>🐾 Jadi Warga</Link>
    </main>
  );
}
