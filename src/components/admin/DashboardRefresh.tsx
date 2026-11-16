"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updated, setUpdated] = useState(() => Date.now());
  useEffect(() => {
    // Refresh only while this owner browser tab is visible.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
        setUpdated(Date.now());
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router]);
  return <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
    <button type="button" disabled={isPending}
      onClick={() => { startTransition(() => router.refresh()); setUpdated(Date.now()); }}
      style={{cursor:"pointer",border:"1px solid #cbdcd0",background:"#fff",color:"#315a45",padding:"9px 14px",borderRadius:10,fontWeight:700}}>
      {isPending ? "Menyegarkan..." : "↻ Segarkan Data"}
    </button>
    <small style={{color:"#859589",fontSize:11}}>Refresh otomatis tiap 60 detik • {new Date(updated).toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta"})} WIB</small>
  </div>;
}
