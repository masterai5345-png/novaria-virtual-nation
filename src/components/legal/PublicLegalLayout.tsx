import Link from "next/link";
import type { ReactNode } from "react";

const base = {color:"#1f4638",fontFamily:"Arial,Helvetica,sans-serif"};
export function PublicLegalLayout({eyebrow,title,lead,children}:{eyebrow:string;title:string;lead:string;children:ReactNode}){
 return <main style={{minHeight:"100dvh",background:"linear-gradient(165deg,#e8f1e8,#f8faf5 48%)",...base,padding:"clamp(16px,4vw,44px)"}}>
   <div style={{maxWidth:850,margin:"0 auto"}}>
    <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",paddingBottom:25}}>
     <Link href="/" style={{textDecoration:"none",color:"#285842",fontWeight:900,letterSpacing:2,fontSize:19}}>🐾 NOVARIA</Link>
     <nav aria-label="Halaman informasi" style={{display:"flex",gap:13,flexWrap:"wrap",fontSize:13}}>
      <Link href="/" style={{color:"#326b4e"}}>Jelajahi Desa</Link>
      <Link href="/tentang" style={{color:"#326b4e"}}>Tentang</Link>
      <Link href="/privacy" style={{color:"#326b4e"}}>Privasi</Link>
      <Link href="/terms" style={{color:"#326b4e"}}>Ketentuan</Link>
      <Link href="/contact" style={{color:"#326b4e"}}>Kontak</Link>
     </nav>
    </header>
    <article style={{background:"#fff",border:"1px solid #d6e5d8",borderRadius:23,boxShadow:"0 18px 45px #183f2910",padding:"clamp(20px,5vw,48px)"}}>
     <small style={{letterSpacing:2,fontWeight:900,color:"#518566"}}>{eyebrow}</small>
     <h1 style={{fontSize:"clamp(28px,4vw,44px)",margin:"12px 0 15px",lineHeight:1.17,letterSpacing:"-1px"}}>{title}</h1>
     <p style={{fontSize:16,lineHeight:1.75,color:"#52715e",margin:"0 0 24px"}}>{lead}</p>
     <div className="novaria-legal-prose">{children}</div>
    </article>
    <footer style={{textAlign:"center",fontSize:12,color:"#668376",padding:"22px 10px",lineHeight:1.7}}>NOVARIA · Desa virtual interaktif · <Link href="/privacy" style={{color:"#326b4e"}}>Privasi</Link> · <Link href="/terms" style={{color:"#326b4e"}}>Ketentuan</Link> · <Link href="/contact" style={{color:"#326b4e"}}>Kontak</Link></footer>
   </div>
   <style>{`.novaria-legal-prose{font-size:14px;line-height:1.84;color:#355943}.novaria-legal-prose h2{font-size:19px;color:#234d38;margin:26px 0 8px}.novaria-legal-prose p{margin:8px 0}.novaria-legal-prose li{margin:6px 0}.novaria-legal-prose ul{padding-left:21px}.novaria-legal-prose a{color:#1c7654;text-decoration:underline;overflow-wrap:anywhere}.novaria-legal-prose strong{color:#234d38}`}</style>
 </main>;
}
export function SupportContact({email}:{email:string|undefined}){
 return email?<a href={`mailto:${email}`}>{email}</a>:<span>Halaman <Link href="/contact">Kontak NOVARIA</Link> (kanal dukungan langsung masih dalam penyiapan)</span>;
}
