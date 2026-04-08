import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Meta webhook verification (GET) ─────────────────────────────────────────
// Meta sends a GET request to verify the webhook endpoint during setup.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── Incoming DM event (POST) ─────────────────────────────────────────────────
// n8n sends a cleaned payload here after processing the raw Meta webhook event.
// Payload shape:
// {
//   ig_thread_id: string,
//   ig_user_id: string,
//   username: string,
//   ig_message_id: string,
//   content: string,
//   direction: "inbound" | "outbound",
//   is_ai: boolean,
//   ai_draft: string | null,
//   status: "active" | "qualified" | "booked" | "closed"
// }
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  // Verify the request is from n8n using a shared secret
  const authHeader = req.headers.get("x-webhook-secret");
  if (authHeader !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ig_thread_id: string;
    ig_user_id: string;
    username: string;
    ig_message_id: string;
    content: string;
    direction: "inbound" | "outbound";
    is_ai: boolean;
    ai_draft: string | null;
    status: "active" | "qualified" | "booked" | "closed";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    ig_thread_id,
    ig_user_id,
    username,
    ig_message_id,
    content,
    direction,
    is_ai,
    ai_draft,
    status,
  } = body;

  // Derive avatar initial and a deterministic color from username
  const avatar_initial = username.charAt(0).toUpperCase();
  const avatar_color = usernameToColor(username);
  const now = new Date().toISOString();
  const timestamp = formatRelativeTime(now);

  // Upsert thread (insert or update on ig_thread_id conflict)
  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .upsert(
      {
        ig_thread_id,
        ig_user_id,
        username,
        display_name: username,
        avatar_initial,
        avatar_color,
        status,
        last_message: content,
        last_timestamp: timestamp,
        pending_ai_draft: ai_draft ?? null,
        updated_at: now,
      },
      { onConflict: "ig_thread_id" }
    )
    .select()
    .single();

  if (threadError) {
    console.error("Thread upsert error:", threadError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Insert message
  const { error: msgError } = await supabase.from("dm_messages").insert({
    thread_id: thread.id,
    ig_message_id: ig_message_id ?? null,
    direction,
    content,
    sent_at: now,
    is_ai,
    override: false,
  });

  if (msgError) {
    console.error("Message insert error:", msgError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Increment today's stats
  await upsertDailyStats(status, direction);

  return NextResponse.json({ ok: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usernameToColor(username: string): string {
  const colors = [
    "#7c3aed", "#3b82f6", "#22c55e", "#f59e0b",
    "#ec4899", "#06b6d4", "#8b5cf6", "#f97316",
    "#14b8a6", "#ef4444", "#a78bfa", "#059669",
    "#d97706", "#db2777", "#0891b2",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function upsertDailyStats(
  status: string,
  direction: "inbound" | "outbound"
) {
  const supabase = getSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .maybeSingle();

  if (!existing) {
    await supabase.from("daily_stats").insert({
      date: today,
      total_handled: 1,
      qualified: status === "qualified" ? 1 : 0,
      booked: status === "booked" ? 1 : 0,
      closed: status === "closed" ? 1 : 0,
      revenue: 0,
      replies_received: direction === "inbound" ? 1 : 0,
      deals_progressed: ["qualified", "booked", "closed"].includes(status)
        ? 1
        : 0,
    });
  } else {
    await supabase
      .from("daily_stats")
      .update({
        total_handled: existing.total_handled + 1,
        qualified:
          existing.qualified + (status === "qualified" ? 1 : 0),
        booked: existing.booked + (status === "booked" ? 1 : 0),
        closed: existing.closed + (status === "closed" ? 1 : 0),
        replies_received:
          existing.replies_received + (direction === "inbound" ? 1 : 0),
        deals_progressed:
          existing.deals_progressed +
          (["qualified", "booked", "closed"].includes(status) ? 1 : 0),
      })
      .eq("date", today);
  }
}
