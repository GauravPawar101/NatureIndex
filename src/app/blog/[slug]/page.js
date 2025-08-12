import { getBlogPostBySlug } from '../../lib/blog';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import CommentsSection from './CommentSection';

export default async function BlogPostPage({ params }) {
  const post = await getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-zinc-900 min-h-screen pt-24 pb-20">
      <div className="container mx-auto max-w-3xl px-6">
        
        {post.image_url && (
          <div className="relative w-full h-80 mb-8 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 hover:border-orange-500/30 transition-colors">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        )}

        <h1 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-red-500 mb-6 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex items-center gap-2 mb-8 text-gray-400">
          <span>By</span>
          <Link 
            href={`/profile/${post.profiles?.username || 'user'}`} 
            className="font-semibold text-orange-400 hover:text-red-400 hover:underline transition-colors"
          >
            {post.profiles?.username || 'Unknown Author'}
          </Link>
          <span className="text-gray-600">•</span>
          <span className="text-gray-500">
            {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30 shadow-xl">
          <div className="prose prose-lg max-w-none prose-headings:text-gray-100 prose-p:text-gray-300 prose-a:text-orange-400 prose-a:no-underline hover:prose-a:text-red-400 prose-strong:text-gray-100 prose-code:text-yellow-400 prose-code:bg-black/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/70 prose-pre:border prose-pre:border-gray-600 prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-500/10 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:rounded-r prose-li:text-gray-300 prose-ul:marker:text-orange-400 prose-ol:marker:text-orange-400">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
          <CommentsSection postId={post.id}/>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-6">
            Comments
            <span className="text-orange-400 ml-2">({post.comments?.length || 0})</span>
          </h2>
          <div className="space-y-6">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map(comment => (
                <div key={comment.id} className="bg-zinc-800/30 rounded-xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-orange-500/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-gray-700">
                      {comment.profiles?.avatar_url ? (
                        <Image src={comment.profiles.avatar_url} alt={comment.profiles?.username || 'Avatar'} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-lg font-bold text-gray-300">?</div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-orange-400 hover:text-red-400 transition-colors cursor-pointer mb-1">
                        {comment.profiles?.username || 'Anonymous User'}
                      </p>
                      <p className="text-gray-200 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-zinc-800/50 rounded-2xl p-8 border border-gray-700/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg">Be the first to leave a comment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}