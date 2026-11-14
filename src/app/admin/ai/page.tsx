import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Bot, Building2, ChartNoAxesCombined, CheckCircle2, CircleDashed, Clock3, Command, ShieldCheck, Video, Wallet } from "lucide-react";

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

export default function AICommandCenterPage() {
  // This preview intentionally stays unavailable in production until admin authentication and RBAC exist.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/"><span className="admin-brand-mark">N</span><span><b>NOVARIA</b><small>AI COMMAND CENTER</small></span></Link>
        <div className="admin-header-right"><span className="dev-pill"><i /> DEVELOPMENT PREVIEW</span><Link href="/">Back to town ↗</Link></div>
      </header>

      <section className="admin-welcome">
        <div>
          <span className="admin-eyebrow">OWNER CONTROL ROOM</span>
          <h1>Good day, <em>Founder.</em></h1>
          <p>One place to supervise the people, systems, stories and growth of NOVARIA.</p>
        </div>
        <div className="system-state"><span className="state-pulse" /><span><b>Control plane preview</b><small>AI execution is not connected yet</small></span></div>
      </section>

      <section className="admin-metrics">
        <article><span className="metric-icon"><Bot size={18}/></span><small>DEFINED AGENT ROLES</small><strong>14</strong><em>Across 3 departments</em></article>
        <article><span className="metric-icon"><Activity size={18}/></span><small>LIVE AGENT JOBS</small><strong>0</strong><em>No worker connected</em></article>
        <article><span className="metric-icon"><Building2 size={18}/></span><small>CITY AUTOMATIONS</small><strong>0</strong><em>Awaiting data integrations</em></article>
        <article><span className="metric-icon"><Video size={18}/></span><small>CONTENT DRAFTS</small><strong>0</strong><em>No media pipeline connected</em></article>
      </section>

      <section className="command-card">
        <div className="command-heading"><span className="command-icon"><Command size={20}/></span><div><span className="admin-eyebrow">CEO ORCHESTRATOR</span><h2>Give NOVARIA a direction</h2><p>Send a goal to the AI workforce. This control is a preview until the server-side agent runtime is configured.</p></div></div>
        <textarea aria-label="Example AI instruction" disabled placeholder="Example: Review verified population growth, plan the next residential block, and prepare a factual daily city update..." />
        <div className="command-footer"><span><ShieldCheck size={15}/> Owner approval required for publishing, payments and destructive changes.</span><button type="button" disabled>Connect AI runtime first <span>→</span></button></div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="admin-eyebrow">WORKFORCE DIRECTORY</span><h2>AI departments</h2></div><span className="section-caption">Role definitions · not live workers</span></div>
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
        <article className="admin-info-card"><span className="admin-eyebrow">NEXT CONNECTIONS</span><h3>What unlocks the real command center?</h3><ul><li>Administrator sign-in and role permissions</li><li>PostgreSQL job queue and audit trail</li><li>Claude API key stored on the server</li><li>Approved tools for city, media and community work</li><li>Worker process and scheduled triggers</li></ul></article>
        <article className="admin-info-card"><span className="admin-eyebrow">SAFETY BY DESIGN</span><h3>Human-controlled operations</h3><p>Agents may prepare plans and drafts. Publishing, real-money payouts, account bans, refunds, and destructive world edits stay behind explicit permissions and approval checks.</p><div className="safe-note"><ShieldCheck size={17}/> No live commands, payments or social replies are being executed from this preview.</div></article>
      </section>

      <footer className="admin-footer"><span>NOVARIA · OWNER CONTROL ROOM</span><span><ChartNoAxesCombined size={13}/> Built for a living virtual nation</span></footer>
    </main>
  );
}