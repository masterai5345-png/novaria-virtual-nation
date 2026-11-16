import {NextResponse} from "next/server";
import {requireOwner} from "@/lib/authz";
import {query} from "@/lib/db";
import type {QueryResultRow} from "pg";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type VideoRow=QueryResultRow & {video_bytes:Buffer;bytes:number};
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
  const access=await requireOwner();
  if(!access.ok)return NextResponse.json({error:access.reason},{status:access.status,headers:{"Cache-Control":"no-store"}});
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"ID video tidak valid."},{status:400});
  try{
    const r=await query<VideoRow>(
      "SELECT video_bytes,bytes FROM novaria_video_assets WHERE id=$1::uuid LIMIT 1",[id]);
    if(!r.rowCount)return NextResponse.json({error:"Video tidak ditemukan atau telah kedaluwarsa."},{status:404});
    const blob=new Blob([new Uint8Array(r.rows[0].video_bytes)],{type:"video/mp4"});
    return new NextResponse(blob,{headers:{"Content-Type":"video/mp4","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":'inline; filename="novaria-video.mp4"',"Content-Length":String(r.rows[0].bytes)}});
  }catch{return NextResponse.json({error:"Video belum tersedia."},{status:503})}
}
