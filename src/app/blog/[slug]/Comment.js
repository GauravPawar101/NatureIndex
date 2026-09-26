'use client';

// NOTE: This component doesn't appear to be imported anywhere — CommentSection.js
// defines its own inline `CommentItem` and never references Comment.js. Confirm
// nothing outside this upload uses it, then either wire it in or delete it.
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '../../lib/supabase/client';

export default function Comment({ comment, onReply, onDelete }) {
    const [user, setUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this comment?")) {
            try {
                setIsDeleting(true);
                await onDelete(comment.id);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const username = comment.profiles?.username || 'Anonymous';
    const initial = username.charAt(0).toUpperCase();

    const formattedDate = comment.created_at && !isNaN(new Date(comment.created_at).getTime())
        ? new Date(comment.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : null;

    return (
        <div className={`bg-zinc-800/30 rounded-xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-orange-500/20 transition-colors ${isDeleting ? 'opacity-50 pointer-events-none' : ''
            }`}>
            <div className="flex items-start gap-4">
                {/* Avatar Container */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-700">
                    {comment.profiles?.avatar_url ? (
                        <Image
                            src={comment.profiles.avatar_url}
                            alt={`${username}'s avatar`}
                            fill
                            className="object-cover"
                            sizes="40px"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold text-gray-300">
                            {initial}
                        </div>
                    )}
                </div>

                {/* Comment Content */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-orange-400 hover:text-red-400 transition-colors cursor-pointer truncate">
                            {username}
                        </span>
                        {formattedDate && (
                            <span className="text-xs text-gray-500">• {formattedDate}</span>
                        )}
                    </div>

                    <p className="text-gray-200 mt-1 leading-relaxed break-words">
                        {comment.content}
                    </p>

                    {/* Comment Image */}
                    {comment.image_url && (
                        <div className="mt-3 relative w-full max-w-xs h-48 rounded-lg overflow-hidden border border-gray-600 hover:border-orange-500/50 transition-colors">
                            <Image
                                src={comment.image_url}
                                alt="Comment attachment"
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, 320px"
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                        <button
                            type="button"
                            onClick={() => onReply(comment.id)}
                            className="font-semibold text-gray-400 hover:text-orange-400 transition-colors"
                        >
                            Reply
                        </button>
                        {user && user.id === comment.user_id && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="font-semibold text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
