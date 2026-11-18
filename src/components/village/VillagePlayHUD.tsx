"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageCircle, Hand, Armchair, Footprints, X, Send, LogIn, UserRound } from "lucide-react";

type Entry={id:string;name:string;avatar:string;body:string;created_at:string};
type Me={authenticated:boolean;name?:string;animal?:string};
type Dir="forward"|"backward"|"left"|"right";

const cover={background:"rgba(22,48,42,.88)",color:"#fff",border:"1px solid rgba(255,255,255,.18)",
  boxShadow:"0 10px 36px rgba(13,38,31,.3)",backdropFilter:"blur(14px)"} as const;
const smallButton={...cover,borderRadius:14,padding:"11px 13px",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,fontSize:13,fontWeight:800} as const;

export default function VillagePlayHUD(){
  const {status}=useSession();
  const [me,setMe]=useState<Me>({authenticated:false});
  const [chatOpen,setChatOpen]=useState(false);
  const [messages,setMessages]=useState<Entry[]>([]);
  const [chatReady,setChatReady]=useState(false);
  const [text,setText]=useState("");
  const [notice,setNotice]=useState("");
  const [sending,setSending]=useState(false);
  const bottom=useRef<HTMLDivElement>(null);
  const active=useRef<Dir|null>(null);

  const broadcast=useCallback((action:string,payload?:Record<string,string|boolean>)=>{
    const win=(document.getElementById("novaria-game-frame") as HTMLIFrameElement|null)?.contentWindow;
    win?.postMessage({type:"NOVARIA_PLAYER",action,...payload},window.location.origin);
  },[]);
  useEffect(()=>{
    if(status!=="authenticated"){setMe({authenticated:false});return;}
    let mounted=true;
    const load=async()=>{try{
      const r=await fetch("/api/village-zero/me",{cache:"no-store"});
      const data=await r.json() as Me;
      if(mounted){setMe(data);if(data.authenticated)broadcast("spawn",{animal:data.animal||"fox",name:data.name||"Warga"});}
    }catch{if(mounted)setNotice("Belum bisa mengambil karakter warga.");}};
    void load();return()=>{mounted=false};
  },[status,broadcast]);
  useEffect(()=>{
    function onReady(e:MessageEvent){
      const target=(document.getElementById("novaria-game-frame") as HTMLIFrameElement|null)?.contentWindow;
      if(e.origin!==window.location.origin || e.source!==target || e.data?.type!=="NOVARIA_WORLD_READY")return;
      if(me.authenticated)broadcast("spawn",{animal:me.animal||"fox",name:me.name||"Warga"});
    }
    window.addEventListener("message",onReady);
    return()=>window.removeEventListener("message",onReady);
  },[me,broadcast]);
    const refresh=useCallback(async()=>{
    try{const r=await fetch("/api/village-zero/chat",{cache:"no-store"});
      const d=await r.json() as {online:boolean;messages:Entry[]};
      setChatReady(Boolean(r.ok&&d.online));setMessages(d.messages||[]);
    }catch{setChatReady(false);}
  },[]);
  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},8000);
    return()=>window.clearInterval(timer);
  },[refresh]);
  useEffect(()=>{if(chatOpen)bottom.current?.scrollIntoView({block:"nearest"});},[messages.length,chatOpen]);
  const move=useCallback((dir:Dir,pressed:boolean)=>{
    if(!me.authenticated)return;
    if(pressed){active.current=dir;broadcast("move",{direction:dir,pressed:true})}
    else {if(active.current===dir)active.current=null;broadcast("move",{direction:dir,pressed:false})}
  },[broadcast,me.authenticated]);
  useEffect(()=>{
    function keyDown(e:KeyboardEvent){
      if(!me.authenticated || e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)return;
      const d:Record<string,Dir>={w:"forward",ArrowUp:"forward",s:"backward",ArrowDown:"backward",
        a:"left",ArrowLeft:"left",d:"right",ArrowRight:"right"};
      if(d[e.key]){e.preventDefault();move(d[e.key],true)}
    }
    function keyUp(e:KeyboardEvent){
      const d:Record<string,Dir>={w:"forward",ArrowUp:"forward",s:"backward",ArrowDown:"backward",
        a:"left",ArrowLeft:"left",d:"right",ArrowRight:"right"};
      if(d[e.key]){e.preventDefault();move(d[e.key],false)}
    }
    window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);
    return()=>{window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp)};
  },[move,me.authenticated]);
  async function send(){
    if(!text.trim()||sending)return;
    setSending(true);setNotice("");
    try{
      const r=await fetch("/api/village-zero/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text.trim()})});
      const out=await r.json() as {error?:string};
      if(!r.ok){setNotice(out.error||"Pesan gagal dikirim.");return;}
      setText("");await refresh();
    }catch{setNotice("Koneksi chat sedang terganggu.");}
    finally{setSending(false)}
  }

  return <div style={{position:"fixed",inset:0,pointerEvents:"none",fontFamily:"system-ui,sans-serif",zIndex:10}}>
    <style>{`@media(max-width:640px){.nv-chat-panel{bottom:${me.authenticated?"195":"79"}px!important}.nv-chat-panel section{height:min(360px,45dvh)!important}.nv-walk-controls{bottom:12px!important}}`}</style>
    <div style={{position:"absolute",top:86,left:12,pointerEvents:"auto",maxWidth:"calc(100vw - 24px)"}}>
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:7}}>
        <div style={{...cover,borderRadius:13,padding:"8px 12px",fontSize:12}}>
          {me.authenticated?<><UserRound size={14} style={{display:"inline",verticalAlign:"middle",marginRight:7}}/>Warga: <b>{me.name}</b></>:
            <>🚶 Mode Jalan-Jalan · Bebas lihat desa tanpa login</>}
        </div>
        {me.authenticated?<Link href="/citizen" style={{...smallButton,textDecoration:"none",padding:"8px 11px",fontSize:12}}>🪪 KTP Saya</Link>:null}
      </div>
    </div>

    <div className="nv-walk-controls" style={{position:"absolute",left:12,bottom:20,pointerEvents:"auto",display:"flex",flexDirection:"column",gap:8,alignItems:"start"}}>
      {me.authenticated?<>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={()=>broadcast("wave")} style={smallButton}><Hand size={16}/> Melambaikan tangan</button>
          <button onClick={()=>broadcast("sit")} style={smallButton}><Armchair size={16}/> Duduk / Berdiri</button>
        </div>
        <div style={{...cover,borderRadius:16,padding:8,display:"grid",gridTemplateColumns:"repeat(3,44px)",gridTemplateRows:"repeat(3,39px)",gap:2}}>
          {[
            [null,"forward",null],
            ["left",null,"right"],
            [null,"backward",null]
          ].flat().map((dir,i)=>dir?
            <button key={i} aria-label={"Jalan "+dir} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);move(dir as Dir,true)}} onPointerUp={()=>move(dir as Dir,false)}
              onPointerCancel={()=>move(dir as Dir,false)} onLostPointerCapture={()=>move(dir as Dir,false)}
              style={{background:"rgba(255,255,255,.2)",color:"#fff",border:0,borderRadius:10,fontSize:18,cursor:"pointer",touchAction:"none"}}>
              {dir==="forward"?"▲":dir==="backward"?"▼":dir==="left"?"◀":"▶"}
            </button>:
            <div key={i} style={{display:"grid",placeItems:"center",opacity:i===4?1:0}}>{i===4?<Footprints size={17}/>:null}</div>)}
        </div>
      </>:<Link href="/masuk" style={{...smallButton,textDecoration:"none"}}><LogIn size={17}/> Masuk untuk memainkan maskot</Link>}
    </div>

    <div className="nv-chat-panel" style={{position:"absolute",bottom:20,right:12,width:"min(360px,calc(100vw - 24px))",pointerEvents:"auto"}}>
      {chatOpen?<section style={{...cover,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column",height:"min(455px,65dvh)"}}>
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #ffffff2b"}}>
          <div><b style={{fontSize:15}}>💬 Obrolan Desa</b><div style={{fontSize:11,color:"#ceddd2",marginTop:4}}>Terbuka dibaca semua pengunjung · Moderasi aktif</div></div>
          <button onClick={()=>setChatOpen(false)} aria-label="Tutup chat" style={{background:"transparent",border:0,color:"white",cursor:"pointer"}}><X size={20}/></button>
        </header>
        <div aria-live="polite" style={{padding:"11px 15px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10}}>
          {!chatReady?<div style={{fontSize:12,color:"#f5dca7"}}>Chat belum tersedia. Sistem sedang disiapkan.</div>:null}
          {messages.length===0?<div style={{fontSize:12,color:"#d7e7dc"}}>Belum ada pesan. Sapa warga yang datang ke desa!</div>:null}
          {messages.map(m=><div key={m.id} style={{fontSize:13,lineHeight:1.4,overflowWrap:"anywhere"}}>
            <strong style={{color:"#b9ecca"}}>{m.name}</strong> <small style={{color:"#adc4b6"}}>· {new Date(m.created_at).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"})}</small>
            <div style={{marginTop:3,color:"#fff"}}>{m.body}</div>
          </div>)}
          <div ref={bottom}/>
        </div>
        <div style={{padding:"10px 12px",borderTop:"1px solid #ffffff2b"}}>
          {notice?<p role="alert" style={{color:"#ffe6aa",fontSize:11,margin:"0 0 7px"}}>{notice}</p>:null}
          {me.authenticated?
            <form onSubmit={e=>{e.preventDefault();void send()}} style={{display:"flex",gap:7}}>
              <input maxLength={280} value={text} onChange={e=>setText(e.target.value)} placeholder="Sapa warga NOVARIA..."
                style={{flex:1,minWidth:0,background:"#ffffffef",borderRadius:11,padding:"11px",border:0,fontSize:13}}/>
              <button type="submit" disabled={sending||!text.trim()||!chatReady} aria-label="Kirim pesan" style={{padding:"10px 12px",borderRadius:11,border:0,color:"#fff",background:"#26845b",cursor:"pointer",opacity:sending?0.5:1}}><Send size={17}/></button>
            </form>:
            <Link href="/masuk" style={{...smallButton,width:"100%",justifyContent:"center",textDecoration:"none"}}>Masuk dengan Google untuk mengirim chat</Link>}
        </div>
      </section>:
        <button onClick={()=>setChatOpen(true)} style={{...smallButton,float:"right",padding:"13px 16px",borderRadius:17}}>
          <MessageCircle size={19}/> Chat Global {messages.length>0?"("+messages.length+" terbaru)":""}
        </button>}
    </div>
  </div>;
}
