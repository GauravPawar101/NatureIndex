import { getBlogPostBySlug } from '../../lib/blog';
import { notFound } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CommentSection from './CommentSection';

// This utility function converts the flat list from the DB into a nested tree
const buildCommentTree = (comments) => {
  const commentMap = {};
  const commentTree = [];

  for (const comment of comments) {
    commentMap[comment.id] = { ...comment, children: [] };
  }

  for (const comment of comments) {
    if (comment.parent_id) {
      if(commentMap[comment.parent_id]) {
        commentMap[comment.parent_id].children.push(commentMap[comment.id]);
      }
    } else {
      commentTree.push(commentMap[comment.id]);
    }
  }
  return commentTree;
};

export default async function BlogPostPage({ params }) {
  const supabase = createServerComponentClient({ cookies });
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Call our new RPC function to get all comments for this post
  const { data: comments, error } = await supabase
    .rpc('get_threaded_comments', { p_post_id: post.id });

  if(error) {
    console.error("Error fetching comments: ", error);
  }

  const commentTree = buildCommentTree(comments || []);

  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div className="bg-black pt-32 pb-20">
      <div className="container mx-auto max-w-3xl px-6">
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">{post.title}</h1>
        <p className="text-gray-400 mb-8">{post.author} • {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="prose prose-invert prose-lg max-w-none text-gray-300">
          <p>{post.content || post.excerpt}</p>
        </div>
        <hr className="border-white/10 my-12" />
        <CommentSection 
          postId={post.id}
          initialComments={commentTree}
          session={session}
        />
      </div>
    </div>
  );
}