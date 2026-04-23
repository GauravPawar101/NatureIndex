// Generated types for Supabase
// Run: npm run supabase:types to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          username: string
          email: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          twitter: string | null
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          twitter?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          twitter?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          title: string
          slug: string
          content: string
          summary: string | null
          cover_image: string | null
          cover_blur: string | null
          status: 'draft' | 'published'
          date: string
          views: number
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          slug: string
          content: string
          summary?: string | null
          cover_image?: string | null
          cover_blur?: string | null
          status?: 'draft' | 'published'
          date?: string
          views?: number
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          slug?: string
          content?: string
          summary?: string | null
          cover_image?: string | null
          cover_blur?: string | null
          status?: 'draft' | 'published'
          date?: string
          views?: number
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
        }
      }
      likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
          created_at?: string
        }
      }
      post_versions: {
        Row: {
          id: string
          post_id: string
          title: string
          content: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          post_id: string
          title: string
          content: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          id?: string
          post_id?: string
          title?: string
          content?: string
          updated_at?: string
          updated_by?: string
        }
      }
      subscribers: {
        Row: {
          id: string
          email: string
          confirmed: boolean
          token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          confirmed?: boolean
          token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          confirmed?: boolean
          token?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
