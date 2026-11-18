"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three";
import {
  type VillageAction, type VillageWorld,
} from "@/lib/village-zero";
import { DESA_AWAL, PILIHAN_VOTING, hariJakarta, terimaSuara, tutupVoting, type DesaVoting } from "@/lib/village-voting";

const STORAGE_KEY = "novaria-desa-voting-indonesia-demo-v1";


function material(color: string, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
}
function block(w: number, h: number, d: number, color: string, x=0, y=0, z=0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material(color));
  mesh.position.set(x,y,z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function buildObject(action: VillageAction) {
  const group = new THREE.Group();
  const base = block(2.6,0.12,2.6,"#aac78d",0,0.06,0);
  group.add(base);
  if (action === "BUILD HOUSE" || action === "BUILD SHOP") {
    group.add(block(1.65,1.3,1.55,action==="BUILD HOUSE"?"#f6d8ac":"#9bdbda",0,0.75,0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45,0.95,4),material(action==="BUILD HOUSE"?"#ad5f52":"#486c8e"));
    roof.rotation.y = Math.PI/4; roof.position.y=1.88; roof.castShadow=true; group.add(roof);
    group.add(block(0.43,0.76,0.1,"#76503d",0,0.45,0.82));
    group.add(block(0.37,0.35,0.11,"#8ac1e4",-0.47,1.02,0.81));
  } else if (action === "PLANT TREE") {
    group.add(block(0.22,1.18,0.22,"#846447",0,0.72,0));
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95,1),material("#438f57"));
    crown.position.y=1.77;crown.castShadow=true;group.add(crown);
  } else if (action === "BUILD ROAD") {
    group.add(block(2.6,0.09,1.24,"#ae9c88",0,0.15,0));
    for (let i=-1;i<=1;i++) group.add(block(0.37,0.025,0.055,"#f9e3b3",i*0.72,0.205,0));
  } else {
    group.add(block(1.7,0.06,1.7,"#8dcb83",0,0.16,0));
    for(let i=0;i<4;i++){
      const flower=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,6),material(i%2?"#f3bd62":"#e98fb5"));
      flower.position.set(Math.sin(i*Math.PI/2)*0.61,0.35,Math.cos(i*Math.PI/2)*0.61);group.add(flower);
    }
    const fountain=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.42,0.22,12),material("#89aabe"));
    fountain.position.y=0.25;group.add(fountain);
  }
  return group;
}

