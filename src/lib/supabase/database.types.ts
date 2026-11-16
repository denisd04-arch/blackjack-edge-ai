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
          decks: number | null
          id: string
          penetration: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          decks?: number | null
          id?: string
          penetration?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          decks?: number | null
          id?: string
          penetration?: number | null
          session_id?: string
        }
        Relationships: []
      }
      hands: {
        Row: {
          created_at: string
          hand_index: number
          id: string
          session_id: string
          shoe_id: string | null
        }
        Insert: {
          created_at?: string
          hand_index: number
          id?: string
          session_id: string
          shoe_id?: string | null
        }
        Update: {
          created_at?: string
          hand_index?: number
          id?: string
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];