import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
import { bacaPilihan, hariJakarta } from "@/lib/village-voting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Penerima INTERNAL untuk connector Instagram resmi. BUKAN webhook Meta langsung.
// Connector terpercaya wajib memverifikasi X-Hub-Signature-256 dari Meta sebelum meneruskan payload ini.
export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database belum siap." }, { status: 503 });
  const secret = process.env.VILLAGE_VOTE_INGEST_SECRET;
  const allowedAccount = process.env.VILLAGE_INSTAGRAM_ACCOUNT_ID;
  const allowedMedia = (process.env.VILLAGE_INSTAGRAM_MEDIA_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!secret || secret.length < 32 || !allowedAccount || !allowedMedia.length) {
    return NextResponse.json({ error: "Konektor Instagram belum diaktifkan." }, { status: 503 });
  }
  const timestamp = request.headers.get("x-novaria-timestamp") ?? "";
  const signature = request.headers.get("x-novaria-signature") ?? "";
  const ts = Number(timestamp);
  if (!/^\d{10,}$/.test(timestamp) || !Number.isSafeInteger(ts) || Math.abs(Date.now()/1000-ts)>300) {
    return NextResponse.json({ error: "Timestamp tidak valid." }, { status: 401 });
  }
  const raw=await request.text();
  if (raw.length > 9000) return NextResponse.json({ error: "Ukuran payload berlebihan." }, { status: 413 });
  const mac=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(signature) || !timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(mac,"hex"))) {
    return NextResponse.json({ error: "Tanda tangan tidak valid." }, { status: 401 });
  }
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{return NextResponse.json({error:"JSON tidak valid."},{status:400});}
  if(!parsed||typeof parsed!=="object")return NextResponse.json({error:"Data tidak valid."},{status:400});
  const input=parsed as Record<string,unknown>;
  const account=typeof input.sourceAccountId==="string"?input.sourceAccountId:"";
  const media=typeof input.mediaId==="string"?input.mediaId:"";
  const comment=typeof input.commentId==="string"?input.commentId:"";
  const voter=typeof input.authorId==="string"?input.authorId:"";
  const text=typeof input.text==="string"?input.text:"";
  const date=typeof input.receivedAt==="string"?new Date(input.receivedAt):new Date(NaN);
  if(account!==allowedAccount || !allowedMedia.includes(media) || !/^[\w:.-]{1,160}$/.test(comment) ||
     !/^[\w:.-]{1,160}$/.test(voter) || text.length>1000 || !Number.isFinite(date.getTime())) {
    return NextResponse.json({error:"Akun, media, komentar atau waktu tidak valid."},{status:400});
  }
  if(date.getTime()>Date.now()+300000 || date.getTime()<Date.now()-14*86400000) {
    return NextResponse.json({error:"Komentar berada di luar rentang waktu."},{status:400});
  }
  const action=bacaPilihan(text);
  if(!action)return NextResponse.json({accepted:false,reason:"Bukan perintah voting."},{status:200});
  const day=hariJakarta(date);
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const epoch=await client.query("SELECT id FROM village_epochs WHERE slug='desa-nol' AND status='berjalan' LIMIT 1");
    if(!epoch.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Voting desa belum dibuka."},{status:409});}
    const epochId=epoch.rows[0].id;
    if(await client.query("SELECT 1 FROM village_vote_results WHERE epoch_id=$1 AND vote_day=$2 LIMIT 1",[epochId,day]).then(r=>r.rowCount)){
      await client.query("ROLLBACK");return NextResponse.json({accepted:false,reason:"Voting hari itu telah ditutup."},{status:409});
    }
    const result=await client.query(
      `INSERT INTO village_votes(epoch_id,source_account_id,media_id,comment_id,voter_id,vote_day,option_key)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING RETURNING id`,[epochId,account,media,comment,voter,day,action]);
    await client.query("COMMIT");
    return NextResponse.json({accepted:Boolean(result.rowCount),day,option:action,duplicate:!result.rowCount},{status:200});
  }catch{
    await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:"Voting gagal disimpan."},{status:503});
  }finally{client.release();}
}

// Laporan agregat saja; identitas pemilih tidak diekspos.
export async function GET() {
  if(!db)return NextResponse.json({configured:false,results:[]});
  try{
    const result=await db.query(
      `SELECT v.vote_day::text AS hari, v.option_key AS pilihan, COUNT(*)::integer AS jumlah
       FROM village_votes v JOIN village_epochs e ON e.id=v.epoch_id
       WHERE e.slug='desa-nol' AND e.status='berjalan'
       GROUP BY v.vote_day, v.option_key ORDER BY v.vote_day DESC, jumlah DESC LIMIT 40`);
    return NextResponse.json({configured:true,results:result.rows},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({configured:false,results:[]},{status:503});}
}
