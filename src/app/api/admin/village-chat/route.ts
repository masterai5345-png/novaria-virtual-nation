import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";
import { query } from "@/lib/db";
import type { QueryResultRow } from "pg";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  const access=await requireOwner();
  if(!access.ok)return NextResponse.json({error:"Akses pemilik diperlukan."},{status:403});
  try{
    const [recent,counts]=await Promise.all([
      query<QueryResultRow&{id:string;display_name:string;body:string;created_at:string;moderation_status:string}>(
        `SELECT c.id::text,c.display_name,c.body,c.created_at::text,c.moderation_status
         FROM village_chat_messages c JOIN village_epochs e ON e.id=c.epoch_id
         WHERE e.slug='desa-nol' ORDER BY c.created_at DESC LIMIT 60`),
      query<QueryResultRow&{all:number;visible:number;hidden:number}>(
        `SELECT COUNT(*)::int AS all,COUNT(*) FILTER(WHERE moderation_status='visible')::int AS visible,
         COUNT(*) FILTER(WHERE moderation_status='hidden')::int AS hidden FROM village_chat_messages`)
    ]);
    return NextResponse.json({messages:recent.rows,counts:counts.rows[0]||{all:0,visible:0,hidden:0}},
      {headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Chat belum tersedia."},{status:503})}
}
export async function POST(req:NextRequest){
  const owner=await requireOwner();if(!owner.ok)return NextResponse.json({error:"Akses ditolak."},{status:403});
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Permintaan lintas situs ditolak."},{status:403});
  let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Format JSON salah."},{status:400})}
  const id=(body as {id?:unknown}|null)?.id;
  if(typeof id!=="string"||!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:"ID chat tidak valid."},{status:400});
  try{
    const r=await query(
      `UPDATE village_chat_messages SET moderation_status='hidden'
       WHERE id=$1::uuid AND moderation_status='visible' RETURNING id`,[id]);
    if(!r.rowCount)return NextResponse.json({error:"Chat tidak ditemukan atau sudah disembunyikan."},{status:404});
    await query(
      `INSERT INTO audit_events(actor_type,actor_id,action,resource_type,resource_id,outcome,detail)
       VALUES('owner',$1,'hide_global_chat','village_chat',$2,'success','{}'::jsonb)`,
       [owner.citizenId,id]);
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Tidak dapat memoderasi pesan."},{status:503})}
}
