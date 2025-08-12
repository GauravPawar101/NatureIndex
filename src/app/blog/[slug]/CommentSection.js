'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';

// --- Reusable Form for New Comments & Replies ---
function CommentForm({ postId, parentId = null, onComplete, onCancel }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !content.trim()) {
      setIsLoading(false);
      return;
    }

    let imageUrl = null;
    if (image) {
      const fileName = `${user.id}-${Date.now()}`;
      const { data, error } = await supabase.storage.from('comment-images').upload(fileName, image);
      if (error) {
        console.error('Image upload error:', error);
        setIsLoading(false);
        return;
      }
      imageUrl = supabase.storage.from('comment-images').getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId,
      image_url: imageUrl,
    });

    setIsLoading(false);
    if (!error && onComplete) {
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Write a reply..." : "Leave a comment..."}
        className="w-full p-3 border border-gray-600 bg-black/60 text-white placeholder-gray-400 rounded-lg text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
        rows="3"
      ></textarea>
      <div className="flex justify-between items-center mt-3">
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setImage(e.target.files[0])} 
          className="text-sm text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30 file:cursor-pointer" 
        />
        <div className="flex items-center gap-2">
          {parentId && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={isLoading || !content.trim()} 
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg"
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </form>
  );
}


// --- Recursive Component to Display a Comment and Its Replies ---
function Comment({ comment, replyingTo, onReplyClick, onDeleteClick, postId, onActionComplete }) {
  const [user, setUser] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [supabase.auth]);

  const isReplying = replyingTo === comment.id;

  return (
    <div className="flex items-start gap-4">
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-700">
        {comment.profiles?.avatar_url ? (
          <Image src={comment.profiles.avatar_url} alt="Avatar" fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg font-bold text-gray-300">?</div>
        )}
      </div>
      <div className="flex-grow">
        <Link href={`/profile/${comment.profiles?.username}`} className="font-semibold text-orange-400 hover:text-red-400 hover:underline transition-colors">
          {comment.profiles?.username || 'Anonymous'}
        </Link>
        <p className="text-gray-200 mt-1 leading-relaxed">{comment.content}</p>
        {comment.image_url && (
          <a href={comment.image_url} target="_blank" rel="noopener noreferrer">
            <div className="mt-3 relative w-full max-w-xs h-48 rounded-lg overflow-hidden border border-gray-600 hover:border-orange-500/50 transition-colors">
              <Image src={comment.image_url} alt="Comment image" fill className="object-cover" />
            </div>
          </a>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <button 
            onClick={() => onReplyClick(comment.id)} 
            className="font-semibold text-gray-400 hover:text-orange-400 transition-colors"
          >
            {isReplying ? 'Cancel Reply' : 'Reply'}
          </button>
          {user && user.id === comment.user_id && (
            <button 
              onClick={() => onDeleteClick(comment.id)} 
              className="font-semibold text-gray-400 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
        {isReplying && (
          <CommentForm 
            postId={postId} 
            parentId={comment.id} 
            onComplete={onActionComplete} 
            onCancel={() => onReplyClick(null)} 
          />
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div className="pl-6 mt-4 pt-4 space-y-4 border-l-2 border-orange-500/30">
            {comment.replies.map(reply => (
              <Comment 
                key={reply.id} 
                comment={reply} 
                replyingTo={replyingTo}
                onReplyClick={onReplyClick}
                onDeleteClick={onDeleteClick}
                postId={postId}
                onActionComplete={onActionComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// --- Main Component That Manages Everything ---
export default function CommentsSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const supabase = createClientComponentClient();

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  }, [supabase, postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (!error) fetchComments();
  };

  const handleActionComplete = () => {
    setReplyingTo(null);
    fetchComments();
  };
  
  const nestedComments = useMemo(() => {
    const commentMap = {};
    comments.forEach(comment => commentMap[comment.id] = { ...comment, replies: [] });
    
    const result = [];
    comments.forEach(comment => {
      if (comment.parent_id) {
        commentMap[comment.parent_id]?.replies.push(commentMap[comment.id]);
      } else {
        result.push(commentMap[comment.id]);
      }
    });
    return result;
  }, [comments]);

  return (
    <div className="mt-16 pt-8 border-t border-gray-700">
      <h2 className="text-3xl font-bold text-white mb-2">
        Discussion 
        <span className="text-orange-400 ml-2">({comments.length})</span>
      </h2>
      
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
        <h3 className="font-semibold text-gray-200 mb-2">Leave a Comment</h3>
        <CommentForm postId={postId} onComplete={handleActionComplete} />
      </div>
      
      <div className="space-y-8 mt-8">
        {nestedComments.map(comment => (
          <div key={comment.id} className="bg-zinc-800/30 rounded-xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-orange-500/20 transition-colors">
            <Comment 
              comment={comment}
              replyingTo={replyingTo}
              onReplyClick={setReplyingTo}
              onDeleteClick={handleDelete}
              postId={postId}
              onActionComplete={handleActionComplete}
            />
          </div>
        ))}
      </div>
    </div>
  );
}