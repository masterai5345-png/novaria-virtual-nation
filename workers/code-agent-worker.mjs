// NOVARIA code-first task worker. NO generative AI credits / remote model requests.
// Rule-based owner inbox, comment classification, approval records, heartbeat.
import pg from "pg";
if(!process.env.DATABASE_URL){console.error("DATABASE_URL required");process.exit(1)}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,
  application_name:"novaria-code-agent-worker",connectionTimeoutMillis:8000});
const KEY=process.env.WORKER_KEY||"novaria-agent-worker";
const SLEEP=Math.max(2500,Math.min(30000,Number(process.env.WORKER_POLL_MS)||5000));
let stopping=false;
process.on("SIGINT",()=>{stopping=true});process.on("SIGTERM",()=>{stopping=true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function heartbeat(status="running"){
  await pool.query(`INSERT INTO worker_heartbeats(worker_key,worker_type,worker_status,details,last_seen_at)
    VALUES($1,'code-first-agent-worker',$2,$3::jsonb,NOW())
    ON CONFLICT(worker_key) DO UPDATE SET worker_type=EXCLUDED.worker_type,
      worker_status=EXCLUDED.worker_status,details=EXCLUDED.details,last_seen_at=NOW()`,
    [KEY,status,JSON.stringify({mode:"deterministic-code",externalModelAPICalls:0,
      supportedJobTypes:["owner_command","comment_reply"],videoGenerator:"separate-FFmpeg-scheduler"})]);
}
async function takeJob(client){
 const r=await client.query(`WITH one AS(
     SELECT id FROM agent_jobs WHERE job_status='queued'
       AND job_type IN ('owner_command','comment_reply') AND scheduled_at<=NOW()
     ORDER BY priority DESC,created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
   ) UPDATE agent_jobs j SET job_status='running',attempts=attempts+1,started_at=NOW(),last_error=NULL
     FROM one WHERE j.id=one.id RETURNING j.*`);
 return r.rows[0]||null;
}
function classify(text){
 const content=String(text||"").slice(0,5000);
 if(/https?:\/\/|www\.|\b(?:scam|password|bank|payout|transfer|otp|pin)\b/i.test(content))
   return {blocked:true,classification:"review",reply:""};
 const keyword=content.toLocaleLowerCase("id-ID");
 if(/rumah|house|bangun|taman|pohon|jalan|toko|vote|voting|pilih/.test(keyword))
   return {blocked:false,classification:"construction",reply:"Terima kasih atas aspirasi pembangunan desa! Voting resmi hanya dihitung dari komentar Instagram NOVARIA pada posting yang ditentukan."};
 if(/halo|hai|hello|hi\b|salam/.test(keyword))
   return {blocked:false,classification:"welcome",reply:"Halo! Selamat datang di Desa Nol NOVARIA. Mari jelajahi desa dan ikuti perkembangannya bersama warga lain."};
 if(/login|google|ktp|maskot|avatar/.test(keyword))
   return {blocked:false,classification:"account",reply:"Profil warga, KTP permainan, dan maskot hewan permanen memerlukan login Google yang berfungsi. Periksa halaman bantuan NOVARIA bila mengalami kesulitan."};
 return {blocked:false,classification:"other",reply:"Terima kasih sudah bergabung dengan NOVARIA! Masukanmu kami catat untuk ditinjau Kepala Desa."};
}
async function handle(client,job){
 const run=await client.query(`INSERT INTO agent_runs(job_id,agent_key,model_name,run_status,input_summary)
    VALUES($1,$2,'code-only','running',$3) RETURNING id`,
   [job.id,job.agent_key,String(job.job_type).slice(0,150)]);
 const runId=run.rows[0].id;
 if(job.job_type==="owner_command"){
   const command=String(job.input_payload?.command??"").trim().slice(0,1600);
   if(!command)throw Error("Perintah pemilik kosong.");
   const payload={summary:"Perintah Kepala Desa diterima untuk peninjauan.",
     plan:["Tinjau permintaan dan dampak keamanan.","Tentukan apakah tugas dapat dikerjakan dengan aturan dan konektor yang tersedia.","Setujui tindakan yang aman sebelum publikasi."],
     request:command,mode:"deterministic-code",externalAI:false,executionMode:"proposal-only",needsOwnerApproval:true};
   await client.query("BEGIN");
   await client.query(`UPDATE agent_jobs SET job_status='awaiting_approval',result_payload=$2::jsonb,finished_at=NOW() WHERE id=$1`,
     [job.id,JSON.stringify(payload)]);
   await client.query(`INSERT INTO approval_requests(job_id,action_type,requested_by,action_payload)
     VALUES($1,'review_agent_plan','owner',$2::jsonb)`,[job.id,JSON.stringify(payload)]);
   await client.query(`UPDATE agent_runs SET run_status='completed',output_summary='Review planned without AI',finished_at=NOW() WHERE id=$1`,[runId]);
   await client.query("COMMIT");return;
 }
 const id=String(job.input_payload?.commentId??"");
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error("Missing valid comment ID.");
 const source=await client.query(`SELECT id,comment_text,moderation_status,reply_status
    FROM social_comment_inbox WHERE id=$1 LIMIT 1`,[id]);
 const comment=source.rows[0];
 if(!comment||comment.moderation_status!=="pending"||comment.reply_status!=="not_drafted")
    throw Error("Comment missing or already reviewed.");
 const classification=classify(comment.comment_text);
 await client.query("BEGIN");
 if(classification.blocked){
   await client.query(`UPDATE social_comment_inbox SET moderation_status='escalated',classification=$2,
     reply_status='rejected',reviewed_at=NOW() WHERE id=$1`,[id,classification.classification]);
   await client.query(`UPDATE agent_jobs SET job_status='completed',result_payload=$2::jsonb,finished_at=NOW() WHERE id=$1`,
     [job.id,JSON.stringify({summary:"Comment sent to moderation",externalAI:false})]);
 }else{
   await client.query(`UPDATE social_comment_inbox SET reply_draft=$2,reply_status='awaiting_approval',
      classification=$3 WHERE id=$1`,[id,classification.reply,classification.classification]);
   const payload={commentId:id,reply:classification.reply,classification:classification.classification,
     externalAI:false,publicationStatus:"not-published"};
   await client.query(`INSERT INTO approval_requests(job_id,action_type,requested_by,action_payload)
     VALUES($1,'review_comment_reply','code-first-worker',$2::jsonb)`,[job.id,JSON.stringify(payload)]);
   await client.query(`UPDATE agent_jobs SET job_status='awaiting_approval',result_payload=$2::jsonb,finished_at=NOW() WHERE id=$1`,
     [job.id,JSON.stringify(payload)]);
 }
 await client.query(`UPDATE agent_runs SET run_status='completed',output_summary=$2,finished_at=NOW() WHERE id=$1`,
   [runId,classification.blocked?"Escalated for moderation":"Drafted canned reply for owner review"]);
 await client.query("COMMIT");
}
console.log("NOVARIA code-first worker started. No generative model keys required.");
while(!stopping){
 let client,job;
 try{
   await heartbeat();
   client=await pool.connect();
   job=await takeJob(client);
   if(job)await handle(client,job);
 }catch(error){
   if(client)await client.query("ROLLBACK").catch(()=>{});
   console.error("Rule agent error:",String(error?.message||error).slice(0,300));
   if(job&&client){
      await client.query(`UPDATE agent_jobs SET job_status=CASE WHEN attempts<max_attempts THEN 'queued' ELSE 'failed' END,
        last_error=$2,finished_at=CASE WHEN attempts>=max_attempts THEN NOW() ELSE NULL END
        WHERE id=$1`,[job.id,String(error?.message||error).slice(0,500)]).catch(()=>{});
   }
 }finally{client?.release()}
 if(!stopping)await sleep(SLEEP);
}
await heartbeat("stopped").catch(()=>{});await pool.end();
