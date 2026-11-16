"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  applyVillageComment, EMPTY_VILLAGE, VILLAGE_ACTIONS,
  type VillageAction, type VillageWorld,
} from "@/lib/village-zero";

const STORAGE_KEY = "novaria-village-zero-demo-v1";
const LABELS: Record<VillageAction, string> = {
  "BUILD HOUSE": "Build House",
  "BUILD ROAD": "Build Road",
  "PLANT TREE": "Plant Tree",
  "BUILD PARK": "Build Park",
  "BUILD SHOP": "Build Shop",
};

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

function VillageCanvas({world}:{world:VillageWorld}) {
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
    scene.add(new THREE.HemisphereLight("#ffffff","#8c9c76",2.2));
    const sun=new THREE.DirectionalLight("#ffdfb8",3);
    sun.position.set(-8,18,8);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;
    sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;scene.add(sun);
    const ground=block(30,0.6,30,"#81b77b",0,-0.33,0);scene.add(ground);
    const turf=block(27.8,0.07,27.8,"#99c88b",0,0,0);scene.add(turf);
    const cityObjects=new THREE.Group();scene.add(cityObjects);groupRef.current=cityObjects;
    const resize=()=>{
      if(!el.isConnected)return;
      const w=Math.max(320,el.clientWidth),h=Math.max(300,el.clientHeight);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    resize();
    const observer=new ResizeObserver(resize);observer.observe(el);
    let frame=0;let disposed=false;
    const animate=()=>{if(disposed)return;renderer.render(scene,camera);frame=requestAnimationFrame(animate)};
    animate();
    return ()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();groupRef.current=null;
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
  return <div ref={host} style={{width:"100%",height:"min(65vh,630px)",minHeight:350,borderRadius:18,overflow:"hidden"}} aria-label="Interactive three-dimensional village preview" />;
}

export default function VillageZeroPage(){
  const [world,setWorld]=useState<VillageWorld>(EMPTY_VILLAGE);
  const [command,setCommand]=useState<VillageAction>("BUILD HOUSE");
  const [feedback,setFeedback]=useState("The village begins empty. Simulate a follower comment to build.");
  const [ready,setReady]=useState(false);
  const counter=useRef(0);
  useEffect(()=>{
    try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const parsed=JSON.parse(saved) as VillageWorld;
      if(parsed?.version===1&&Array.isArray(parsed.plots)&&Array.isArray(parsed.processedCommentIds)) setWorld(parsed);}}
    catch{/* corrupt local preview data is ignored */}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem(STORAGE_KEY,JSON.stringify(world));},[world,ready]);
  const simulate=useCallback(()=>{
    counter.current++;
    const result=applyVillageComment(world,{id:`demo-${Date.now()}-${counter.current}`,text:command,source:"demo"});
    setWorld(result.world);
    setFeedback(result.accepted?`Accepted: ${command}. Placed on an empty village plot.`:result.reason);
  },[command,world]);
  return (
    <main style={{minHeight:"100dvh",background:"#f1f5e9",color:"#264736",padding:"24px 14px",fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <p style={{letterSpacing:3,fontSize:12,fontWeight:800,color:"#5f8875"}}>NOVARIA / EXPERIMENTAL BRANCH</p>
        <h1 style={{fontSize:"clamp(27px,4vw,46px)",margin:"6px 0"}}>Village Zero — Day {world.plots.length}</h1>
        <p style={{color:"#56715f",lineHeight:1.6}}>Day 0 starts with bare land. Each accepted command adds one persistent object. This is a local browser demo, NOT connected to Instagram and NOT live on production.</p>
        <VillageCanvas world={world}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:9,margin:"20px 0"}}>
          {VILLAGE_ACTIONS.map(action=><button key={action} onClick={()=>setCommand(action)}
            style={{padding:"12px 16px",borderRadius:12,border:action===command?"2px solid #27755a":"1px solid #b7cdb8",background:action===command?"#d9f3dc":"white",color:"#234a35",fontWeight:700,cursor:"pointer"}}>{LABELS[action]}</button>)}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={simulate} style={{padding:"14px 20px",background:"#246b52",color:"white",border:0,borderRadius:12,fontWeight:750,cursor:"pointer"}}>Simulate Instagram Command</button>
          <button onClick={()=>{setWorld(EMPTY_VILLAGE);setFeedback("Preview reset to Day 0. Production data unchanged.");}}
            style={{padding:"14px 20px",background:"white",color:"#6b4738",border:"1px solid #d2b8ae",borderRadius:12,cursor:"pointer"}}>Reset demo to Day 0</button>
          <strong>{world.plots.length} / 70 plots built</strong>
        </div>
        <p role="status" style={{fontSize:14,color:"#4a6c5a"}}>{feedback}</p>
        <p style={{fontSize:12,color:"#65796b"}}>Demo changes are stored only in your browser. Official Instagram API authorization, webhook verification, moderation, server-side database storage and admin approval will be added before enabling real follower commands.</p>
      </div>
    </main>
  );
}
