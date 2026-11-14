import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bot, Building2, ChartNoAxesCombined, CheckCircle2, CircleDashed, Clock3, ShieldCheck, Video, Wallet } from "lucide-react";
import CommandConsole from "@/components/admin/CommandConsole";
import { requireOwner } from "@/lib/authz";

const departments = [
  {
    name: "City Development",
    description: "Population, planning, construction and town quality",
    icon: Building2,
    agents: [
      ["Growth Monitor", "Reads connected social metrics", "not-configured"],
      ["Population Registrar", "Records verified daily net growth", "planned"],
      ["Urban Planner", "Plans plots, districts and roads", "planned"],
      ["House Construction", "Creates idempotent home events", "planned"],
      ["City Beautification", "Proposes parks and visual upgrades", "planned"],
    ],
  },
  {
    name: "Media & Community",
    description: "Daily stories, publishing workflow and citizen conversations",
    icon: Video,
    agents: [
      ["Content Researcher", "Finds story ideas from city events", "planned"],
      ["Scriptwriter", "Drafts daily episode scripts", "planned"],
      ["Fact Checker", "Verifies every number before use", "planned"],
      ["Video Producer", "Prepares capture and render jobs", "planned"],
      ["Community Reply", "Drafts safe, relevant comment replies", "planned"],
    ],
  },
  {
    name: "Finance & Trust",
    description: "Reward integrity, reconciliation and risk control",
    icon: Wallet,
    agents: [
      ["Offerwall Monitor", "Reads approved provider events", "disabled"],
      ["Reward Ledger", "Reconciles approved user liabilities", "disabled"],
      ["Fraud Detection", "Flags suspicious activity", "planned"],
      ["Withdrawal Operations", "Prepares reviewed payout batches", "disabled"],
    ],
  },
];

const statusLabel: Record<string, string> = {
  "not-configured": "Not connected",
  planned: "Planned",
  disabled: "Disabled",
};

export const dynamic = "force-dynamic";

export default async function AICommandCenterPage() {
  const access = await requireOwner();
  if (!access.ok) notFound();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/"><span className="admin-brand-mark">N</span><span><b>NOVARIA</b><small>AI COMMAND CENTER</small></span></Link>
        <div className="admin-header-right"><span className="dev-pill"><i /> OWNER CONTROL ROOM</span><Link href="/">Back to town ↗</Link></div>
      </header>

      <section className="admin-welcome">
        <div>
          <span className="admin-eyebrow">OWNER CONTROL ROOM</span>
          <h1>Good day, <em>Founder.</em></h1>
          <p>Supervise the city, the media operation and the NOVARIA AI workforce.</p>
        </div>
        <div className="system-state"><span className="state-pulse" /><span><b>Owner session verified</b><small>Commands are queued for reviewable AI planning</small></span></div>
      </section>

      <section className="admin-metrics">
        <article><span className="metric-icon"><Bot size={18}/></span><small>DEFINED AGENT ROLES</small><strong>13</strong><em>Seeded role definitions</em></article>
        <article><span className="metric-icon"><Activity size={18}/></span><small>LIVE AGENT JOBS</small><strong>Queue</strong><em>Refresh command history below</em></article>
        <article><span className="metric-icon"><Building2 size={18}/></span><small>CITY AUTOMATIONS</small><strong>Setup</strong><em>Awaiting social API access</em></article>
        <article><span className="metric-icon"><Video size={18}/></span><small>CONTENT WORKFLOW</small><strong>Drafts</strong><em>Video rendering not connected</em></article>
      </section>

      <section className="command-card">
        <div className="command-heading"><span className="command-icon"><Bot size={20}/></span><div><span className="admin-eyebrow">CEO ORCHESTRATOR</span><h2>Give NOVARIA a direction</h2><p>Your request is stored in PostgreSQL. The Claude worker will prepare a plan for review; this worker cannot execute external actions.</p></div></div>
        <CommandConsole />
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="admin-eyebrow">WORKFORCE DIRECTORY</span><h2>AI departments</h2></div><span className="section-caption">Role definitions · actual worker connections vary by configuration</span></div>
        <div className="department-grid">
          {departments.map((department) => {
            const Icon = department.icon;
            return <article className="department-card" key={department.name}>
              <div className="department-heading"><span><Icon size={19}/></span><div><h3>{department.name}</h3><p>{department.description}</p></div></div>
              <div className="agent-list">
                {department.agents.map(([name, description, status]) => <div className="agent-row" key={name}><span className="agent-dot">{status === "not-configured" ? <CircleDashed size={15}/> : status === "disabled" ? <Clock3 size={15}/> : <CheckCircle2 size={15}/>}</span><div className="agent-copy"><b>{name}</b><small>{description}</small></div><span className={`agent-status status-${status}`}>{statusLabel[status]}</span></div>)}
              </div>
            </article>;
          })}
        </div>
      </section>

      <section className="admin-bottom-grid">
        <article className="admin-info-card"><span className="admin-eyebrow">NEXT CONNECTIONS</span><h3>What unlocks full automation?</h3><ul><li>Official YouTube / Meta analytics permissions</li><li>Persistent worker on an always-on host</li><li>Video generation and media storage provider</li><li>Community comment moderation and publishing approvals</li><li>Monitoring, alerts and backups</li></ul></article>
        <article className="admin-info-card"><span className="admin-eyebrow">SAFETY BY DESIGN</span><h3>Owner-controlled operations</h3><p>Claude prepares proposals. Publishing, social replies, financial activity, account bans, refunds, and destructive changes stay behind explicit permissions and approvals.</p><div className="safe-note"><ShieldCheck size={17}/> No money movement or public posting is available from this command console.</div></article>
      </section>

      <footer className="admin-footer"><span>NOVARIA · OWNER CONTROL ROOM</span><span><ChartNoAxesCombined size={13}/> Built for a living virtual nation</span></footer>
    </main>
  );
}
