// Supabase Database shape (manually maintained)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;          // uuid, FK to auth.users
          username: string;
          tokens: number;
          is_admin: boolean;
          is_blocked: boolean;
          created_at: string;  // ISO 8601 UTC
          updated_at: string;  // ISO 8601 UTC
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
    };
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
