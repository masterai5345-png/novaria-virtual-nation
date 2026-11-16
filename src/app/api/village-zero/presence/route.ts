import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){
 if(!db)return NextResponse.json({players:[],online:false},{headers});
 try{
  const r=await db.query(`SELECT p.id::text AS id,LEFT(c.display_name,28) AS name,c.avatar_species AS animal,
    p.x,p.z,p.activity
    FROM village_presence p JOIN citizens c ON c.id=p.citizen_id JOIN village_epochs e ON e.id=p.epoch_id
    WHERE e.slug='desa-nol' AND e.status='berjalan' AND c.account_status='active'
      AND p.updated_at>NOW()-INTERVAL '22 seconds'
    ORDER BY p.updated_at DESC LIMIT 70`);
  return NextResponse.json({online:true,players:r.rows},{headers});
 }catch{return NextResponse.json({online:false,players:[]},{status:503,headers})}
}
export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user?.id)return NextResponse.json({error:"Login diperlukan."},{status:401});
 if(!db)return NextResponse.json({error:"Server belum siap."},{status:503});
 if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Asal permintaan ditolak."},{status:403});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Data tidak valid."},{status:400})}
 const p=body as {x?:unknown;z?:unknown;activity?:unknown}|null;
 if(typeof p?.x!=="number"||typeof p.z!=="number"||!Number.isFinite(p.x)||!Number.isFinite(p.z)
   || Math.abs(p.x)>48 || Math.abs(p.z)>48 || !["idle","walk","sit","wave"].includes(String(p.activity))){
    return NextResponse.json({error:"Posisi atau aktivitas tidak valid."},{status:400});
 }
 try{
   const r=await db.query(`INSERT INTO village_presence(epoch_id,citizen_id,x,z,activity)
     SELECT e.id,c.id,$2,$3,$4 FROM village_epochs e,citizens c
     WHERE e.slug='desa-nol' AND e.status='berjalan' AND c.id=$1 AND c.account_status='active'
     ON CONFLICT(citizen_id) DO UPDATE SET x=EXCLUDED.x,z=EXCLUDED.z,activity=EXCLUDED.activity,updated_at=NOW()
     RETURNING id::text`,[session.user.id,p.x,p.z,p.activity]);
   if(!r.rowCount)return NextResponse.json({error:"Warga atau desa tidak aktif."},{status:403});
   return NextResponse.json({ok:true,myPresenceId:r.rows[0].id},{headers});
 }catch{return NextResponse.json({error:"Gagal memperbarui posisi."},{status:503})}
}
