"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function MasukKepalaDesa(){
  const {data:session,status}=useSession();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"linear-gradient(145deg,#edf3e9,#dbe9dc)",padding:20,fontFamily:"Arial,Helvetica,sans-serif",color:"#274738"}}>
    <section style={{width:"100%",maxWidth:440,background:"#fff",boxShadow:"0 18px 60px #23452c16",padding:"clamp(25px,5vw,42px)",borderRadius:24,border:"1px solid #d9e8da"}}>
      <div style={{fontSize:34,marginBottom:12}}>🏡</div>
      <p style={{fontSize:12,fontWeight:800,letterSpacing:2,color:"#578e70"}}>NOVARIA · KHUSUS KEPALA DESA</p>
      <h1 style={{fontSize:31,margin:"10px 0",letterSpacing:"-1px"}}>Masuk ke Dashboard</h1>
      <p style={{fontSize:14,lineHeight:1.75,color:"#627d6b"}}>Hanya akun Google pemilik NOVARIA yang dapat membaca laporan warga, hasil voting Instagram, pembangunan, dan kinerja AI Agent.</p>
      {status==="loading"?<p>Memeriksa akun...</p>:session?.user?.email?
        <div style={{padding:"13px 15px",background:"#edf5eb",borderRadius:13,fontSize:13,lineHeight:1.6}}>
          <b>Sudah masuk:</b> {session.user.email}
          <p style={{margin:"7px 0"}}>Jika akun ini bukan akun pemilik, keluar dan gunakan akun Google Kepala Desa yang benar.</p>
        </div>:null}
      <button type="button" disabled={busy} onClick={async()=>{
        setBusy(true);setMessage("");
        try{await signIn("google",{redirectTo:"/admin/kepala-desa"});}
        catch{setMessage("Tidak dapat menghubungkan Google. Periksa konfigurasi OAuth.");setBusy(false);}
      }} style={{display:"block",width:"100%",background:"#277454",color:"#fff",border:0,borderRadius:13,padding:"14px 18px",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:20}}>
        {busy?"Menghubungkan akun...":"Masuk dengan Google"}
      </button>
      {message?<p role="alert" style={{color:"#a34e42",fontSize:13}}>{message}</p>:null}
      <Link href="/" style={{display:"block",textAlign:"center",marginTop:18,fontSize:13,color:"#557a62",textDecoration:"none"}}>← Kembali ke Desa Nol</Link>
    </section>
  </main>;
}
