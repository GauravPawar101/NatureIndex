'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Comment({ comment, onReply, onDelete }) {
  const [user, setUser] = useState(null);
  const supabase = createClientComponentClient();
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [supabase.auth]);

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDelete(comment.id);
    }
  };

  return (
    <div className="bg-zinc-800/30 rounded-xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-orange-500/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-700">
          {comment.profiles?.avatar_url ? (
            <Image src={comment.profiles.avatar_url} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg font-bold text-gray-300">?</div>
          )}
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-orange-400 hover:text-red-400 transition-colors cursor-pointer">
            {comment.profiles?.username || 'Anonymous'}
          </p>
          <p className="text-gray-200 mt-1 leading-relaxed">{comment.content}</p>
          {comment.image_url && (
            <div className="mt-3 relative w-full max-w-xs h-48 rounded-lg overflow-hidden border border-gray-600 hover:border-orange-500/50 transition-colors">
              <Image src={comment.image_url} alt="Comment image" fill className="object-cover" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <button 
              onClick={() => onReply(comment.id)} 
              className="font-semibold text-gray-400 hover:text-orange-400 transition-colors"
            >
              Reply
            </button>
            {user && user.id === comment.user_id && (
              <button 
                onClick={handleDelete} 
                className="font-semibold text-gray-400 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}