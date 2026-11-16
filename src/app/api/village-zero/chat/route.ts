import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const clean=(value:string)=>value.normalize("NFKC").trim().replace(/\s+/g," ");
const unsafe=/https?:\/\/|www\.|(?:t\.me|discord\.gg|wa\.me)\/|\b(?:anjing|bangsat|kontol|memek|ngentot)\b/i;

export async function GET(){
 if(!db)return NextResponse.json({messages:[],online:false},{headers});
 try{
   const r=await db.query(`SELECT c.id::text,LEFT(c.display_name,28) AS name,
     c.avatar_species AS avatar,c.body,c.created_at::text AS created_at
     FROM village_chat_messages c JOIN village_epochs e ON e.id=c.epoch_id
     WHERE e.slug='desa-nol' AND e.status='berjalan' AND c.moderation_status='visible'
     ORDER BY c.created_at DESC LIMIT 35`);
   return NextResponse.json({messages:r.rows.reverse(),online:true},{headers});
 }catch{return NextResponse.json({messages:[],online:false},{status:503,headers});}
}

export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user?.id)return NextResponse.json({error:"Login Google diperlukan untuk mengirim chat."},{status:401});
 if(!db)return NextResponse.json({error:"Chat belum tersedia."},{status:503});
 const origin=req.headers.get("origin");
 if(!origin || origin!==req.nextUrl.origin)return NextResponse.json({error:"Permintaan tidak diizinkan."},{status:403});
 const raw=await req.text();
 if(raw.length>2500)return NextResponse.json({error:"Pesan terlalu panjang."},{status:413});
 let payload:unknown;try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:"Format tidak valid."},{status:400})}
 const text=(payload as {message?:unknown}|null)?.message;
 if(typeof text!=="string")return NextResponse.json({error:"Isi pesan tidak valid."},{status:400});
 const body=clean(text);
 if(body.length<1||body.length>280 || /[\u0000-\u001f\u007f]/.test(body) || unsafe.test(body)){
   return NextResponse.json({error:"Pesan tidak diizinkan. Hindari spam, tautan dan bahasa kasar (maks. 280 karakter)."},{status:400});
 }
 const client=await db.connect();
 try{
   await client.query("BEGIN");
   await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[session.user.id]);
   const citizen=await client.query(
     "SELECT id,display_name,avatar_species FROM citizens WHERE id=$1 AND account_status='active' LIMIT 1",
     [session.user.id]);
   if(!citizen.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Akun warga belum aktif."},{status:403})}
   const recent=await client.query(
     "SELECT COUNT(*)::int AS n,MAX(created_at) AS latest FROM village_chat_messages WHERE citizen_id=$1 AND created_at>NOW()-INTERVAL '60 seconds'",
     [session.user.id]);
   const n=Number(recent.rows[0]?.n||0);
   const latest=recent.rows[0]?.latest ? new Date(recent.rows[0].latest).getTime():0;
   if(n>=5 || Date.now()-latest<5000){
     await client.query("ROLLBACK");
     return NextResponse.json({error:"Terlalu cepat mengirim pesan. Coba beberapa detik lagi."},{status:429});
   }
   const epoch=await client.query("SELECT id FROM village_epochs WHERE slug='desa-nol' AND status='berjalan' LIMIT 1");
   if(!epoch.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Desa belum aktif."},{status:503})}
   const c=citizen.rows[0];
   const result=await client.query(
     "INSERT INTO village_chat_messages(epoch_id,citizen_id,display_name,avatar_species,body) VALUES($1,$2,$3,$4,$5) RETURNING id::text",
     [epoch.rows[0].id,c.id,String(c.display_name).slice(0,28),c.avatar_species,body]);
   await client.query("COMMIT");
   return NextResponse.json({ok:true,id:result.rows[0]?.id},{status:201,headers});
 }catch{
   await client.query("ROLLBACK").catch(()=>{});
   return NextResponse.json({error:"Pesan gagal dikirim."},{status:503});
 }finally{client.release()}
}
