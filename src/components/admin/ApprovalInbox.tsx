"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileText, RefreshCw, ShieldAlert, X } from "lucide-react";

type Approval = {
  id: string;
  action_type: string;
  approval_status: string;
  action_payload: Record<string, unknown>;
  created_at: string;
  result_payload?: { summary?: string; plan?: string[] };
  draft_title?: string | null;
  draft_script?: string | null;
  draft_description?: string | null;
  job_status?: string | null;
};

export default function ApprovalInbox() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/approvals", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { approvals: Approval[] };
      setApprovals(data.approvals);
    } catch {
      // Preserve the last successful inbox view.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 12_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: "Reviewed in NOVARIA AI Command Center." }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Approval update failed.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="approval-inbox">
      <div className="queue-heading"><b>Owner approval inbox</b><button type="button" onClick={() => void refresh()}><RefreshCw size={13}/> Refresh</button></div>
      {error ? <p className="command-error">{error}</p> : null}
      {approvals.length === 0 ? <p className="queue-empty">No proposals are waiting for review.</p> : null}
      {approvals.map((item) => (
        <article className="approval-card" key={item.id}>
          <div className="approval-topline">
            <span className="approval-icon">{item.action_type === "review_media_draft" ? <FileText size={17}/> : <ShieldAlert size={17}/>}</span>
            <span className="approval-kind">{item.action_type.replaceAll("_", " ")}</span>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </div>
          {item.action_type === "review_media_draft" ? (
            <>
              <h3>{item.draft_title || String(item.action_payload.title || "Daily video draft")}</h3>
              <p className="approval-script">{item.draft_script || "Draft script is unavailable."}</p>
              {item.draft_description ? <p className="approval-description">{item.draft_description}</p> : null}
            </>
          ) : (
            <>
              <h3>{item.result_payload?.summary || "AI plan ready for review"}</h3>
              {item.result_payload?.plan?.length ? <ol>{item.result_payload.plan.map((step, index) => <li key={index}>{step}</li>)}</ol> : null}
            </>
          )}
          <div className="approval-actions">
            <button type="button" className="approval-reject" disabled={busyId === item.id} onClick={() => void decide(item.id, "rejected")}><X size={14}/> Reject</button>
            <button type="button" className="approval-accept" disabled={busyId === item.id} onClick={() => void decide(item.id, "approved")}><Check size={14}/> Approve review</button>
          </div>
        </article>
      ))}
      <p className="approval-disclaimer">Approval records the review decision only. It does not publish content or execute external actions.</p>
    </div>
  );
}
