'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Comment from './Comment'; // Import the new component

export default function CommentSection({ postId, initialComments, session }) {
  const [newComment, setNewComment] = useState('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  // This form now only handles TOP-LEVEL comments
  const handleTopLevelCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !session) return;

    await supabase.from('comments').insert({
      content: newComment,
      post_id: postId,
      user_id: session.user.id,
      // parent_id is NULL here for top-level comments
    });

    setNewComment('');
    router.refresh(); // Refresh to see the new comment
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Discussion</h2>
      {session ? (
        <form onSubmit={handleTopLevelCommentSubmit} className="mb-8">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-gray-900 border border-white/20 rounded-md p-3 text-white"
            rows="3"
          />
          <button type="submit" className="mt-2 px-4 py-2 bg-white text-black font-semibold rounded-md">
            Post Comment
          </button>
        </form>
      ) : (
        <p className="mb-8 text-gray-400">
          <Link href="/login" className="text-white font-semibold underline">Log in</Link> to join the discussion.
        </p>
      )}

      {/* Render the comment tree */}
      <div className="space-y-4">
        {initialComments.map((comment) => (
          <Comment key={comment.id} comment={comment} postId={postId} session={session} />
        ))}
        {initialComments.length === 0 && <p className="text-gray-500">No comments yet. Be the first!</p>}
      </div>
    </div>
  );
}