'use client'

import { useState, useTransition, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { UserPlus, UserMinus } from 'lucide-react'
import { toggleFollow } from '@/actions/follows'

interface FollowButtonProps {
  followingId: string
  initialFollowing: boolean
}

export default function FollowButton({ followingId, initialFollowing }: FollowButtonProps) {
  const { isLoaded, userId } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [following, setFollowing] = useState(initialFollowing)

  useEffect(() => {
    setFollowing(initialFollowing)
  }, [initialFollowing])

  // Don't show button if user is viewing their own profile
  if (userId === followingId) {
    return null
  }

  function handleClick() {
    if (!userId) {
      window.location.href = '/login'
      return
    }

    // Optimistic update
    const newFollowing = !following
    setFollowing(newFollowing)

    startTransition(async () => {
      const result = await toggleFollow({ following_id: followingId })

      if (!result.success) {
        // Rollback on error
        setFollowing(!newFollowing)
      }
    })
  }

  if (!isLoaded) {
    return (
      <button
        type="button"
        disabled
        className="px-4 py-2 rounded-full border border-white/15 bg-white/5 text-gray-200 opacity-50"
      >
        Follow
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ` +
        (following
          ? 'border border-white/20 bg-white/10 text-gray-100 hover:bg-white/15'
          : 'bg-teal-700 hover:bg-teal-800 text-white') +
        (isPending ? ' opacity-70 cursor-not-allowed' : '')
      }
    >
      {isPending ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{following ? 'Unfollowing...' : 'Following...'}</span>
        </>
      ) : (
        <>
          {following ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{following ? 'Following' : 'Follow'}</span>
        </>
      )}
    </button>
  )
}
