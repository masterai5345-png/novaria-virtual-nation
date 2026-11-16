import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/authz";
import { query } from "@/lib/db";
import s from "./dashboard.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Vote = { option_key:string; total:number };
type History = { vote_day:string; winning_option:string; winning_votes:number; total_votes:number };
type Job = { job_type:string; job_status:string; last_error:string|null; created_at:string };
type Comment = { platform:string; comment_text:string; moderation_status:string; received_at:string };
type DashboardData = {
  schemaReady:boolean; votes:Vote[]; projects:number; housesAvailable:number; housesClaimed:number;
  history:History[]; comments:Comment[]; pendingComments:number; commentCount:number;
  jobs:Job[]; approvals:number; drafts:number; workerLastSeen:string|null; socialConfigured:boolean;
  databaseError:boolean;
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
    pendingComments:0,commentCount:0,jobs:[],approvals:0,drafts:0,workerLastSeen:null,socialConfigured:false,databaseError:false};
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
    const existing=await query<{ok:boolean}>(
      "SELECT to_regclass('public.village_votes') IS NOT NULL AND to_regclass('public.village_epochs') IS NOT NULL AND to_regclass('public.village_objects') IS NOT NULL AND to_regclass('public.village_homes') IS NOT NULL AND to_regclass('public.village_vote_results') IS NOT NULL AS ok"
    );
    data.schemaReady = Boolean(existing.rows[0]?.ok);
    if(data.schemaReady){
      const [vote,building,home,history]=await Promise.all([
        query<Vote>("SELECT v.option_key,COUNT(*)::int AS total FROM village_votes v JOIN village_epochs e ON e.id=v.epoch_id WHERE e.slug='desa-nol' AND v.vote_day=$1::date GROUP BY v.option_key",[todayWIB()]),
        query<{count:string}>("SELECT COUNT(*)::text AS count FROM village_objects o JOIN village_epochs e ON e.id=o.epoch_id WHERE e.slug='desa-nol'"),
        query<{status:string;total:number}>("SELECT h.status,COUNT(*)::int AS total FROM village_homes h JOIN village_epochs e ON e.id=h.epoch_id WHERE e.slug='desa-nol' GROUP BY h.status"),
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
    const [cm,jobs,approvals,drafts,worker,recent]=await Promise.all([
      query<{total:string;pending:string}>("SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE moderation_status='pending')::text AS pending FROM social_comment_inbox"),
      query<Job>("SELECT job_type,job_status,LEFT(last_error,200) AS last_error,created_at::text FROM agent_jobs ORDER BY created_at DESC LIMIT 8"),
      query<{total:string}>("SELECT COUNT(*)::text AS total FROM approval_requests WHERE approval_status='pending'"),
      query<{total:string}>("SELECT COUNT(*)::text AS total FROM media_drafts"),
      query<{last_seen_at:string}>("SELECT last_seen_at::text FROM worker_heartbeats WHERE worker_key='novaria-agent-worker'"),
      query<Comment>("SELECT platform,LEFT(comment_text,180) AS comment_text,moderation_status,received_at::text FROM social_comment_inbox ORDER BY received_at DESC LIMIT 6")
    ]);
    data.commentCount=Number(cm.rows[0]?.total??0);
    data.pendingComments=Number(cm.rows[0]?.pending??0);
    data.jobs=jobs.rows;
    data.approvals=Number(approvals.rows[0]?.total??0);
    data.drafts=Number(drafts.rows[0]?.total??0);
    data.workerLastSeen=worker.rows[0]?.last_seen_at??null;
    data.comments=recent.rows;
  }catch{data.databaseError=true;}
  return data;
}
export default async function DashboardKepalaDesa(){
  const owner=await requireOwner();
  if(!owner.ok)notFound();
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
    <section className={s.metrics}>
      {[
        ["Suara Instagram hari ini",data.schemaReady?todayCount:"—",data.schemaReady?"Suara sah hari ini":"Belum tersedia"],
        ["Pembangunan Desa Nol",data.schemaReady?data.projects:"—",data.schemaReady?"Objek dari voting resmi":"Menunggu integrasi"],
        ["Rumah dapat diklaim",data.schemaReady?data.housesAvailable:"—",data.schemaReady?String(data.housesClaimed)+" rumah telah dimiliki":"Belum tersedia"],
        ["Komentar perlu ditinjau",data.pendingComments,data.commentCount+" komentar masuk tercatat"],
      ].map(([label,value,note])=><article key={String(label)} className={s.metric}><label>{label}</label><strong>{value}</strong><small>{note}</small></article>)}
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
          ["Video & Editing Agent","Belum terhubung","Merender MP4 dan menambahkan efek suara"],
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
        <div className={s.metric} style={{boxShadow:"none",background:"#f6f8f4",marginBottom:12}}><label>Draft konten</label><strong>{data.drafts}</strong><small>Draft tidak sama dengan video MP4 selesai</small></div>
        <div className={s.metric} style={{boxShadow:"none",background:"#f6f8f4"}}><label>Menunggu persetujuan</label><strong>{data.approvals}</strong><small>Periksa rincian di Pusat AI</small></div>
        <ul className={s.list}><li>Instagram: voting resmi dan konten</li><li>YouTube: Shorts dan mengajak penonton berkunjung</li><li>TikTok: promosi video perjalanan desa</li><li>Facebook: Reels dan pertumbuhan komunitas</li></ul>
        <p className={s.muted}>Belum tersedia data follower asli sampai API masing-masing platform terhubung.</p>
      </section>
    </div>
    <footer className={s.footer}>NOVARIA · Khusus pemilik · Dashboard pembacaan data saja · Tidak ada tombol untuk posting, mengubah biaya, atau mereset dunia.</footer>
  </div></main>;
}