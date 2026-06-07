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
      bet_pools: {
        Row: {
          id: string;
          question: string;
          type: 'binary' | 'multiple_exclusive';
          status: 'open' | 'closed' | 'resolved';
          deadline: string;
          winning_option_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          type: 'binary' | 'multiple_exclusive';
          status?: 'open' | 'closed' | 'resolved';
          deadline: string;
          winning_option_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          type?: 'binary' | 'multiple_exclusive';
          status?: 'open' | 'closed' | 'resolved';
          deadline?: string;
          winning_option_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pool_options: {
        Row: {
          id: string;
          pool_id: string;
          label: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          label: string;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          label?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          pool_id: string;
          option_id: string;
          tokens_wagered: number;
          tokens_won: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pool_id: string;
          option_id: string;
          tokens_wagered: number;
          tokens_won?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pool_id?: string;
          option_id?: string;
          tokens_wagered?: number;
          tokens_won?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      token_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: 'pool_bet' | 'pool_payout' | 'prediction_bet' | 'prediction_payout' | 'admin_grant';
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: 'pool_bet' | 'pool_payout' | 'prediction_bet' | 'prediction_payout' | 'admin_grant';
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: 'pool_bet' | 'pool_payout' | 'prediction_bet' | 'prediction_payout' | 'admin_grant';
          reference_id?: string | null;
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
      pool_option_totals: {
        Row: {
          pool_id: string;
          option_id: string;
          tokens_total: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      place_prediction: {
        Args: { p_match_id: string; p_home_score: number; p_away_score: number };
        Returns: void;
      };
      place_bet: {
        Args: { p_pool_id: string; p_option_id: string; p_amount: number };
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

export interface PoolOption {
  id: string;
  pool_id: string;
  label: string;
  position: number;
  created_at: string;
}

export interface BetPool {
  id: string;
  question: string;
  type: 'binary' | 'multiple_exclusive';
  status: 'open' | 'closed' | 'resolved';
  deadline: string;           // ISO UTC string
  winning_option_id: string | null;
  created_at: string;
  pool_options?: PoolOption[]; // populated by select('*, pool_options(*)')
}

export interface Bet {
  id: string;
  user_id: string;
  pool_id: string;
  option_id: string;
  tokens_wagered: number;
  tokens_won: number | null;  // null until resolved
  created_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;             // negative = debit, positive = credit
  type: 'pool_bet' | 'pool_payout' | 'prediction_bet' | 'prediction_payout' | 'admin_grant';
  reference_id: string | null;
  created_at: string;
}

export interface PoolOptionTotal {
  pool_id: string;
  option_id: string;
  tokens_total: number;
}
