import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton — created on first call, never at module load time.
// This keeps the module safe to import during Next.js SSR/SSG prerender,
// where NEXT_PUBLIC_SUPABASE_URL may be absent. All actual calls happen
// inside useEffect hooks, which only run in the browser.
let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file."
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreadStatus = "active" | "qualified" | "booked" | "closed";

export interface DMThread {
  id: string;
  ig_thread_id: string;
  ig_user_id: string;
  username: string;
  display_name: string;
  avatar_initial: string;
  avatar_color: string;
  status: ThreadStatus;
  last_message: string;
  last_timestamp: string;
  pending_ai_draft: string | null;
  created_at: string;
  updated_at: string;
}

export interface DMMessage {
  id: string;
  thread_id: string;
  ig_message_id: string | null;
  direction: "inbound" | "outbound";
  content: string;
  sent_at: string;
  is_ai: boolean;
  override: boolean;
}

export interface DailyStats {
  id: string;
  date: string;
  total_handled: number;
  qualified: number;
  booked: number;
  closed: number;
  revenue: number;
  replies_received: number;
  deals_progressed: number;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchThreads(): Promise<DMThread[]> {
  const { data, error } = await db()
    .from("dm_threads")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(threadId: string): Promise<DMMessage[]> {
  const { data, error } = await db()
    .from("dm_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTodayStats(): Promise<DailyStats | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await db()
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToThreads(onUpdate: () => void) {
  return db()
    .channel("dm_threads_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "dm_threads" },
      onUpdate
    )
    .subscribe();
}

export function subscribeToMessages(threadId: string, onUpdate: () => void) {
  return db()
    .channel(`messages_${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dm_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      onUpdate
    )
    .subscribe();
}

export function subscribeToStats(onUpdate: () => void) {
  return db()
    .channel("daily_stats_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "daily_stats" },
      onUpdate
    )
    .subscribe();
}
