"use client";

import { useRef, useState } from "react";
import { ANIMAL_EMOJI, ANIMAL_LABELS, isCitizenSpecies } from "@/lib/animals";

type Props = { citizenId:string; displayName:string; species:string; joinedAt:string; role:string };
function shortId(id:string){return "NV-"+id.replaceAll("-","").slice(0,12).toUpperCase()}
function dateID(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"long",year:"numeric"}).format(d)}
export default function CitizenKTP({citizenId,displayName,species,joinedAt,role}:Props){
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [revealed,setRevealed]=useState(false);
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const key=isCitizenSpecies(species)?species:"fox";
 const emoji=ANIMAL_EMOJI[key],animal=ANIMAL_LABELS[key],id=shortId(citizenId);
 const joined=dateID(joinedAt);
 const draw=async()=>{
   setSaving(true);setError("");
   try{
     const canvas=canvasRef.current;if(!canvas)throw Error("Kanvas KTP belum tersedia");
     canvas.width=1000;canvas.height=625;
     const ctx=canvas.getContext("2d");if(!ctx)throw Error("Gagal menyiapkan gambar KTP");
     const bg=ctx.createLinearGradient(0,0,1000,625);bg.addColorStop(0,"#133c36");bg.addColorStop(.6,"#23604a");bg.addColorStop(1,"#438f66");
     ctx.fillStyle=bg;ctx.fillRect(0,0,1000,625);
     ctx.globalAlpha=.13;ctx.strokeStyle="#cde7bd";ctx.lineWidth=3;
     for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(920,30,130+i*42,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
     ctx.fillStyle="#d9c69a";ctx.fillRect(32,32,936,561);
     ctx.fillStyle="#164537";ctx.fillRect(39,39,922,547);
     ctx.fillStyle="#eff9ed";ctx.font="800 50px system-ui";ctx.fillText("NOVARIA",75,112);
     ctx.font="600 21px system-ui";ctx.fillStyle="#cfe7cc";ctx.fillText("KARTU TANDA PENDUDUK • DESA NOL",75,149);
     ctx.strokeStyle="#739b7e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(75,175);ctx.lineTo(927,175);ctx.stroke();
     ctx.fillStyle="#e9f2e6";ctx.fillRect(75,211,262,275);
     ctx.fillStyle="#d9f1de";ctx.fillRect(87,223,238,251);
     ctx.textAlign="center";ctx.font="146px 'Apple Color Emoji','Segoe UI Emoji',sans-serif";ctx.fillText(emoji,206,401);
     ctx.textAlign="left";ctx.fillStyle="#9ecfb0";ctx.font="600 20px system-ui";ctx.fillText("NOMOR WARGA",373,240);
     ctx.fillStyle="#fff8de";ctx.font="800 27px system-ui";ctx.fillText(id,373,274);
     ctx.fillStyle="#9ecfb0";ctx.font="600 20px system-ui";ctx.fillText("NAMA WARGA",373,319);
     ctx.fillStyle="#fff";ctx.font="800 28px system-ui";ctx.fillText(displayName.slice(0,26),373,353);
     ctx.fillStyle="#9ecfb0";ctx.font="600 20px system-ui";ctx.fillText("MASKOT PERMANEN",373,399);
     ctx.fillStyle="#fff";ctx.font="800 27px system-ui";ctx.fillText(animal,373,433);
     ctx.fillStyle="#e9f4e6";ctx.font="600 18px system-ui";ctx.fillText("Bergabung: "+joined,75,529);
     ctx.font="600 17px system-ui";ctx.fillStyle="#b9dcc3";ctx.fillText(role==="owner"?"KEPALA DESA":"WARGA RESMI",708,528);
     ctx.textAlign="right";ctx.fillStyle="#d1e8cb";ctx.font="14px system-ui";ctx.fillText("Identitas permainan • Bukan dokumen kependudukan negara",920,569);
     const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
     if(!blob)throw Error("File gambar gagal dibuat");
     const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="KTP-NOVARIA-"+id+".png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch(e){setError(e instanceof Error?e.message:"KTP gagal disimpan")}finally{setSaving(false)}
 };
 return <section style={{background:"#fff",borderRadius:20,padding:22,border:"1px solid #dce6dd",boxShadow:"0 10px 32px #31583d13"}}>
   <h2 style={{fontSize:23,margin:"0 0 8px",color:"#234f3c"}}>🪪 KTP Warga NOVARIA</h2>
   <p style={{fontSize:13,color:"#597466",lineHeight:1.65,margin:"0 0 15px"}}>Setiap warga mendapat satu identitas desa dan maskot hewan acak saat pertama bergabung. Jenis hewannya tidak berubah ketika login kembali.</p>
   <div style={{borderRadius:17,background:"linear-gradient(125deg,#133c36,#23604a 68%,#438f66)",color:"#fff",padding:"clamp(17px,4vw,28px)",boxShadow:"0 12px 30px #0c3d2b29"}}>
     <small style={{letterSpacing:2.3,color:"#d5eecf",fontWeight:800}}>NOVARIA · KARTU TANDA PENDUDUK</small>
     <div style={{display:"flex",gap:18,alignItems:"center",margin:"22px 0"}}>
       <div style={{fontSize:72,background:"#e6f5e8",borderRadius:13,padding:"10px 13px"}}>{emoji}</div>
       <div style={{minWidth:0}}><small style={{color:"#cce3cb"}}>Nomor warga</small><div style={{fontWeight:900,fontSize:19,letterSpacing:1,overflowWrap:"anywhere"}}>{id}</div>
         <div style={{fontSize:18,fontWeight:800,marginTop:7,overflowWrap:"anywhere"}}>{displayName}</div>
         <small style={{color:"#cce3cb"}}>Maskot: {animal}</small></div>
     </div>
     <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",fontSize:12,color:"#d5ecd8"}}><span>Bergabung: {joined}</span><b>{role==="owner"?"KEPALA DESA":"WARGA RESMI"}</b></div>
   </div>
   <p style={{fontSize:11,color:"#819187",lineHeight:1.5}}>KTP ini hanya untuk permainan NOVARIA, bukan KTP resmi negara. Alamat email dan identitas login Google tidak ditampilkan.</p>
   <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
     <button type="button" disabled={saving} onClick={()=>void draw()} style={{border:0,background:"#237954",color:"#fff",borderRadius:12,padding:"12px 16px",fontWeight:800,cursor:"pointer"}}>{saving?"Membuat PNG...":"⬇ Simpan KTP (PNG)"}</button>
     <button type="button" onClick={()=>setRevealed(v=>!v)} style={{border:"1px solid #c6dacf",background:"#f4f8f3",color:"#286042",borderRadius:12,padding:"12px 16px",cursor:"pointer"}}>{revealed?"Tutup info":"Info identitas"}</button>
   </div>
   {revealed?<p style={{fontSize:12,color:"#486a57",lineHeight:1.7}}>Nomor warga diambil dari ID akun NOVARIA yang unik. Hewan dipilih acak hanya saat pendaftaran awal dan disimpan permanen pada profil akun.</p>:null}
   {error?<p role="alert" style={{fontSize:12,color:"#ab5146"}}>{error}</p>:null}
   <canvas ref={canvasRef} aria-hidden="true" style={{display:"none"}}/>
 </section>;
}