function VillageCanvas({world,fullScreen=false}:{world:VillageWorld;fullScreen?:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const groupRef=useRef<THREE.Group | null>(null);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setClearColor("#d5e9e7");
    el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#cce7eb");
    scene.fog=new THREE.Fog("#cce7eb",32,72);
    const camera=new THREE.PerspectiveCamera(38,1,0.1,100);
    camera.position.set(18,21,25);camera.lookAt(0,0,0);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=0.075;controls.minDistance=12;controls.maxDistance=55;
    controls.maxPolarAngle=Math.PI*0.49;controls.enablePan=false;controls.target.set(0,0,0);
    scene.add(new THREE.HemisphereLight("#fff4e9","#719b8e",2.35));
    scene.add(new THREE.AmbientLight("#f3e8d4",0.48));
    const sun=new THREE.DirectionalLight("#ffdfb8",3);
    sun.position.set(-8,18,8);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;
    sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;scene.add(sun);
    const ground=block(30,0.6,30,"#81b77b",0,-0.33,0);scene.add(ground);
    const turf=block(27.8,0.07,27.8,"#99c88b",0,0,0);scene.add(turf);
    // Lanskap alami tanpa konstruksi pada hari pertama.
    const lake = new THREE.Mesh(new THREE.CircleGeometry(12,48), new THREE.MeshStandardMaterial({color:"#69c5bd",metalness:0.18,roughness:0.24}));
    lake.rotation.x=-Math.PI/2;lake.position.set(0,-0.08,-18);scene.add(lake);
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const hill=new THREE.Mesh(new THREE.ConeGeometry(5+(i%3),7+(i%4),6),material(i%2?"#709d84":"#8eae9e"));
      hill.position.set(Math.sin(a)*28,2.3,Math.cos(a)*28);
      hill.rotation.y=a;hill.castShadow=true;scene.add(hill);
    }
    const grassMaterial=material("#559b61");
    const grassGeometry=new THREE.ConeGeometry(0.11,0.28,3);
    const tuft=new THREE.InstancedMesh(grassGeometry,grassMaterial,240);
    const dummy=new THREE.Object3D();
    for(let i=0;i<240;i++){
      const a=i*2.39996, r=10.5+Math.sqrt((i%119)/119)*9.5;
      dummy.position.set(Math.cos(a)*r,0.17,Math.sin(a)*r);
      dummy.rotation.y=a;dummy.scale.setScalar(0.7+(i%5)*0.12);dummy.updateMatrix();tuft.setMatrixAt(i,dummy.matrix);
    }
    tuft.instanceMatrix.needsUpdate=true;scene.add(tuft);
    for(let i=0;i<20;i++){
      const a=i*2.3,r=15+(i%5)*0.6;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(0.4+(i%3)*0.13,0),material(i%2?"#a9b5a4":"#999d91"));
      rock.position.set(Math.cos(a)*r,0.25,Math.sin(a)*r);rock.rotation.set(i,i*0.5,0);scene.add(rock);
    }
    const cityObjects=new THREE.Group();scene.add(cityObjects);groupRef.current=cityObjects;
    const resize=()=>{
      if(!el.isConnected)return;
      const w=Math.max(320,el.clientWidth),h=Math.max(300,el.clientHeight);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    resize();
    const observer=new ResizeObserver(resize);observer.observe(el);
    let frame=0;let disposed=false;
    const animate=()=>{if(disposed)return;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)};
    animate();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();groupRef.current=null;
      scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
      renderer.dispose();if(renderer.domElement.parentNode===el)el.removeChild(renderer.domElement);
    };
  },[]);
  useEffect(()=>{
    const group=groupRef.current;if(!group)return;
    while(group.children.length){
      const child=group.children[0];group.remove(child);
      child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});
    }
    world.plots.forEach(p=>{const obj=buildObject(p.action);obj.position.set(p.x*2.95,0,p.z*2.95);group.add(obj)});
  },[world]);
  return <div ref={host} style={{width:"100%",height:fullScreen?"100dvh":"min(65vh,630px)",minHeight:fullScreen?0:350,borderRadius:fullScreen?0:18,overflow:"hidden"}} aria-label="Pratinjau desa tiga dimensi interaktif; geser untuk mengubah sudut kamera" />;
}

