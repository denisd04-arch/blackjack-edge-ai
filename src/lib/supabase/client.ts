import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client. Requires env review before production use.
 * Placeholder: returns null when env is unset so UI can degrade gracefully.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) return null;

  browserClient = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  return browserClient;
}