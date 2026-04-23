import { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Bookmark = Database['public']['Tables']['bookmarks']['Row']
export type PostVersion = Database['public']['Tables']['post_versions']['Row']
export type Subscriber = Database['public']['Tables']['subscribers']['Row']

export type PostWithAuthor = Post & {
  profiles: Profile | null
}

export type PostWithDetails = Post & {
  profiles: Profile | null
  tags: Tag[]
  _count?: {
    likes: number
    comments: number
    bookmarks: number
  }
}

export type CommentWithAuthor = Comment & {
  profiles: Profile | null
}

export type { Database }
