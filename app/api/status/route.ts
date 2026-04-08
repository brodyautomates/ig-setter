import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Quick health check — returns which services are configured.
// Used by the dashboard to show a connection banner.
export async function GET() {
  const checks = {
    supabase: false,
    n8n: !!process.env.N8N_OVERRIDE_WEBHOOK_URL,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
  };

  // Test Supabase connectivity
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.from("dm_threads").select("id").limit(1);
    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  const allConnected = Object.values(checks).every(Boolean);

  return NextResponse.json({ ok: allConnected, checks });
}
