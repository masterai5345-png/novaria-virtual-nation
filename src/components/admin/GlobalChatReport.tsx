"use client";
import { useCallback, useEffect, useState } from "react";

type Message={id:string;display_name:string;body:string;created_at:string;moderation_status:string};
type Counts={all:number;visible:number;hidden:number};
export default function GlobalChatReport(){
 const [messages,setMessages]=useState<Message[]>([]);
 const [counts,setCounts]=useState<Counts>({all:0,visible:0,hidden:0});
 const [issue,setIssue]=useState("");
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
   try{const r=await fetch("/api/admin/village-chat",{cache:"no-store"});const data=await r.json();
     if(!r.ok)throw Error(data.error||"Laporan chat belum tersedia");
     setMessages(data.messages||[]);setCounts(data.counts||{all:0,visible:0,hidden:0});setIssue("");
   }catch(e){setIssue(e instanceof Error?e.message:"Laporan chat belum tersedia")}
 },[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh()},20000);return()=>clearInterval(timer)},[refresh]);
 async function hide(id:string){
   if(!window.confirm("Sembunyikan pesan ini dari chat global?"))return;
   setBusy(id);
   try{const r=await fetch("/api/admin/village-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
     if(!r.ok)throw Error((await r.json()).error||"Gagal menyembunyikan pesan");
     await refresh();
   }catch(e){setIssue(e instanceof Error?e.message:"Gagal memoderasi")}finally{setBusy(null)}
 }
 return <section style={{background:"#fff",border:"1px solid #dce6dd",borderRadius:22,padding:22,boxShadow:"0 10px 32px #32583c08"}}>
   <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
     <div><h2 style={{fontSize:20,margin:"0 0 7px"}}>💬 Chat Global & Moderasi Warga</h2>
       <p style={{fontSize:13,color:"#718479",margin:0}}>Pantau percakapan di desa, sembunyikan pesan yang melanggar aturan. Hanya Kepala Desa bisa memoderasi.</p></div>
     <button onClick={()=>{setLoading(true);void refresh().finally(()=>setLoading(false))}}
       disabled={loading} style={{borderRadius:11,padding:"10px 13px",cursor:"pointer",background:"#e5f4ea",border:"1px solid #c4ddca",color:"#235b3e",fontWeight:700}}>↻ Segarkan</button>
   </header>
   <div style={{display:"flex",gap:10,marginTop:17,flexWrap:"wrap"}}>
     {[["Total chat",counts.all],["Terlihat publik",counts.visible],["Disembunyikan",counts.hidden]].map(([n,v])=>
       <div key={String(n)} style={{background:"#f4f8f2",padding:"12px 16px",borderRadius:14,flex:"1 1 115px"}}><div style={{fontSize:12,color:"#748779"}}>{n}</div><strong style={{fontSize:24}}>{v}</strong></div>)}
   </div>
   {issue?<p role="alert" style={{color:"#ad5947",fontSize:12}}>{issue}</p>:null}
   <div style={{maxHeight:390,overflowY:"auto",marginTop:14}}>
     {messages.length===0?<p style={{fontSize:13,color:"#758b7b",padding:"16px 0"}}>Belum ada percakapan warga. Chat publik akan tampil di sini begitu ada pesan sungguhan.</p>:null}
     {messages.map(m=><div key={m.id} style={{padding:"12px 0",borderBottom:"1px solid #e8efe8",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
       <div style={{minWidth:0}}><strong style={{fontSize:13}}>{m.display_name}</strong> <span style={{fontSize:11,color:"#819388"}}>• {new Date(m.created_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}</span>
         <p style={{fontSize:13,overflowWrap:"anywhere",margin:"5px 0"}}>{m.body}</p>
         <small style={{color:m.moderation_status==="hidden"?"#ad5947":"#4f8c62"}}>{m.moderation_status==="hidden"?"Disembunyikan":"Ditampilkan"}</small></div>
       {m.moderation_status==="visible"?<button disabled={busy!==null} onClick={()=>void hide(m.id)}
         style={{cursor:"pointer",flexShrink:0,padding:"9px 11px",border:"1px solid #e5bbb6",background:"#fff3f1",borderRadius:10,color:"#ad5346",fontWeight:700,fontSize:12}}>Sembunyikan</button>:null}
     </div>)}
   </div>
 </section>;
}