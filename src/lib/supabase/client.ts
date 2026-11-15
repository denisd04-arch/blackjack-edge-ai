import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client (anon key only). Returns null when env is unset.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabasePublicEnv();
  if (!url || !anonKey) return null;

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}