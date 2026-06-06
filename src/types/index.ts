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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          tokens?: number;
          is_admin?: boolean;
          is_blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          tokens?: number;
          is_admin?: boolean;
          is_blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
}

export interface AuthUser {
  id: string;
  email: string;
}
