import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { query } from "@/lib/db";
import type { QueryResultRow } from "pg";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth();
 if(!session?.user?.id)return NextResponse.json({authenticated:false},{headers:{"Cache-Control":"no-store"}});
 try{
   const result=await query<QueryResultRow&{display_name:string;avatar_species:string}>(
     "SELECT display_name,avatar_species FROM citizens WHERE id=$1 AND account_status='active' LIMIT 1",
     [session.user.id]);
   if(!result.rowCount)return NextResponse.json({authenticated:false},{status:403});
   const row=result.rows[0];
   return NextResponse.json({authenticated:true,name:row.display_name,animal:row.avatar_species},
     {headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({authenticated:false},{status:503})}
}
