import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/override
// Receives a manual override message from the dashboard UI.
// Calls the n8n override webhook which sends the message via IG Graph API.
export async function POST(req: NextRequest) {
  let body: { thread_id: string; message: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { thread_id, message } = body;

  if (!thread_id || !message?.trim()) {
    return NextResponse.json(
      { error: "thread_id and message are required" },
      { status: 400 }
    );
  }

  // Fetch the thread to get ig_thread_id
  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .select("ig_thread_id, ig_user_id, username")
    .eq("id", thread_id)
    .single();

  if (threadError || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Call n8n override webhook — n8n sends the reply via IG Graph API
  const n8nWebhookUrl = process.env.N8N_OVERRIDE_WEBHOOK_URL;
  if (!n8nWebhookUrl) {
    return NextResponse.json(
      { error: "N8N_OVERRIDE_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  const n8nRes = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ig_thread_id: thread.ig_thread_id,
      ig_user_id: thread.ig_user_id,
      message: message.trim(),
    }),
  });

  if (!n8nRes.ok) {
    const errText = await n8nRes.text();
    console.error("n8n override webhook error:", errText);
    return NextResponse.json(
      { error: "Failed to send via n8n" },
      { status: 502 }
    );
  }

  // Record the override message in Supabase
  const now = new Date().toISOString();
  await supabase.from("dm_messages").insert({
    thread_id,
    ig_message_id: null,
    direction: "outbound",
    content: message.trim(),
    sent_at: now,
    is_ai: false,
    override: true,
  });

  // Clear any pending AI draft on this thread since we overrode it
  await supabase
    .from("dm_threads")
    .update({ pending_ai_draft: null, updated_at: now })
    .eq("id", thread_id);

  return NextResponse.json({ ok: true });
}
