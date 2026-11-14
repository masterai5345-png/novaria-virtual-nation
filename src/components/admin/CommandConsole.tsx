"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, RefreshCw, Clock3, CheckCircle2, AlertTriangle } from "lucide-react";

type CommandJob = {
  id: string;
  job_status: string;
  input_payload: { command?: string };
  result_payload: { summary?: string; plan?: string[] };
  last_error: string | null;
  created_at: string;
};

export default function CommandConsole() {
  const [command, setCommand] = useState("");
  const [jobs, setJobs] = useState<CommandJob[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/commands", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { jobs: CommandJob[] };
      setJobs(data.jobs);
    } catch {
      // A temporary dashboard refresh failure should not erase the existing view.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = command.trim();
    if (!value || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: value }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not queue the command.");
      setCommand("");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="command-console">
      <form onSubmit={submit}>
        <textarea
          aria-label="Instruction for NOVARIA CEO Agent"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          maxLength={2000}
          placeholder="Example: Review the latest verified city events and prepare tomorrow's community update. Suggest three ways to improve Harbor View..."
        />
        <div className="command-footer">
          <span>Commands are queued for Claude. Results are proposals; external actions require approval.</span>
          <button type="submit" disabled={sending || command.trim().length < 8}>
            <Send size={14}/> {sending ? "Queueing…" : "Send command"}
          </button>
        </div>
      </form>
      {error ? <p className="command-error" role="alert">{error}</p> : null}
      <div className="queue-heading"><b>Recent command history</b><button type="button" onClick={() => void refresh()}><RefreshCw size={13}/> Refresh</button></div>
      {jobs.length === 0 ? (
        <p className="queue-empty">No commands yet. Your requests will appear here.</p>
      ) : (
        <div className="command-history">
          {jobs.map((job) => (
            <article className="command-history-row" key={job.id}>
              <span className="history-status">
                {job.job_status === "completed" ? <CheckCircle2 size={17}/> : job.job_status === "failed" ? <AlertTriangle size={17}/> : <Clock3 size={17}/>}
              </span>
              <div className="history-main">
                <b>{job.input_payload?.command || "Owner command"}</b>
                {job.result_payload?.summary ? <p>{job.result_payload.summary}</p> : null}
                {job.last_error ? <p className="command-error">{job.last_error}</p> : null}
                <small>{new Date(job.created_at).toLocaleString()} · {job.job_status.replaceAll("_", " ")}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
