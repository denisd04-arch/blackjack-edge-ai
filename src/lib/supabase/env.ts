/** Public Supabase env (safe for browser and server). Never use service role in the app. */
export function getSupabasePublicEnv():
  | { url: string; anonKey: string }
  | { url: null; anonKey: null } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;

  if (!url || !anonKey) {
    return { url: null, anonKey: null };
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicEnv();
  return Boolean(url && anonKey);
}