import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({login:false,available:0,home:null},{headers:{"Cache-Control":"no-store"}});
  if(!db)return NextResponse.json({login:true,ready:false,home:null,available:0});
  try {
    const [found,count]=await Promise.all([
      db.query(`SELECT h.id, o.grid_x, o.grid_z FROM village_homes h JOIN village_objects o ON o.id=h.village_object_id JOIN village_epochs e ON e.id=h.epoch_id
        WHERE h.citizen_id=$1 AND h.status='diklaim' AND e.slug='desa-nol' LIMIT 1`,[session.user.id]),
      db.query(`SELECT count(*)::integer AS n FROM village_homes h JOIN village_epochs e ON e.id=h.epoch_id
        WHERE h.citizen_id IS NULL AND h.status='tersedia' AND e.slug='desa-nol' AND e.status='berjalan'`),
    ]);
    return NextResponse.json({login:true,ready:true,home:found.rows[0]??null,available:count.rows[0]?.n??0},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({login:true,ready:false,home:null,available:0});
  }
}

export async function POST(request:NextRequest){
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Silakan masuk dengan Google terlebih dahulu."},{status:401});
  if(!db)return NextResponse.json({error:"Database Desa Nol belum disiapkan."},{status:503});
  const origin=request.headers.get("origin");
  if(!origin || origin!==request.nextUrl.origin)return NextResponse.json({error:"Permintaan lintas situs tidak diizinkan."},{status:403});
  const client=await db.connect();
  try{
    await client.query("BEGIN");
    const citizen=await client.query("SELECT id FROM citizens WHERE id=$1 AND account_status='active' FOR UPDATE",[session.user.id]);
    if(!citizen.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Akun warga tidak aktif."},{status:403});}
    const already=await client.query("SELECT id FROM village_homes WHERE citizen_id=$1 AND status='diklaim' LIMIT 1",[session.user.id]);
    if(already.rowCount){await client.query("COMMIT");return NextResponse.json({claimed:true,already:true,homeId:already.rows[0].id});}
    const slot=await client.query(
      `SELECT h.id FROM village_homes h JOIN village_epochs e ON e.id=h.epoch_id
       WHERE h.status='tersedia' AND h.citizen_id IS NULL AND e.slug='desa-nol' AND e.status='berjalan'
       ORDER BY h.created_at, h.id LIMIT 1 FOR UPDATE OF h SKIP LOCKED`);
    if(!slot.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Belum ada rumah hasil voting yang tersedia. Kamu tetap bisa jalan-jalan."},{status:409});}
    await client.query("UPDATE village_homes SET citizen_id=$2,status='diklaim',claimed_at=NOW() WHERE id=$1",[slot.rows[0].id,session.user.id]);
    await client.query(
      `INSERT INTO audit_events(actor_type,actor_id,action,resource_type,resource_id,outcome,detail)
       VALUES('citizen',$1,'klaim_rumah_desa_nol','village_home',$2,'success','{}'::jsonb)`,[session.user.id,slot.rows[0].id]);
    await client.query("COMMIT");
    return NextResponse.json({claimed:true,already:false,homeId:slot.rows[0].id},{status:201});
  }catch{
    await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:"Rumah belum dapat diklaim. Coba kembali nanti."},{status:503});
  }finally{client.release();}
}
