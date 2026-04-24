'use client'

import { useState, useTransition, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/actions/reactions'

interface LikeButtonProps {
  postId: string
  initialCount: number
  initialLiked: boolean
  className?: string
}

export default function LikeButton({ postId, initialCount, initialLiked, className = '' }: LikeButtonProps) {
  const { isLoaded, userId } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    setLiked(initialLiked)
    setCount(initialCount)
  }, [initialLiked, initialCount])

  function handleClick() {
    if (!userId) {
      window.location.href = '/login'
      return
    }

    // Optimistic update
    const newLiked = !liked
    setLiked(newLiked)
    setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))

    startTransition(async () => {
      const result = await toggleLike({ post_id: postId })

      if (!result.success) {
        // Rollback on error
        setLiked(!newLiked)
        setCount(prev => newLiked ? Math.max(0, prev - 1) : prev + 1)
      }
    })
  }

  if (!isLoaded) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border bg-zinc-800/30 text-gray-300 border-gray-700/50 opacity-50 ${className}`}
      >
        <Heart className="w-4 h-4 text-gray-400" />
        <span>{count}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border transition-all ' +
        (liked
          ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
          : 'bg-zinc-800/30 text-gray-300 border-gray-700/50 hover:bg-orange-500/5 hover:text-orange-200') +
        (isPending ? ' opacity-70 cursor-not-allowed' : '') +
        (className ? ` ${className}` : '')
      }
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <Heart 
        className={`w-4 h-4 transition-all ${liked ? 'fill-orange-400 text-orange-400 scale-110' : 'text-gray-400'} ${isPending ? 'animate-pulse' : ''}`}
      />
      <span className={isPending ? 'animate-pulse' : ''}>{count}</span>
    </button>
  )
}
