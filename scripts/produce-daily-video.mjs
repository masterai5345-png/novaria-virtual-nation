// Scheduled code-only content producer. No Anthropic API, no expensive video service.
// Reads ONLY finalized vote results from Postgres; produces one factual MP4 per result.
// On the very first empty village, may produce one truthful introductory episode.
import pg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {renderNovariaVideo} from "./novaria-video-engine.mjs";
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is required.");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,application_name:"novaria-code-video"});
const client=await pool.connect();
let tmp=null;
try{
  const report=await client.query(`SELECT r.vote_day::text AS day,r.winning_option,r.winning_votes,r.total_votes
    FROM village_vote_results r JOIN village_epochs e ON e.id=r.epoch_id
    WHERE e.slug='desa-nol' ORDER BY r.vote_day DESC LIMIT 1`);
  const v=report.rows[0]??null;
  const key=v?`novaria:code-video:voted:${v.day}`:"novaria:code-video:introduction";
  const exist=await client.query("SELECT id FROM media_drafts WHERE content_key=$1 LIMIT 1",[key]);
  if(exist.rowCount){console.log("Episode already generated; no new video needed.",key);process.exitCode=0;}
  else {
    const names={"BUILD HOUSE":"rumah","BUILD ROAD":"jalan","PLANT TREE":"pohon","BUILD PARK":"taman","BUILD SHOP":"toko"};
    const kind=v?(names[v.winning_option]||"pembangunan"):"tanah kosong";
    const title=v?`WARGA MEMILIH ${kind.toUpperCase()}`:"NOVARIA: DESA NOL";
    const subtitle=v?`${v.winning_votes} dari ${v.total_votes} suara sah`:"Belum ada voting Instagram resmi";
    const scenes=[
      {title:"NOVARIA: DESA NOL",subtitle:"Cerita pembangunan desa kita"},
      {title:subtitle.length<40?subtitle:"HASIL VOTING WARGA",subtitle:v?"Sumber: hasil voting Instagram yang disahkan":"Desa masih menanti suara warga"},
      {title,subtitle:v?`Pembangunan ${kind} dipilih warga`:"Ikuti perjalanan NOVARIA"},
    ];
    tmp=path.join(os.tmpdir(),`novaria-episode-${process.pid}.mp4`);
    const video=await renderNovariaVideo({outputPath:tmp,scenes});
    const bytes=fs.readFileSync(tmp);
    await client.query("BEGIN");
    // Serialize the daily producer to prevent two simultaneous duplicate jobs.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('novaria:daily-video'))");
    const already=await client.query("SELECT id FROM media_drafts WHERE content_key=$1 FOR UPDATE",[key]);
    if(already.rowCount){await client.query("ROLLBACK");console.log("Video already produced in another job.");}
    else {
      const asset=await client.query(`INSERT INTO novaria_video_assets(content_key,video_bytes,bytes)
        VALUES ($1,$2,$3) RETURNING id`,[key,bytes,video.bytes]);
      const url=`/api/admin/novaria-video/${asset.rows[0].id}`;
      const draft=await client.query(`INSERT INTO media_drafts
        (content_key,platform,format,title,script,description,factual_data,media_asset_url,draft_status)
        VALUES($1,'youtube','vertical-short',$2,$3,$4,$5::jsonb,$6,'awaiting_approval') RETURNING id`,
        [key,title,scenes.map(x=>x.title+" — "+x.subtitle).join("\n"),
         v?`NOVARIA: hasil voting ${v.day}, pilihan ${kind}, ${v.winning_votes} dari ${v.total_votes} suara.`:
            "NOVARIA Desa Nol masih kosong dan menunggu voting Instagram resmi.",
         JSON.stringify({source:"village_vote_results",verification:v||"empty-start",engine:"ffmpeg-native-code",aiAPICalls:0,posted:false}),
         url]);
      await client.query(`INSERT INTO approval_requests(action_type,requested_by,action_payload)
        VALUES('review_native_video','novaria-code-video',$1::jsonb)`,
        [JSON.stringify({draftId:draft.rows[0].id,mediaAssetId:asset.rows[0].id,title,publicationStatus:"not-published"})]);
      await client.query(`INSERT INTO audit_events(actor_type,actor_id,action,resource_type,resource_id,outcome,detail)
        VALUES('system','novaria-code-video','create_native_video','media_draft',$1,'pending',$2::jsonb)`,
        [draft.rows[0].id,JSON.stringify({source:v?.day||"intro",bytes:video.bytes,generatedWithoutAI:true})]);
      // Protect small existing Postgres plan: retain only recent MP4 binaries.
      await client.query(`DELETE FROM novaria_video_assets
        WHERE content_key LIKE 'novaria:code-video:%' AND created_at<NOW()-INTERVAL '14 days'`);
      await client.query("COMMIT");
      console.log("Code-only MP4 saved for owner approval.",JSON.stringify({key,bytes:video.bytes,videoAssetId:asset.rows[0].id}));
    }
  }
}catch(error){await client.query("ROLLBACK").catch(()=>{});console.error("NOVARIA native video job failed:",error?.message||String(error));process.exitCode=1;
}finally{if(tmp)fs.rmSync(tmp,{force:true});client.release();await pool.end();}
