'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// This is the individual comment component
export default function Comment({ comment, postId, session }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !session) return;

    const { error } = await supabase.from('comments').insert({
      content: replyContent,
      post_id: postId,
      user_id: session.user.id,
      parent_id: comment.id, // This is the key to nesting!
    });

    if (error) {
      console.error('Error posting reply:', error);
    } else {
      setReplyContent('');
      setIsReplying(false);
      router.refresh(); // Refresh the page to show the new comment
    }
  };

  return (
    <div className="py-4">
      {/* The comment itself */}
      <div className="flex flex-col">
        <p className="text-gray-300">{comment.content}</p>
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
          <span>By {comment.username || 'Anonymous'} on {new Date(comment.created_at).toLocaleDateString()}</span>
          {session && (
            <button onClick={() => setIsReplying(!isReplying)} className="font-semibold hover:text-white">
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Reply form, shown on demand */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} className="mt-4 ml-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Replying to ${comment.username || 'Anonymous'}...`}
            className="w-full bg-gray-900 border border-white/20 rounded-md p-2 text-white text-sm"
            rows="2"
          />
          <div className="flex gap-2 mt-2">
            <button type="submit" className="px-3 py-1 bg-white text-black text-sm font-semibold rounded-md">
              Submit
            </button>
            <button type="button" onClick={() => setIsReplying(false)} className="px-3 py-1 bg-gray-600 text-white text-sm font-semibold rounded-md">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Recursive rendering of child comments */}
      {comment.children && comment.children.length > 0 && (
        <div className="pl-6 border-l-2 border-gray-800">
          {comment.children.map((child) => (
            <Comment key={child.id} comment={child} postId={postId} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}