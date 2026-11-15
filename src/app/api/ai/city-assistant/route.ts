import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

function localReply(message: string, resident?: { displayName?: string; publicHandle?: string; species?: string }) {
  const text = message.toLowerCase();
  if (resident && (text.includes("siapa") || text.includes("maskot") || text.includes("warga ini"))) {
    return `${resident.displayName || "Warga NOVARIA"} adalah warga NOVARIA${resident.publicHandle ? ` dengan username @${resident.publicHandle}` : ""}. Maskotnya ${resident.species || "hewan"}.`;
  }
  if (text.includes("malam") || text.includes("siang")) {
    return "Gunakan tombol bulan/matahari di bagian atas kota untuk mengganti suasana siang dan malam.";
  }
  if (text.includes("cari") || text.includes("username") || text.includes("instagram")) {
    return "Masukkan username Instagram yang sudah ditautkan di Profil Warga, lalu tekan Cari. Tombol Acak memilih salah satu warga yang sudah mengaktifkan username publik.";
  }
  if (text.includes("misi") || text.includes("quest")) {
    return "Buka menu Misi Kota di sisi kiri untuk melihat misi, status penyelesaian, dan saldo NOVA Coin virtual.";
  }
  if (text.includes("rumah") || text.includes("hunian")) {
    return "Warga yang sudah masuk dapat membuka Profil Warga dan mengklaim rumah komunitas yang tersedia.";
  }
  return "Selamat datang di NOVARIA! Aku bisa membantu mencari warga, menjelaskan distrik, memandu misi kota, dan menjelaskan cara mengatur maskotmu. Untuk percakapan AI penuh, admin perlu memasang ANTHROPIC_API_KEY pada web service Render.";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Chat request must be an object." }, { status: 400 });
  }

  const input = body as {
    messages?: unknown;
    resident?: { displayName?: unknown; publicHandle?: unknown; species?: unknown };
  };
  if (!Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 8) {
    return NextResponse.json({ error: "Send between one and eight recent messages." }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const item of input.messages) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });
    }
    const message = item as { role?: unknown; content?: unknown };
    if (
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.trim().length === 0 ||
      message.content.length > 1200
    ) {
      return NextResponse.json({ error: "Chat messages must be valid text up to 1,200 characters." }, { status: 400 });
    }
    messages.push({ role: message.role, content: message.content.trim() });
  }

  const resident = input.resident && typeof input.resident === "object"
    ? {
        displayName: typeof input.resident.displayName === "string" ? input.resident.displayName.slice(0, 60) : undefined,
        publicHandle: typeof input.resident.publicHandle === "string" ? input.resident.publicHandle.slice(0, 30) : undefined,
        species: typeof input.resident.species === "string" ? input.resident.species.slice(0, 30) : undefined,
      }
    : undefined;

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: localReply(lastUserMessage, resident), source: "built-in-guide" });
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 420,
        system: [
          "You are Pak Wali Kota Beruang, the friendly Indonesian-speaking mayor of NOVARIA, a playful 3D virtual city inhabited by animal mascot citizens.",
          "Answer in natural Indonesian, warmly and briefly (up to four short sentences).",
          "Help citizens understand city districts, public resident lookup, virtual citizen cards, missions, homes, and day/night controls.",
          "Never claim NOVA Coin is cash or withdrawable. Never invent real follower counts, payments, citizen identities, or city statistics.",
          resident ? `Currently selected public resident: ${resident.displayName || "NOVARIA resident"}, handle ${resident.publicHandle ? "@" + resident.publicHandle : "not shared"}, mascot species ${resident.species || "unknown"}.` : "No resident is currently selected.",
        ].join(" "),
        messages: messages.map((message) => ({ role: message.role, content: message.content })),
      }),
      signal: AbortSignal.timeout(18_000),
    });
    const payload = await response.json() as {
      content?: { type?: string; text?: string }[];
      error?: { message?: string };
    };
    if (!response.ok) {
      return NextResponse.json({
        reply: localReply(lastUserMessage, resident),
        source: "built-in-guide",
        warning: payload.error?.message || "AI provider request failed.",
      });
    }
    const reply = (payload.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
    return NextResponse.json({ reply: reply || localReply(lastUserMessage, resident), source: "anthropic" });
  } catch {
    return NextResponse.json({
      reply: localReply(lastUserMessage, resident),
      source: "built-in-guide",
      warning: "AI provider did not respond in time.",
    });
  }
}
