"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, error: "Supabase env nicht konfiguriert" };
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, error: "Anmeldung erforderlich" };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export async function listGameProfiles(): Promise<
  ActionResult<{ id: string; label_de: string; variant: string }[]>
> {
  const ctx = await requireClient();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("game_profiles")
    .select("id, label_de, variant")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

export async function createGameProfile(input: {
  label_de: string;
  variant: "evolution_free_bet" | "evolution_infinite_free_bet";
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireClient();
  if (!ctx.ok) return ctx;

  const row: TablesInsert<"game_profiles"> = {
    owner_id: ctx.userId,
    label_de: input.label_de,
    variant: input.variant,
    incomplete: true,
  };
  const { data, error } = await ctx.supabase
    .from("game_profiles")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id } };
}

export async function createTableSession(profileId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireClient();
  if (!ctx.ok) return ctx;

  const sessionRow: TablesInsert<"sessions"> = {
    owner_id: ctx.userId,
    profile_id: profileId,
    status: "active",
  };
  const { data, error } = await ctx.supabase
    .from("sessions")
    .insert(sessionRow)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id } };
}

export async function createShoe(
  sessionId: string,
  decks: number,
  penetration?: number
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireClient();
  if (!ctx.ok) return ctx;

  const shoeRow: TablesInsert<"shoes"> = {
    session_id: sessionId,
    decks,
    penetration: penetration ?? null,
  };
  const { data, error } = await ctx.supabase
    .from("shoes")
    .insert(shoeRow)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id } };
}

export async function recordDecision(input: {
  sessionId: string;
  handIndex: number;
  shoeId?: string;
  action: string;
  evBest?: number | null;
  evByAction?: Record<string, number> | null;
  incompleteReason?: string | null;
}): Promise<ActionResult<{ handId: string; decisionId: string }>> {
  const ctx = await requireClient();
  if (!ctx.ok) return ctx;

  const handRow: TablesInsert<"hands"> = {
    session_id: input.sessionId,
    hand_index: input.handIndex,
    shoe_id: input.shoeId ?? null,
  };
  const { data: hand, error: handError } = await ctx.supabase
    .from("hands")
    .insert(handRow)
    .select("id")
    .single();

  if (handError) return { ok: false, error: handError.message };

  const decisionRow: TablesInsert<"decisions"> = {
    hand_id: hand.id,
    action: input.action,
    ev_best: input.evBest ?? null,
    ev_by_action: (input.evByAction ?? null) as Json,
    incomplete_reason: input.incompleteReason ?? null,
  };
  const { data: decision, error: decisionError } = await ctx.supabase
    .from("decisions")
    .insert(decisionRow)
    .select("id")
    .single();

  if (decisionError) return { ok: false, error: decisionError.message };
  return { ok: true, data: { handId: hand.id, decisionId: decision.id } };
}

export async function getSupabasePersistenceStatus(): Promise<{
  configured: boolean;
  authenticated: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { configured: false, authenticated: false };
  }
  const { data: { user } } = await supabase.auth.getUser();
  return { configured: true, authenticated: Boolean(user) };
}