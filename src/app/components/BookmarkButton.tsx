'use client'

import { useState, useTransition, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Bookmark } from 'lucide-react'
import { toggleBookmark } from '@/actions/reactions'

interface BookmarkButtonProps {
  postId: string
  initialBookmarked: boolean
  className?: string
  size?: number
}

export default function BookmarkButton({ 
  postId, 
  initialBookmarked, 
  className = '', 
  size = 16 
}: BookmarkButtonProps) {
  const { isLoaded, userId } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  useEffect(() => {
    setBookmarked(initialBookmarked)
  }, [initialBookmarked])

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      window.location.href = '/login'
      return
    }

    // Optimistic update
    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked)

    startTransition(async () => {
      const result = await toggleBookmark({ post_id: postId })

      if (!result.success) {
        // Rollback on error
        setBookmarked(!newBookmarked)
      }
    })
  }

  if (!isLoaded) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-gray-200 opacity-50 ${className}`}
      >
        <Bookmark width={size} height={size} strokeWidth={2} fill="none" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      className={
        `inline-flex items-center justify-center rounded-md border transition-all ` +
        (bookmarked 
          ? 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15 ' 
          : 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 ') +
        (isPending ? 'opacity-70 cursor-not-allowed' : '') +
        className
      }
    >
      <Bookmark
        width={size}
        height={size}
        strokeWidth={2}
        fill={bookmarked ? 'currentColor' : 'none'}
        className={`transition-all ${bookmarked ? 'scale-110' : ''} ${isPending ? 'animate-pulse' : ''}`}
      />
    </button>
  )
}
