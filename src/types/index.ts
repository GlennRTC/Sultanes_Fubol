// Supabase Database shape (manually maintained)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          tokens: number;
          is_admin: boolean;
          is_blocked: boolean;
          leaderboard_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          tokens?: number;
          is_admin?: boolean;
          is_blocked?: boolean;
          leaderboard_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          tokens?: number;
          is_admin?: boolean;
          is_blocked?: boolean;
          leaderboard_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          home_team: string;
          away_team: string;
          group_name: string;
          match_datetime: string;
          status: 'scheduled' | 'live' | 'finished';
          home_score: number | null;
          away_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          home_team: string;
          away_team: string;
          group_name: string;
          match_datetime: string;
          status?: 'scheduled' | 'live' | 'finished';
          home_score?: number | null;
          away_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          home_team?: string;
          away_team?: string;
          group_name?: string;
          match_datetime?: string;
          status?: 'scheduled' | 'live' | 'finished';
          home_score?: number | null;
          away_score?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          home_score_prediction: number;
          away_score_prediction: number;
          tokens_wagered: number;
          tokens_awarded: number | null;
          points_earned: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          home_score_prediction: number;
          away_score_prediction: number;
          tokens_wagered?: number;
          tokens_awarded?: number | null;
          points_earned?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          home_score_prediction?: number;
          away_score_prediction?: number;
          tokens_wagered?: number;
          tokens_awarded?: number | null;
          points_earned?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard_view: {
        Row: {
          id: string;
          username: string;
          tokens: number;
          leaderboard_points: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      place_prediction: {
        Args: { p_match_id: string; p_home_score: number; p_away_score: number };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// App-level domain types
export interface Profile {
  id: string;
  username: string;
  tokens: number;
  is_admin: boolean;
  is_blocked: boolean;
  leaderboard_points: number;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  group_name: string;           // 'A' through 'L'
  match_datetime: string;       // ISO string from DB, always UTC
  status: 'scheduled' | 'live' | 'finished';
  home_score: number | null;
  away_score: number | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score_prediction: number;
  away_score_prediction: number;
  tokens_wagered: number;
  tokens_awarded: number | null;
  points_earned: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  tokens: number;
  leaderboard_points: number;
}
