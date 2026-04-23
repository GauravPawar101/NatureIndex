// Example: src/app/account/ProfileForm.tsx
// Client component for profile editing with optimistic updates

'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/actions/profile'
import type { Profile } from '@/lib/types'

interface ProfileFormProps {
  profile: Profile
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateProfile({
        username: formData.get('username') as string,
        full_name: formData.get('full_name') as string || null,
        bio: formData.get('bio') as string || null,
        website: formData.get('website') as string || null,
        twitter: formData.get('twitter') as string || null,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
          Profile updated successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          defaultValue={profile.username}
          required
          pattern="^[a-z0-9_-]+$"
          minLength={3}
          maxLength={30}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="text-gray-500 text-sm mt-1">
          Lowercase letters, numbers, hyphens, and underscores only
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name || ''}
          maxLength={100}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio || ''}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
        />
        <p className="text-gray-500 text-sm mt-1">
          Brief description for your profile
        </p>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
          Website
        </label>
        <input
          type="url"
          id="website"
          name="website"
          defaultValue={profile.website || ''}
          placeholder="https://example.com"
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Twitter */}
      <div>
        <label htmlFor="twitter" className="block text-sm font-medium text-gray-300 mb-2">
          Twitter Handle
        </label>
        <div className="flex items-center">
          <span className="px-4 py-2 bg-gray-800 border border-r-0 border-gray-700 rounded-l-lg text-gray-400">
            @
          </span>
          <input
            type="text"
            id="twitter"
            name="twitter"
            defaultValue={profile.twitter || ''}
            maxLength={50}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-r-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Avatar URL (Read-only, managed by Clerk) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Avatar
        </label>
        <div className="flex items-center gap-4">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-16 h-16 rounded-full"
            />
          )}
          <p className="text-gray-400 text-sm">
            Avatar is managed through your Clerk account
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
