// Menentukan pemenang voting harian dari data SQL. DEFAULT: hanya simulasi/ROLLBACK.
// Penggunaan (setelah review migrasi dan izin deployment):
//   node scripts/settle-village-vote.mjs 2026-11-15
//   node scripts/settle-village-vote.mjs 2026-11-15 --apply
import pg from "pg";

const day=process.argv[2];
const apply=process.argv.includes("--apply");
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
if(!/^\d{4}-\d{2}-\d{2}$/.test(day||"") || day>=today){
  console.error("Gunakan tanggal WIB yang sudah berlalu: YYYY-MM-DD.");
  process.exit(1);
}
if(!process.env.DATABASE_URL){console.error("DATABASE_URL belum diatur.");process.exit(1);}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
const client=await pool.connect();
try{
  await client.query("BEGIN");
  // Kunci epoch dan hitungan akhir untuk mencegah finalisasi ganda.
  const ep=await client.query("SELECT id,status FROM village_epochs WHERE slug='desa-nol' FOR UPDATE");
  if(!ep.rowCount||ep.rows[0].status!=="berjalan")throw Error("Desa belum aktif.");
  const id=ep.rows[0].id;
  const previous=await client.query("SELECT 1 FROM village_vote_results WHERE epoch_id=$1 AND vote_day=$2",[id,day]);
  if(previous.rowCount)throw Error("Tanggal ini telah difinalisasi sebelumnya.");
  const votes=await client.query(`SELECT option_key,COUNT(*)::integer AS total FROM village_votes
    WHERE epoch_id=$1 AND vote_day=$2 GROUP BY option_key
    ORDER BY total DESC,CASE option_key WHEN 'BUILD HOUSE' THEN 1 WHEN 'BUILD ROAD' THEN 2 WHEN 'PLANT TREE' THEN 3 WHEN 'BUILD PARK' THEN 4 ELSE 5 END
    LIMIT 5`,[id,day]);
  if(!votes.rowCount)throw Error("Tidak ada suara untuk tanggal ini.");
  const winner=votes.rows[0];
  const total=votes.rows.reduce((n,v)=>n+Number(v.total),0);
  const tiles=await client.query("SELECT grid_x,grid_z FROM village_objects WHERE epoch_id=$1",[id]);
  const occupied=new Set(tiles.rows.map(v=>`${v.grid_x},${v.grid_z}`));
  let position;
  for(let r=0;r<=4 && !position;r++){
    for(let z=-r;z<=r && !position;z++){
      for(let x=-r;x<=r;x++){
        if(Math.max(Math.abs(x),Math.abs(z))!==r||occupied.has(`${x},${z}`))continue;
        position={x,z};break;
      }
    }
  }
  if(!position)throw Error("Petak desa penuh; pembangunan tidak dilakukan.");
  console.log(JSON.stringify({tanggal:day,pemenang:winner.option_key,suaraPemenang:winner.total,total,plot:position,mode:apply?"TERAPKAN":"SIMULASI"},null,2));
  if(!apply){await client.query("ROLLBACK");console.log("Simulasi selesai. Tidak ada perubahan database.");}
  else{
    await client.query(`INSERT INTO village_vote_results(epoch_id,vote_day,winning_option,winning_votes,total_votes)
      VALUES($1,$2,$3,$4,$5)`,[id,day,winner.option_key,winner.total,total]);
    const plot=await client.query(`INSERT INTO village_objects(epoch_id,result_day,action_key,grid_x,grid_z)
      VALUES($1,$2,$3,$4,$5) RETURNING id`,[id,day,winner.option_key,position.x,position.z]);
    if(winner.option_key==="BUILD HOUSE"){
      await client.query("INSERT INTO village_homes(epoch_id,village_object_id) VALUES($1,$2)",[id,plot.rows[0].id]);
    }
    await client.query(`INSERT INTO audit_events(actor_type,actor_id,action,resource_type,resource_id,outcome,detail)
      VALUES('system','village-vote-settlement','village_daily_vote','village_epoch',$1,'success',$2::jsonb)`,[id,JSON.stringify({day,winner:winner.option_key,total})]);
    await client.query("COMMIT");
    console.log("Finalisasi dan pembangunan berhasil disimpan.");
  }
}catch(error){
  await client.query("ROLLBACK").catch(()=>{});
  console.error("Voting belum difinalisasi:",error instanceof Error?error.message:String(error));
  process.exitCode=1;
}finally{client.release();await pool.end();}
