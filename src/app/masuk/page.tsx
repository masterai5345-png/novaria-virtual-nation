"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
export default function MasukWarga(){
 const {data,status}=useSession();
 const [ready,setReady]=useState<{googleOAuthReady:boolean}|null>(null);
 const [busy,setBusy]=useState(false);
 const [oauthError,setOauthError]=useState("");
 useEffect(()=>{const e=new URLSearchParams(window.location.search).get("error");if(e)setOauthError(e)},[]);
 useEffect(()=>{void fetch("/api/auth/readiness",{cache:"no-store"}).then(r=>r.json()).then(setReady).catch(()=>setReady({googleOAuthReady:false}))},[]);
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#eef4e7,#d9eadc)",padding:20,fontFamily:"system-ui"}}>
  <section style={{width:"100%",maxWidth:425,borderRadius:23,background:"#fff",padding:"36px 28px",boxShadow:"0 16px 50px #1b402225"}}>
   <div style={{fontSize:36}}>🐾</div><p style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#558168"}}>NOVARIA • WARGA DESA NOL</p>
   <h1 style={{margin:"8px 0",color:"#24513b"}}>Masuk Jadi Warga</h1>
   <p style={{color:"#678473",lineHeight:1.7,fontSize:14}}>Setelah masuk dengan Google, kamu bisa memakai maskotmu sendiri, berjalan di desa, melambaikan tangan, duduk, dan mengobrol bersama warga lain.</p>
   {oauthError?<div role="alert" style={{background:"#fff0db",padding:13,borderRadius:12,color:"#7d4c28",fontSize:13,lineHeight:1.6,marginBottom:12}}><b>Login Google belum berhasil ({oauthError}).</b><p>Jika muncul OAuthCallback/OAuthSignin, periksa Client ID, Client Secret, dan Authorized Redirect URI Google Cloud. Jika AccessDenied, periksa izin aplikasi Google serta akun penguji. Silakan beritahu Kepala Desa kode error ini tanpa mengirim kredensial.</p></div>:null}
   {status==="authenticated"?<Link href="/" style={{display:"block",textAlign:"center",padding:14,background:"#287b55",color:"#fff",textDecoration:"none",borderRadius:13,fontWeight:800}}>Masuk ke Desa Sebagai {data?.user?.name||"Warga"}</Link>:
     ready?.googleOAuthReady?<button disabled={busy} onClick={async()=>{setBusy(true);await signIn("google",{redirectTo:"/"});setBusy(false)}}
       style={{width:"100%",background:"#287b55",color:"#fff",fontWeight:800,border:0,borderRadius:13,padding:14,cursor:"pointer"}}>{busy?"Menghubungkan...":"Masuk dengan Google"}</button>:
       <div style={{background:"#fff4df",padding:15,borderRadius:12,fontSize:13,color:"#8a662b"}}>{ready?"Login Google belum dikonfigurasi server. Kepala Desa sedang menyiapkannya.":"Memeriksa layanan login..."}</div>}
   <p style={{fontSize:12,color:"#718878",lineHeight:1.5}}>Pengunjung tidak perlu login untuk melihat desa dan membaca chat. Subscribe YouTube tidak menjadi syarat memiliki rumah.</p>
   <Link href="/" style={{color:"#42875d",fontSize:13,textDecoration:"none"}}>← Kembali Jalan-Jalan</Link>
  </section>
 </main>;
}
