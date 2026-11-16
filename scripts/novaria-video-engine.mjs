// NOVARIA native code-only video renderer (no generative AI, no external API).
// Uses FFmpeg installed on Render native runtimes; content is text from verified DB facts.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const W=480,H=854;
const strip=(value,max)=>String(value??"").normalize("NFKC").replace(/[\x00-\x1f\x7f]/g," ").trim().slice(0,max);
function background(file,chapter){
  const out=Buffer.alloc(W*H*3);
  const palettes=[[9,30,37],[12,51,51],[10,31,44]];
  const [a,b,c]=palettes[chapter];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=(y*W+x)*3,glow=Math.max(0,1-Math.hypot((x-W*.7)/W,(y-H*.22)/H)*2.2);
    const grain=Math.sin(x*.15+y*.31+chapter)*Math.sin(y*.12-x*.29)*4;
    out[p]=Math.max(0,Math.min(255,a+y/H*25+glow*26+grain));
    out[p+1]=Math.max(0,Math.min(255,b+y/H*42+glow*38+grain));
    out[p+2]=Math.max(0,Math.min(255,c+y/H*18+glow*20+grain));
  }
  function rectangle(x,y,w,h,r,g,b){
    for(let j=Math.max(0,Math.floor(y));j<Math.min(H,y+h);j++)
      for(let i=Math.max(0,Math.floor(x));i<Math.min(W,x+w);i++){
        const p=(j*W+i)*3;out[p]=r;out[p+1]=g;out[p+2]=b;
      }
  }
  function disc(cx,cy,rad,r,g,b){
    for(let y=Math.max(0,Math.floor(cy-rad));y<Math.min(H,cy+rad);y++)
      for(let x=Math.max(0,Math.floor(cx-rad));x<Math.min(W,cx+rad);x++){
        const f=1-(((x-cx)/rad)**2+((y-cy)/rad)**2);
        if(f>0){let p=(y*W+x)*3,k=f*.65;out[p]=out[p]*(1-k)+r*k;out[p+1]=out[p+1]*(1-k)+g*k;out[p+2]=out[p+2]*(1-k)+b*k;}
      }
  }
  disc(365,220,96,141,224,172);
  rectangle(0,560,W,294,24,74,59);rectangle(0,600,W,254,22,92,67);
  for(let i=0;i<18;i++){
    const x=13+(i*77)%460,y=540+(i*53)%210;
    rectangle(x,y,3,24,58,121,82);disc(x+1,y,12,79,159,93);
  }
  if(chapter>0){rectangle(40,690,410,30,120,143,112);rectangle(60,690,365,12,173,188,155);}
  if(chapter>1){
    rectangle(165,575,158,105,161,185,155);
    rectangle(158,565,175,20,209,227,198);
    rectangle(200,625,38,55,39,84,82);
  }
  fs.writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`),out]));
}
function escapeFFmpeg(s){return s.replaceAll("\\","\\\\").replaceAll(":","\\:").replaceAll("'","\\'").replaceAll("%","\\%");}
export async function renderNovariaVideo({outputPath,scenes}){
  if(!Array.isArray(scenes)||scenes.length!==3)throw Error("Exactly 3 verified scenes required.");
  for(const scene of scenes){
    if(!scene || typeof scene.title!=="string" || typeof scene.subtitle!=="string")throw Error("Incomplete scene.");
    if(scene.title.length>55||scene.subtitle.length>105)throw Error("Scene text too long.");
  }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"novaria-video-"));
  try{
    const args=["-hide_banner","-nostdin","-y"],filter=[];
    for(let i=0;i<3;i++){
      const frame=path.join(dir,`scene${i}.ppm`),title=path.join(dir,`title${i}.txt`),sub=path.join(dir,`sub${i}.txt`);
      background(frame,i);
      fs.writeFileSync(title,strip(scenes[i].title,55));
      fs.writeFileSync(sub,strip(scenes[i].subtitle,105));
      args.push("-loop","1","-framerate","20","-t","10","-i",frame);
      filter.push(`[${i}:v]fps=20,format=yuv420p,drawtext=font='DejaVu Sans':textfile='${escapeFFmpeg(title)}':fontcolor=white:fontsize=25:x=(w-text_w)/2:y=330:shadowcolor=black@0.7:shadowx=2:shadowy=3,drawtext=font='DejaVu Sans':textfile='${escapeFFmpeg(sub)}':fontcolor=0xD9EEDB:fontsize=16:x=(w-text_w)/2:y=395,fade=t=in:st=0:d=0.4,fade=t=out:st=9.5:d=0.5[v${i}]`);
    }
    filter.push("[v0][v1][v2]concat=n=3:v=1:a=0[v]");
    args.push("-f","lavfi","-t","30","-i","sine=frequency=185:sample_rate=44100");
    args.push("-filter_complex",filter.join(";"),"-map","[v]","-map","3:a","-af","volume=0.018",
      "-c:v","libx264","-preset","veryfast","-crf","30","-pix_fmt","yuv420p",
      "-c:a","aac","-b:a","48k","-movflags","+faststart","-t","30",outputPath);
    await new Promise((resolve,reject)=>{
      const cp=spawn(process.env.FFMPEG_PATH||"ffmpeg",args,{stdio:["ignore","ignore","pipe"]});
      let err="",timer=setTimeout(()=>cp.kill("SIGKILL"),150_000);
      cp.stderr.on("data",chunk=>{err=(err+chunk.toString()).slice(-1800)});
      cp.on("error",e=>{clearTimeout(timer);reject(e)});
      cp.on("close",code=>{clearTimeout(timer);code===0?resolve():reject(new Error("FFmpeg failed: "+err))});
    });
    const bytes=fs.statSync(outputPath).size;
    if(bytes<5_000 || bytes>3_000_000)throw Error("Generated video size failed bounds check.");
    return {outputPath,bytes,durationSeconds:30,renderMode:"native-ffmpeg-no-ai"};
  }finally{fs.rmSync(dir,{force:true,recursive:true})}
}
