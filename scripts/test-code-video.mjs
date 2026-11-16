import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {renderNovariaVideo} from "./novaria-video-engine.mjs";
const output=path.join(os.tmpdir(),`novaria-code-video-test-${process.pid}.mp4`);
try{
  const scenes=[
    {title:"NOVARIA: DESA NOL",subtitle:"Pembangunan dimulai dari nol"},
    {title:"BELUM ADA VOTING",subtitle:"Tidak membuat angka yang tidak tersedia"},
    {title:"SEMUANYA DARI KODE",subtitle:"MP4 9 banding 16 tanpa kredit AI"},
  ];
  const result=await renderNovariaVideo({outputPath:output,scenes});
  const header=fs.readFileSync(output).subarray(0,64).toString("ascii");
  if(!header.includes("ftyp"))throw Error("Output is not a valid MP4 container.");
  const probe=spawnSync("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",output],{encoding:"utf8"});
  if(probe.status!==0||Math.abs(Number(probe.stdout.trim())-30)>.3)throw Error("Expected 30-second encoded video.");
  console.log("NOVARIA code-video smoke test PASSED",JSON.stringify(result));
}catch(e){console.error("NOVARIA code-video smoke test FAILED",e?.message||String(e));process.exitCode=1;}
finally{fs.rmSync(output,{force:true})}
