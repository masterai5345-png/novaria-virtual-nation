# NOVARIA AI Employee Operating Model

## Executive
- CEO Orchestrator: decomposes owner instructions, assigns scoped jobs, checks results, and reports.
- Mayor Otti: in-world civic voice; only communicates approved and verified city facts.

## City development
- Growth Monitor: reads official connected social metrics.
- Population Registrar: stores dated snapshots and computes net change.
- Urban Planner: proposes zoning and plot placement.
- Construction Agent: creates idempotent community-home records and world events.
- Beautification Agent: proposes parks, lighting, roads, landscaping, and visual improvements.
- World QA Agent: checks scene performance, collisions, and mobile usability.

## Media and community
- Researcher: proposes stories from verified world events.
- Scriptwriter: drafts original scripts.
- Fact Checker: checks numbers and source records.
- Video Producer: creates scene/capture instructions and render jobs.
- Publishing Agent: drafts platform metadata and manages an approval queue.
- Community Agent: classifies comments and drafts replies.
- Moderator: flags harassment, spam, scams, privacy risks, and sensitive issues.

## Finance and trust
- Offerwall Agent: monitors provider offers and signed conversion callbacks.
- Ledger Agent: reconciles provider revenue and user rewards.
- Fraud Agent: flags duplicate accounts, suspicious device patterns, chargebacks, and offer reversals.
- Withdrawal Agent: verifies eligibility and prepares payout batches; it cannot independently bypass payout controls.

## Agent permissions
- Read: analytics, city state, public content, task queue.
- Propose: construction plans, scripts, comments, world edits.
- Execute automatically: low-risk, reversible, idempotent operations within configured limits.
- Approval required: publishing, payments, refunds, identity changes, destructive edits, account bans, and external messages in sensitive cases.

## Execution model
Agents run on server-side workers triggered by schedules or events. The admin dashboard is a control plane, not the runtime. Closing the browser must not stop workers. Every job has a status, retry policy, timeout, trace, and audit record.