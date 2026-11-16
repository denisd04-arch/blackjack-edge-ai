export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      game_profiles: {
        Row: {
          counting_systems: string[]
          created_at: string
          id: string
          incomplete: boolean
          label_de: string
          missing_fields: string[]
          owner_id: string
          rules: Json
          updated_at: string
          variant: string
        }
        Insert: {
          counting_systems?: string[]
          created_at?: string
          id?: string
          incomplete?: boolean
          label_de: string
          missing_fields?: string[]
          owner_id: string
          rules?: Json
          updated_at?: string
          variant: string
        }
        Update: {
          counting_systems?: string[]
          created_at?: string
          id?: string
          incomplete?: boolean
          label_de?: string
          missing_fields?: string[]
          owner_id?: string
          rules?: Json
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          ended_at: string | null
          id: string
          owner_id: string
          profile_id: string
          started_at: string
          status: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          owner_id: string
          profile_id: string
          started_at?: string
          status?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          owner_id?: string
          profile_id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      shoes: {
        Row: {
          created_at: string
          cut: Json | null
          decks: number | null
          id: string
          owner_id: string | null
          penetration: number | null
          report: Json | null
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          cut?: Json | null
          decks?: number | null
          id?: string
          owner_id?: string | null
          penetration?: number | null
          report?: Json | null
          session_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          cut?: Json | null
          decks?: number | null
          id?: string
          owner_id?: string | null
          penetration?: number | null
          report?: Json | null
          session_id?: string | null
          status?: string
        }
        Relationships: []
      }
      hands: {
        Row: {
          cards: Json | null
          created_at: string
          hand_index: number
          id: string
          round_id: string | null
          session_id: string
          shoe_id: string | null
        }
        Insert: {
          cards?: Json | null
          created_at?: string
          hand_index: number
          id?: string
          round_id?: string | null
          session_id: string
          shoe_id?: string | null
        }
        Update: {
          cards?: Json | null
          created_at?: string
          hand_index?: number
          id?: string
          round_id?: string | null
          session_id?: string
          shoe_id?: string | null
        }
        Relationships: []
      }
      decisions: {
        Row: {
          action: string
          amount_at_risk: number | null
          definitive: boolean | null
          ev_best: number | null
          ev_by_action: Json | null
          hand_id: string
          id: string
          incomplete_reason: string | null
          recorded_at: string
        }
        Insert: {
          action: string
          amount_at_risk?: number | null
          definitive?: boolean | null
          ev_best?: number | null
          ev_by_action?: Json | null
          hand_id: string
          id?: string
          incomplete_reason?: string | null
          recorded_at?: string
        }
        Update: {
          action?: string
          amount_at_risk?: number | null
          definitive?: boolean | null
          ev_best?: number | null
          ev_by_action?: Json | null
          hand_id?: string
          id?: string
          incomplete_reason?: string | null
          recorded_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: { owner_id: string; preset_id: string; currency: string; bankroll: number; kelly_fraction: number; min_edge: number; count_system: string; cut: Json; settings: Json; updated_at: string }
        Insert: { owner_id: string; preset_id: string; currency?: string; bankroll?: number; kelly_fraction?: number; min_edge?: number; count_system?: string; cut: Json; settings: Json; updated_at?: string }
        Update: { owner_id?: string; preset_id?: string; currency?: string; bankroll?: number; kelly_fraction?: number; min_edge?: number; count_system?: string; cut?: Json; settings?: Json; updated_at?: string }
        Relationships: []
      }
      settings_presets: {
        Row: { id: string; owner_id: string; preset_key: string; version: number; paytable_id: string; body: Json; created_at: string }
        Insert: { id?: string; owner_id: string; preset_key: string; version: number; paytable_id: string; body: Json; created_at?: string }
        Update: { id?: string; owner_id?: string; preset_key?: string; version?: number; paytable_id?: string; body?: Json; created_at?: string }
        Relationships: []
      }
      rule_profiles: {
        Row: { id: string; version: string; fields: Json; active: boolean; created_at: string }
        Insert: { id: string; version: string; fields: Json; active?: boolean; created_at?: string }
        Update: { id?: string; version?: string; fields?: Json; active?: boolean; created_at?: string }
        Relationships: []
      }
      side_bet_paytables: {
        Row: { id: string; version: number; source: string; active: boolean; payouts: Json; help_rtp: Json | null; created_at: string }
        Insert: { id: string; version: number; source: string; active?: boolean; payouts: Json; help_rtp?: Json | null; created_at?: string }
        Update: { id?: string; version?: number; source?: string; active?: boolean; payouts?: Json; help_rtp?: Json | null; created_at?: string }
        Relationships: []
      }
      shoe_card_events: {
        Row: { id: string; shoe_id: string; sequence: number; round_number: number; rank: string; suit: string; target: string; hand_index: number; seen: boolean }
        Insert: { id?: string; shoe_id: string; sequence: number; round_number: number; rank: string; suit: string; target: string; hand_index?: number; seen?: boolean }
        Update: { id?: string; shoe_id?: string; sequence?: number; round_number?: number; rank?: string; suit?: string; target?: string; hand_index?: number; seen?: boolean }
        Relationships: []
      }
      rounds: {
        Row: { id: string; shoe_id: string; round_number: number; started_at: string }
        Insert: { id?: string; shoe_id: string; round_number: number; started_at?: string }
        Update: { id?: string; shoe_id?: string; round_number?: number; started_at?: string }
        Relationships: []
      }
      actions: {
        Row: { id: string; round_id: string; hand_index: number; action: string; recommended: string | null; created_at: string }
        Insert: { id?: string; round_id: string; hand_index: number; action: string; recommended?: string | null; created_at?: string }
        Update: { id?: string; round_id?: string; hand_index?: number; action?: string; recommended?: string | null; created_at?: string }
        Relationships: []
      }
      decision_snapshots: {
        Row: { id: string; owner_id: string; shoe_id: string | null; round_number: number; paytable_id: string; recommendation: string; player_edge: number | null; quality: string; body: Json; created_at: string }
        Insert: { id?: string; owner_id: string; shoe_id?: string | null; round_number: number; paytable_id: string; recommendation: string; player_edge?: number | null; quality: string; body: Json; created_at?: string }
        Update: { id?: string; owner_id?: string; shoe_id?: string | null; round_number?: number; paytable_id?: string; recommendation?: string; player_edge?: number | null; quality?: string; body?: Json; created_at?: string }
        Relationships: []
      }
      side_bet_results: {
        Row: { id: string; round_id: string; paytable_id: string; bet_id: string; stake: number; ev: number | null; decision: string; result: number | null; created_at: string }
        Insert: { id?: string; round_id: string; paytable_id: string; bet_id: string; stake: number; ev?: number | null; decision: string; result?: number | null; created_at?: string }
        Update: { id?: string; round_id?: string; paytable_id?: string; bet_id?: string; stake?: number; ev?: number | null; decision?: string; result?: number | null; created_at?: string }
        Relationships: []
      }
      bankroll_transactions: {
        Row: { id: string; owner_id: string; shoe_id: string | null; amount: number; balance_after: number; note: string | null; created_at: string }
        Insert: { id?: string; owner_id: string; shoe_id?: string | null; amount: number; balance_after: number; note?: string | null; created_at?: string }
        Update: { id?: string; owner_id?: string; shoe_id?: string | null; amount?: number; balance_after?: number; note?: string | null; created_at?: string }
        Relationships: []
      }
      testing_runs: {
        Row: { id: string; owner_id: string; settings_snapshot: Json; paytable_id: string; status: string; created_at: string }
        Insert: { id?: string; owner_id: string; settings_snapshot: Json; paytable_id: string; status?: string; created_at?: string }
        Update: { id?: string; owner_id?: string; settings_snapshot?: Json; paytable_id?: string; status?: string; created_at?: string }
        Relationships: []
      }
      simulation_shoe_results: {
        Row: { id: string; run_id: string; seed: number; net: number; rounds: number; split: string }
        Insert: { id?: string; run_id: string; seed: number; net: number; rounds: number; split: string }
        Update: { id?: string; run_id?: string; seed?: number; net?: number; rounds?: number; split?: string }
        Relationships: []
      }
      forward_test_sessions: {
        Row: { id: string; owner_id: string; shoe_id: string | null; created_at: string }
        Insert: { id?: string; owner_id: string; shoe_id?: string | null; created_at?: string }
        Update: { id?: string; owner_id?: string; shoe_id?: string | null; created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];