export default function VillageZeroPage({publicMode=false}:{publicMode?:boolean}){
  const {data:session,status:loginStatus}=useSession();
  const [desa,setDesa]=useState<DesaVoting>(DESA_AWAL);
  const [pilihan,setPilihan]=useState<VillageAction>("BUILD HOUSE");
  const [akunDemo,setAkunDemo]=useState("warga_demo_1");
  const [pesan,setPesan]=useState("Desa dimulai dari tanah kosong. Setiap hari komunitas memilih satu pembangunan.");
  const [siap,setSiap]=useState(false);
  const [statusRumah,setStatusRumah]=useState<{ready?:boolean;home?:{id:string}|null;available?:number}|null>(null);
  const [sibukKlaim,setSibukKlaim]=useState(false);
  const [duniaResmi,setDuniaResmi]=useState<VillageWorld>({version:1,plots:[],processedCommentIds:[]});
  const [statusDunia,setStatusDunia]=useState("Memeriksa perkembangan desa...");
  const hitungan=useRef(0);
  const hari=hariJakarta(new Date());
  useEffect(()=>{
    if(publicMode){setSiap(true);return;}
    try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const parsed=JSON.parse(saved) as DesaVoting;
      if(parsed?.versi===1&&Array.isArray(parsed.dunia?.plots)&&Array.isArray(parsed.suara)&&Array.isArray(parsed.hasil)) setDesa(parsed);}}
    catch{/* data demo rusak diabaikan */}
    setSiap(true);
  },[publicMode]);
  useEffect(()=>{if(siap && !publicMode)localStorage.setItem(STORAGE_KEY,JSON.stringify(desa));},[desa,siap,publicMode]);
  useEffect(()=>{
    if(!publicMode)return;
    let mounted=true;
    const fetchDunia=async()=>{
      try {
        const response=await fetch("/api/village-zero/world",{cache:"no-store"});
        const result=await response.json() as {status:string;note?:string;plots?:Array<{id:string;action:VillageAction;x:number;z:number}>};
        if(!mounted)return;
        if(response.ok && Array.isArray(result.plots)){
          setDuniaResmi({version:1,plots:result.plots.map(p=>({id:p.id,action:p.action,x:p.x,z:p.z,source:"voting-instagram"})),processedCommentIds:[]});
          setStatusDunia(result.status==="berjalan"?"Desa berkembang dari keputusan warga Instagram":"Desa dimulai dari nol · Voting Instagram belum dibuka");
        }else setStatusDunia("Koneksi desa sementara terganggu");
      }catch{if(mounted)setStatusDunia("Tidak dapat membaca pembaruan desa");}
    };
    void fetchDunia();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void fetchDunia();},60_000);
    return ()=>{mounted=false;window.clearInterval(timer);};
  },[publicMode]);
  const perbaruiRumah=useCallback(async()=>{
    if(loginStatus!=="authenticated")return;
    try{const r=await fetch("/api/village-zero/claim",{cache:"no-store"});const data=await r.json();setStatusRumah(data);}catch{setStatusRumah({ready:false});}
  },[loginStatus]);
  useEffect(()=>{void perbaruiRumah();},[perbaruiRumah]);
  const klaimRumah=useCallback(async()=>{
    if(sibukKlaim)return;
    setSibukKlaim(true);
    try{const r=await fetch("/api/village-zero/claim",{method:"POST"});const data=await r.json();setPesan(r.ok?"Selamat! Rumah Desa Nol berhasil diklaim.":data.error||"Gagal mengklaim rumah.");await perbaruiRumah();}
    catch{setPesan("Koneksi terputus. Silakan coba lagi.");}
    finally{setSibukKlaim(false);}
  },[sibukKlaim,perbaruiRumah]);
  const voting=useCallback(()=>{
    hitungan.current++;
    const hasil=terimaSuara(desa,{
      idKomentar:`demo-${Date.now()}-${hitungan.current}`,
      idPengguna:akunDemo.trim(),teks:PILIHAN_VOTING.find(x=>x.tindakan===pilihan)?.kata??"",tanggal:hari,
    });
    setDesa(hasil.desa);setPesan(hasil.pesan);
  },[akunDemo,desa,pilihan,hari]);
  // Hanya demo: pengujian bisa menutup tanggal kemarin, tidak memajukan waktu server.
  const tutupDemo=useCallback(()=>{
    const kemarin=new Date(Date.now()-86400000);
    const tanggal=hariJakarta(kemarin);
    const jumlahHariIni=desa.suara.filter(s=>s.tanggal===hari);
    if(!jumlahHariIni.length){setPesan("Belum ada suara. Tambahkan suara di atas dulu.");return;}
    // Salin suara demo menjadi hari kemarin agar tombol presentasi bisa memperlihatkan hasil.
    // Tindakan ini hanya berlaku di localStorage browser, bukan hasil voting follower sungguhan.
    const tiruan={...desa,suara:desa.suara.filter(s=>s.tanggal!==hari).concat(jumlahHariIni.map(s=>({...s,tanggal})))};
    const hasil=tutupVoting(tiruan,tanggal,hari);
    setDesa(hasil.desa);setPesan(hasil.pesan);
  },[desa,hari]);
  if(publicMode)return <main style={{position:"fixed",inset:0,width:"100vw",height:"100dvh",overflow:"hidden",background:"#cce7eb",fontFamily:"Arial,sans-serif"}}>
    <VillageCanvas world={duniaResmi} fullScreen />
    <div style={{position:"absolute",left:16,top:16,right:16,pointerEvents:"none",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div style={{pointerEvents:"auto",background:"rgba(20,56,43,.9)",color:"#fff",backdropFilter:"blur(12px)",padding:"14px 18px",borderRadius:15,boxShadow:"0 10px 28px #132b2540",maxWidth:380}}>
        <div style={{fontSize:11,letterSpacing:2,fontWeight:800,color:"#c9e4c9"}}>NOVARIA · DESA NOL</div>
        <div style={{fontSize:23,fontWeight:900,margin:"6px 0"}}>Selamat Datang di Desa Kita</div>
        <div style={{fontSize:12,lineHeight:1.6,color:"#d2e7d5"}}>{statusDunia}. Geser untuk menjelajah, cubit untuk memperbesar.</div>
      </div>
      <a href="/citizen" style={{pointerEvents:"auto",textDecoration:"none",borderRadius:12,background:"#fff",padding:"12px 16px",color:"#295843",fontWeight:800,fontSize:13,boxShadow:"0 7px 20px #193a2a30"}}>🏠 Jadi Warga</a>
    </div>
    <div style={{position:"absolute",bottom:16,left:16,right:16,pointerEvents:"none",display:"flex",justifyContent:"center"}}>
      <div style={{background:"rgba(19,55,42,.85)",color:"#f6f9f2",padding:"12px 16px",borderRadius:14,backdropFilter:"blur(8px)",fontSize:12,lineHeight:1.5,textAlign:"center",maxWidth:520}}>
        🗳️ Semua pembangunan diputuskan lewat komentar Instagram resmi NOVARIA · Mode Jalan-Jalan bebas login
      </div>
    </div>
  </main>;
  return (
    <main style={{minHeight:"100dvh",background:"linear-gradient(140deg,#f6f4e9,#e2eee1)",color:"#25432f",padding:"24px 14px",fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <p style={{letterSpacing:2.4,fontSize:12,fontWeight:800,color:"#487d5e"}}>NOVARIA / DESA NUSANTARA / DEMO PENGEMBANGAN</p>
        <h1 style={{fontSize:"clamp(28px,4vw,48px)",margin:"6px 0"}}>Desa Nol — Hari {desa.dunia.plots.length}</h1>
        <p style={{color:"#55745c",lineHeight:1.65,maxWidth:760}}>Mulai dari alam kosong. Warga memilih pembangunan setiap hari melalui komentar Instagram. Jelajahi desa tanpa login: tarik layar untuk memutar kamera dan gulir untuk memperbesar tampilan.</p>
        <VillageCanvas world={desa.dunia}/>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}>
          <div style={{flex:"1 1 245px",background:"#fff",padding:16,borderRadius:16,border:"1px solid #d6e4d7"}}>
            <h2 style={{fontSize:19,margin:"0 0 9px"}}>🚶 Mode Jalan-Jalan</h2>
            <p style={{fontSize:14,lineHeight:1.55}}>Gratis, tanpa akun. Bebas melihat perkembangan desa, rumah, taman, serta keputusan komunitas.</p>
            <strong style={{color:"#29825b"}}>Terbuka untuk semua pengunjung</strong>
          </div>
          <div style={{flex:"1 1 245px",background:"#fff",padding:16,borderRadius:16,border:"1px solid #d6e4d7"}}>
            <h2 style={{fontSize:19,margin:"0 0 9px"}}>🏠 Mode Warga & Rumah</h2>
            <p style={{fontSize:14,lineHeight:1.55}}>Login dengan Google untuk identitas warga. Rumah dapat diklaim saat sistem kepemilikan Desa Nol siap dan rumah hasil voting tersedia.</p>
            {loginStatus==="authenticated"?
              <div><p style={{color:"#287452",fontWeight:700}}>Masuk sebagai {session?.user?.name??"Warga"}</p>
                {statusRumah?.home ? <p>🏠 Kamu sudah memiliki rumah Desa Nol.</p> : statusRumah?.ready ? <div><p>Rumah tersedia: {statusRumah.available??0}</p><button onClick={()=>void klaimRumah()} disabled={sibukKlaim||!statusRumah.available}
                  style={{padding:"11px 15px",background:"#226e56",color:"white",border:0,borderRadius:10,cursor:"pointer",opacity:statusRumah.available?1:0.5}}>Klaim Rumah Desa Nol</button></div>
                  : <p>Fitur kepemilikan Desa Nol belum diaktifkan. Kamu tetap bisa menjelajah.</p>}</div>
              :<button onClick={()=>void signIn("google")} style={{padding:"11px 15px",background:"#226e56",color:"white",border:0,borderRadius:10,cursor:"pointer",fontWeight:700}}>Masuk dengan Google</button>}
            <p style={{fontSize:12,color:"#718377"}}>Subscribe YouTube bersifat sukarela, bukan syarat mendapatkan rumah.</p>
          </div>
        </div>
        <section style={{background:"#ffffff",border:"1px solid #d5e2d5",borderRadius:18,padding:20,marginTop:16}}>
          <h2 style={{margin:"0 0 7px",fontSize:21}}>🗳️ Voting Pembangunan Harian</h2>
          <p style={{fontSize:14,lineHeight:1.55}}>Simulasi komentar follower (belum terkoneksi ke Instagram). Satu akun satu suara setiap hari, dan hanya satu jenis pembangunan terpilih per hari.</p>
          <p style={{fontSize:13,fontWeight:700}}>Pilih yang ingin dibangun:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:9,margin:"12px 0"}}>
            {PILIHAN_VOTING.map(p=><button key={p.tindakan} onClick={()=>setPilihan(p.tindakan)}
              style={{padding:"11px 14px",borderRadius:12,border:p.tindakan===pilihan?"2px solid #27755a":"1px solid #b7cdb8",background:p.tindakan===pilihan?"#d9f3dc":"white",color:"#234a35",fontWeight:700,cursor:"pointer"}}>{p.label} ({p.kata})</button>)}
          </div>
          <label htmlFor="akun-demo" style={{display:"block",fontSize:13,marginBottom:6}}>ID akun simulasi (coba berbeda untuk setiap suara)</label>
          <input id="akun-demo" value={akunDemo} onChange={e=>setAkunDemo(e.target.value)} maxLength={80}
            style={{padding:"11px",border:"1px solid #b9cbbc",borderRadius:10,maxWidth:"100%",width:280,fontSize:15}}/>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",margin:"14px 0"}}>
            <button onClick={voting} style={{padding:"13px 17px",background:"#226e56",color:"#fff",border:0,borderRadius:11,fontWeight:750,cursor:"pointer"}}>Simulasikan Komentar IG</button>
            <button onClick={tutupDemo} style={{padding:"13px 17px",background:"#e8c881",border:0,borderRadius:11,color:"#453c24",fontWeight:750,cursor:"pointer"}}>Simulasikan Akhir Voting</button>
            <button onClick={()=>{setDesa(DESA_AWAL);setPesan("Demo kembali ke hari nol. Database asli tidak berubah.");}}
              style={{padding:"13px 17px",background:"#fff",border:"1px solid #ceb8ad",borderRadius:11,cursor:"pointer",color:"#614839"}}>Reset Demo</button>
          </div>
          <p role="status" style={{fontSize:14,color:"#42624a"}}>{pesan}</p>
          <p style={{fontSize:13,fontWeight:700}}>Perolehan suara ({hari})</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
            {PILIHAN_VOTING.map(p=><div key={p.kata} style={{background:"#eff5eb",padding:13,borderRadius:12}}>
              <strong>{p.label}</strong><p style={{margin:"7px 0 0"}}>{desa.suara.filter(s=>s.tanggal===hari&&s.pilihan===p.tindakan).length} suara</p>
            </div>)}
          </div>
          <p style={{fontSize:13,marginTop:15}}>Hasil pembangunan: <strong>{desa.dunia.plots.length} objek</strong>. Semua perkembangan pada halaman ini sementara tersimpan di browser pengunjung, bukan database bersama.</p>
        </section>
        <p style={{fontSize:12,color:"#687c6d",paddingTop:16}}>Pratinjau khusus pengembangan. Belum ada pengambilan komentar Instagram, klaim rumah Desa Nol, ataupun publikasi otomatis. Production NOVARIA tetap tidak berubah.</p>
      </div>
    </main>
  );
}
