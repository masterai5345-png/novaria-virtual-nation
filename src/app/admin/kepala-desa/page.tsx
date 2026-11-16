import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { requireOwner } from "@/lib/authz";
import { query } from "@/lib/db";
import s from "./dashboard.module.css";
import DashboardRefresh from "@/components/admin/DashboardRefresh";
import ApprovalInbox from "@/components/admin/ApprovalInbox";
import GlobalChatReport from "@/components/admin/GlobalChatReport";
import type { QueryResultRow } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Vote = QueryResultRow & { option_key:string; total:number };
type History = QueryResultRow & { vote_day:string; winning_option:string; winning_votes:number; total_votes:number };
type Job = QueryResultRow & { job_type:string; job_status:string; last_error:string|null; created_at:string };
type Comment = QueryResultRow & { platform:string; comment_text:string; moderation_status:string; received_at:string };
type FollowerSnapshot = QueryResultRow & { platform: string; follower_count: string; snapshot_date: string; net_change: string };
type NativeVideo = QueryResultRow & { title:string; media_asset_url:string; created_at:string; draft_status:string };
type DashboardData = {
  schemaReady:boolean; votes:Vote[]; projects:number; housesAvailable:number; housesClaimed:number;
  history:History[]; comments:Comment[]; pendingComments:number; commentCount:number;
  jobs:Job[]; approvals:number; drafts:number; workerLastSeen:string|null; socialConfigured:boolean;
  databaseError:boolean; followers:FollowerSnapshot[]; nativeVideos:NativeVideo[];
};
const choices = [
  {key:"BUILD HOUSE",title:"Bangun Rumah"},
  {key:"BUILD ROAD",title:"Bangun Jalan"},
  {key:"PLANT TREE",title:"Tanam Pohon"},
  {key:"BUILD PARK",title:"Bangun Taman"},
  {key:"BUILD SHOP",title:"Bangun Toko"},
];
function empty():DashboardData {
  return {schemaReady:false,votes:[],projects:0,housesAvailable:0,housesClaimed:0,history:[],comments:[],
    pendingComments:0,commentCount:0,jobs:[],approvals:0,drafts:0,workerLastSeen:null,socialConfigured:false,databaseError:false,followers:[],nativeVideos:[]};
}
function todayWIB():string {
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function readableDate(iso:string):string {
  const date = new Date(iso);
  if(Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(date);
}
async function load():Promise<DashboardData> {
  const data = empty();
  data.socialConfigured = Boolean(process.env.VILLAGE_INSTAGRAM_ACCOUNT_ID &&
    process.env.VILLAGE_INSTAGRAM_MEDIA_IDS && process.env.VILLAGE_VOTE_INGEST_SECRET);
  try {
    const existing=await query<{ok:boolean} & QueryResultRow>(
      "SELECT to_regclass('public.village_votes') IS NOT NULL AND to_regclass('public.village_epochs') IS NOT NULL AND to_regclass('public.village_objects') IS NOT NULL AND to_regclass('public.village_homes') IS NOT NULL AND to_regclass('public.village_vote_results') IS NOT NULL AS ok"
    );
    data.schemaReady = Boolean(existing.rows[0]?.ok);
    if(data.schemaReady){
      const [vote,building,home,history]=await Promise.all([
        query<Vote>("SELECT v.option_key,COUNT(*)::int AS total FROM village_votes v JOIN village_epochs e ON e.id=v.epoch_id WHERE e.slug='desa-nol' AND v.vote_day=$1::date GROUP BY v.option_key",[todayWIB()]),
        query<{count:string} & QueryResultRow>("SELECT COUNT(*)::text AS count FROM village_objects o JOIN village_epochs e ON e.id=o.epoch_id WHERE e.slug='desa-nol'"),
        query<{status:string;total:number} & QueryResultRow>("SELECT h.status,COUNT(*)::int AS total FROM village_homes h JOIN village_epochs e ON e.id=h.epoch_id WHERE e.slug='desa-nol' GROUP BY h.status"),
        query<History>("SELECT r.vote_day::text,r.winning_option,r.winning_votes,r.total_votes FROM village_vote_results r JOIN village_epochs e ON e.id=r.epoch_id WHERE e.slug='desa-nol' ORDER BY r.vote_day DESC LIMIT 7")
      ]);
      data.votes=vote.rows;
      data.projects=Number(building.rows[0]?.count??0);
      data.housesAvailable=Number(home.rows.find(v=>v.status==="tersedia")?.total??0);
      data.housesClaimed=Number(home.rows.find(v=>v.status==="diklaim")?.total??0);
      data.history=history.rows;
    }
  }catch{data.databaseError=true;}
  try{
    const [cm,jobs,approvals,drafts,worker,recent,followers]=await Promise.all([
      query<{total:string;pending:string} & QueryResultRow>("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE moderation_status='pending')::text AS pending FROM social_comment_inbox"),
      query<Job>("SELECT job_type,job_status,LEFT(last_error,200) AS last_error,created_at::text FROM agent_jobs ORDER BY created_at DESC LIMIT 8"),
      query<{total:string} & QueryResultRow>("SELECT COUNT(*)::text AS total FROM approval_requests WHERE approval_status='pending'"),
      query<{total:string} & QueryResultRow>("SELECT COUNT(*)::text AS total FROM media_drafts"),
      query<{last_seen_at:string} & QueryResultRow>("SELECT last_seen_at::text FROM worker_heartbeats WHERE worker_key='novaria-agent-worker'"),
      query<Comment>("SELECT platform,LEFT(comment_text,180) AS comment_text,moderation_status,received_at::text FROM social_comment_inbox ORDER BY received_at DESC LIMIT 6"),
      query<FollowerSnapshot>("SELECT DISTINCT ON (platform) platform, follower_count::text, snapshot_date::text, net_change::text FROM follower_snapshots ORDER BY platform, snapshot_date DESC, created_at DESC")
    ]);
    data.commentCount=Number(cm.rows[0]?.total??0);
    data.pendingComments=Number(cm.rows[0]?.pending??0);
    data.jobs=jobs.rows;
    data.approvals=Number(approvals.rows[0]?.total??0);
    data.drafts=Number(drafts.rows[0]?.total??0);
    data.workerLastSeen=worker.rows[0]?.last_seen_at??null;
    data.comments=recent.rows;
    data.followers=followers.rows;
  }catch{data.databaseError=true;}
  try{
    const videos=await query<NativeVideo>(
      "SELECT title,media_asset_url,created_at::text,draft_status FROM media_drafts WHERE content_key LIKE 'novaria:code-video:%' AND media_asset_url IS NOT NULL ORDER BY created_at DESC LIMIT 7"
    );
    data.nativeVideos=videos.rows;
  }catch{data.databaseError=true;}
  return data;
}
export default async function DashboardKepalaDesa(){
  const owner=await requireOwner();
  if(!owner.ok){
    const session=await auth();
    if(!session?.user?.id) redirect("/admin/kepala-desa/login");
    return <main style={{minHeight:"100dvh",background:"#eef4ed",padding:"15vh 20px",textAlign:"center",fontFamily:"Arial, sans-serif",color:"#294a3a"}}>
      <h1>Akses khusus Kepala Desa</h1>
      <p>Akun Google yang sedang masuk belum memiliki izin sebagai pemilik NOVARIA.</p>
      <p>Pastikan akun sesuai pengaturan pemilik dan sudah terdaftar sebagai warga aktif.</p>
      <a href="/admin/kepala-desa/login" style={{color:"#267850"}}>Gunakan akun Google pemilik</a>
    </main>;
  }
  const data=await load();
  const todayCount=data.votes.reduce((sum,v)=>sum+Number(v.total),0);
  const max=Math.max(1,...data.votes.map(v=>Number(v.total)));
  const workerOnline=Boolean(data.workerLastSeen&&Date.now()-new Date(data.workerLastSeen).getTime()<45000);
  const creditsBlocked=data.jobs.some(j=>j.job_status==="failed"&&j.last_error?.toLowerCase().includes("credit balance"));
  const countStatus=(s:string)=>data.jobs.filter(j=>j.job_status===s).length;
  return <main className={s.shell}><div className={s.frame}>
    <header className={s.top}>
      <Link className={s.logo} href="/admin/kepala-desa"><span className={s.mark}>N</span>
        <span><b className={s.brand}>NOVARIA</b><small className={s.subbrand}>DASHBOARD KEPALA DESA</small></span>
      </Link>
      <nav className={s.nav} aria-label="Navigasi dashboard pemilik">
        <Link href="/village-zero">Lihat Pratinjau Desa</Link>
        <Link href="/admin/ai">Pusat AI</Link>
        <Link href="/">Game Publik ↗</Link>
      </nav>
    </header>
    <div className={s.hero}><div>
      <span className={s.eyebrow}>DESA NOL • ASPIRASI WARGA • VOTING HARIAN</span>
      <h1>Selamat datang, Kepala Desa.</h1>
      <p>Pantau permintaan warga, penghitungan voting Instagram, pembangunan desa, pekerjaan AI Agent, serta konten YouTube, TikTok, Instagram dan Facebook dalam satu tempat.</p>
    </div><aside className={s.heroAside}><small className={s.muted}>Tanggal voting • WIB</small>
      <p className={s.strong}>{todayWIB()}</p>
      <span className={data.socialConfigured?s.pill+" "+s.green:s.pill+" "+s.amber}>{data.socialConfigured?"Konfigurasi konektor ada":"Instagram belum terhubung"}</span>
    </aside></div>
    {!data.schemaReady?<div className={s.notice}><b>Belum ada database Desa Nol yang aktif.</b> Data di pratinjau masih demo lokal. Dashboard tidak akan menampilkan angka suara atau pembangunan rekaan sebelum konektor Instagram resmi terhubung.</div>:null}
    {data.databaseError?<div className={s.notice}>Sebagian data belum dapat dibaca. Periksa skema database dan log server sebelum menyimpulkan angka nol berarti belum ada kegiatan.</div>:null}
    <div style={{marginBottom:18}}><DashboardRefresh /></div>
    <section className={s.metrics}>
      {[
        ["Suara Instagram hari ini",data.schemaReady?todayCount:"—",data.schemaReady?"Suara sah hari ini":"Belum tersedia"],
        ["Pembangunan Desa Nol",data.schemaReady?data.projects:"—",data.schemaReady?"Objek dari voting resmi":"Menunggu integrasi"],
        ["Rumah dapat diklaim",data.schemaReady?data.housesAvailable:"—",data.schemaReady?String(data.housesClaimed)+" rumah telah dimiliki":"Belum tersedia"],
        ["Komentar perlu ditinjau",data.pendingComments,data.commentCount+" komentar masuk tercatat"],
      ].map(([label,value,note])=><article key={String(label)} className={s.metric}><span style={{fontSize:12,color:"#71877b",fontWeight:700}}>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
    </section>
    <div className={s.grid}>
      <section className={s.card}><div className={s.head}><div><h2>🗳️ Voting Pembangunan Instagram</h2>
        <p>Hanya komentar di akun dan konten Instagram resmi yang bisa menentukan pembangunan desa.</p></div>
        <span className={s.pill}>Mode B · Satu akun satu suara</span></div>
        {data.schemaReady?choices.map(c=>{
          const count=Number(data.votes.find(v=>v.option_key===c.key)?.total??0);
          return <div key={c.key} className={s.track}><span className={s.trackLabel}>{c.title}</span>
            <div className={s.bar}><div className={s.fill} style={{width:String(count/max*100)+"%"}}/></div><span className={s.count}>{count}</span></div>;
        }):<div className={s.empty}>Belum ada suara Instagram asli yang dapat diperlihatkan. Diagram ini akan menampilkan permintaan rumah, jalan, pohon, taman dan toko setelah integrasi Meta berjalan.</div>}
        <p className={s.muted}>Komentar TikTok, YouTube dan Facebook hanya digunakan untuk engagement dan promosi, tidak untuk voting.</p>
      </section>
      <section className={s.card}><div className={s.head}><div><h2>🤖 Pengawasan Tim Agent</h2><p>Bedakan agent yang berjalan dengan agent yang baru direncanakan.</p></div>
        <span className={workerOnline?s.pill+" "+s.green:s.pill+" "+s.amber}>{workerOnline?"Worker aktif":"Worker tidak terdeteksi"}</span></div>
        {[
          ["Instagram Agent",data.socialConfigured?"Konfigurasi terpasang":"Belum terhubung","Mengambil komentar resmi dan memvalidasi sumber"],
          ["Voting Agent",data.schemaReady?"Skema tersedia":"Belum live","Menghitung suara dan menentukan pemenang harian"],
          ["Construction Agent",data.schemaReady?"Skema tersedia":"Belum live","Membuat objek sesuai hasil voting warga"],
          ["AI Naskah",creditsBlocked?"Terhambat kredit API":"Perlu uji","Menulis naskah berdasarkan kejadian asli di desa"],
          ["Video Kode & Editing",data.nativeVideos.length?"MP4 tersedia":"Menunggu jadwal","Membuat MP4 30 detik dengan FFmpeg dan data desa, tanpa AI generatif"],
          ["Publisher & Growth Agent","Belum terhubung","Upload video dan analisis follower empat platform"],
        ].map(([title,status,detail])=><div className={s.agent} key={title}><div><strong>{title}</strong><p>{detail}</p></div>
          <span className={status.includes("kredit")?s.pill+" "+s.red:s.pill+" "+s.amber}>{status}</span></div>)}
      </section>
    </div>
    <div className={s.grid}>
      <section className={s.card}><div className={s.head}><div><h2>🏗️ Riwayat Pembangunan</h2><p>Pemenang voting harian yang benar-benar sudah tercatat.</p></div><span className={s.pill}>Proyek: {data.schemaReady?data.projects:"—"}</span></div>
        {data.history.length?data.history.map(item=><div className={s.line} key={item.vote_day}><div><strong>{choices.find(c=>c.key===item.winning_option)?.title??item.winning_option}</strong>
          <p>{item.vote_day} • {item.winning_votes} dari {item.total_votes} suara</p></div><span className={s.pill+" "+s.green}>Menang</span></div>):<div className={s.empty}>Belum ada pemenang voting yang disahkan. Desa memang dimulai dari 0, bukan dari kota yang sudah jadi.</div>}
        <div className={s.stage} style={{marginTop:17}}>{[["01","Komentar IG"],["02","Voting"],["03","Pembangunan"],["04","Video baru"]].map(([n,v])=><div className={s.stageItem} key={n}><b>{n}</b><small>{v}</small></div>)}</div>
      </section>
      <section className={s.card}><div className={s.head}><div><h2>💬 Kotak Aspirasi Warga</h2><p>Komentar dari sumber yang sudah masuk ke sistem, bukan komentar palsu.</p></div><span className={s.pill}>{data.commentCount} komentar</span></div>
        {data.comments.length?data.comments.map((item,i)=><div className={s.line} key={i}><div><strong>{item.platform.toUpperCase()}</strong><p>{item.comment_text}</p>
          <small className={s.muted}>{readableDate(item.received_at)}</small></div><span className={s.pill}>{item.moderation_status}</span></div>):<div className={s.empty}>Belum ada komentar tercatat. Setelah terhubung, bagian ini membantu Kepala Desa melihat permintaan warga yang membutuhkan perhatian.</div>}
      </section>
    </div>
    <div className={s.grid}>
      <section className={s.card}><div className={s.head}><div><h2>🧾 Aktivitas dan Kendala Agent</h2><p>Lihat tugas yang berhasil, gagal, dan butuh peninjauan.</p></div><span className={countStatus("failed")?s.pill+" "+s.red:s.pill}>{countStatus("failed")} gagal (8 terbaru)</span></div>
        {data.jobs.length?data.jobs.map((job,i)=><div className={s.line} key={i}><div><strong>{job.job_type.replaceAll("_"," ")}</strong>
          <p>{job.last_error||"Tidak ada pesan error"} • {readableDate(job.created_at)}</p></div><span className={job.job_status==="failed"?s.pill+" "+s.red:s.pill}>{job.job_status}</span></div>):<div className={s.empty}>Belum ada riwayat job atau data tidak dapat dibaca.</div>}
      </section>
      <section className={s.card}><div className={s.head}><div><h2>🎬 Konten & Pertumbuhan</h2><p>Semua akun sosial media dikelola dari satu pusat pengawasan.</p></div><span className={s.pill}>4 platform</span></div>
        <div className={s.metric} style={{boxShadow:"none",background:"#f6f8f4",marginBottom:12}}><span style={{fontSize:12,color:"#71877b",fontWeight:700}}>Draft konten</span><strong>{data.drafts}</strong><small>Draft tidak sama dengan video MP4 selesai</small></div>
        <div className={s.metric} style={{boxShadow:"none",background:"#f6f8f4"}}><span style={{fontSize:12,color:"#71877b",fontWeight:700}}>Menunggu persetujuan</span><strong>{data.approvals}</strong><small>Periksa rincian di Pusat AI</small></div>
        <ul className={s.list}><li>Instagram: voting resmi dan konten</li><li>YouTube: Shorts dan mengajak penonton berkunjung</li><li>TikTok: promosi video perjalanan desa</li><li>Facebook: Reels dan pertumbuhan komunitas</li></ul>
        <div style={{marginTop:18,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>
          {["instagram","youtube","tiktok","facebook"].map(platform=>{
            const row=data.followers.find(v=>v.platform===platform);
            return <div key={platform} style={{border:"1px solid #dce6dd",background:"#f7f9f6",padding:12,borderRadius:13}}>
              <strong style={{fontSize:12,textTransform:"capitalize"}}>{platform}</strong>
              <div style={{fontSize:24,fontWeight:800,margin:"8px 0 3px"}}>{row?Number(row.follower_count).toLocaleString("id-ID"):"—"}</div>
              <small className={s.muted}>{row?"Perubahan bersih: "+row.net_change+" · "+row.snapshot_date:"Belum ada data dari API"}</small>
            </div>;
          })}
        </div>
        <p className={s.muted}>Angka adalah snapshot terakhir yang disimpan sistem, bukan statistik real-time jika konektor belum aktif.</p>
      </section>
    </div>
    <section className={s.card} style={{margin:"20px 0"}}>
      <div className={s.head}><div><h2>🎬 Mesin Video Otomatis (Tanpa AI Generatif)</h2>
        <p>FFmpeg membuat video vertikal dari data voting yang sudah disahkan. File disimpan sementara maksimal 14 hari. Tidak ada publikasi otomatis tanpa izin dan konektor resmi.</p>
      </div><span className={s.pill+" "+s.green}>Menggunakan kode</span></div>
      {data.nativeVideos.length?data.nativeVideos.map((v,i)=><div className={s.line} key={i}><div>
        <strong>{v.title}</strong><p>{readableDate(v.created_at)} · {v.draft_status} · 30 detik · 9:16</p>
      </div><a href={v.media_asset_url} target="_blank" rel="noopener noreferrer" style={{color:"#207650",fontWeight:700,fontSize:13}}>Putar MP4 ↗</a></div>):
        <div className={s.empty}>Belum ada video yang dihasilkan oleh jadwal berbasis kode. Jadwal pertama akan menyiapkan video dan meminta persetujuan; tidak akan berpura-pura sudah menerbitkan konten.</div>}
    </section>
    <div style={{margin:"20px 0"}}><GlobalChatReport/></div>
    <section className={s.card}><div className={s.head}><div><h2>✅ Persetujuan Penting Kepala Desa</h2><p>Tinjau naskah, rencana AI dan balasan komentar sebelum ada tindakan publik. Persetujuan saat ini hanya mencatat keputusan, belum mempublikasikan konten.</p></div><span className={s.pill}>{data.approvals} menunggu</span></div><ApprovalInbox /></section>
    <footer className={s.footer}>NOVARIA · Khusus pemilik · Dashboard pembacaan data saja · Tidak ada tombol untuk posting, mengubah biaya, atau mereset dunia.</footer>
  </div></main>;
}