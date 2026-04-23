'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatReadingTimeFromHtml } from '../lib/readingTime';
import LikeButton from '../components/LikeButton';
import BookmarkButton from '../components/BookmarkButton';

export default function BlogList({ posts, reactionCounts = {} }) {
  const [activeTopic, setActiveTopic] = useState('All');
  const [activeTag, setActiveTag] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const topics = useMemo(() => ['All', ...Array.from(new Set(posts.map(p => p.topic).filter(Boolean)))], [posts]);

  const tags = useMemo(() => {
    const tagNames = (posts || [])
      .flatMap((p) => (p?.post_tags || []))
      .map((pt) => pt?.tags?.name)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(tagNames)).sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    return posts
      .filter(post => post && post.slug)
      .filter(post => {
        const topicMatch = activeTopic === 'All' || post.topic === activeTopic;
        const postTagNames = (post.post_tags || []).map((pt) => pt?.tags?.name).filter(Boolean);
        const tagMatch = activeTag === 'All' || postTagNames.includes(activeTag);
        const searchMatch = searchTerm === '' || post.title.toLowerCase().includes(searchTerm.toLowerCase());
        return topicMatch && tagMatch && searchMatch;
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.date);
        const bTime = new Date(b.created_at || b.date);
        if (sortBy === 'oldest') return aTime - bTime;
        if (sortBy === 'popular') return b.views - a.views;
        return bTime - aTime;
      });
  }, [posts, activeTopic, activeTag, sortBy, searchTerm]);

  const listVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Filter & Sort Controls Panel */}
      <div className="mb-8 p-6 bg-zinc-800/80 rounded-xl border border-orange-500/20 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-black/60 border border-gray-700 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-black/60 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="popular">Sort: Popular</option>
            </select>
             <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-gray-700">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full shrink-0 transition-all duration-200 border ${
                activeTopic === topic 
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-orange-500 shadow-lg' 
                  : 'bg-zinc-700/50 text-gray-300 border-gray-600 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-300'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Tag Filter Sidebar */}
        <aside className="bg-zinc-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg h-fit">
          <h3 className="text-lg font-bold text-gray-100 mb-4">Filter by tag</h3>
          <div className="space-y-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={
                  `w-full text-left px-3 py-2 rounded-lg text-sm font-semibold border transition ` +
                  (activeTag === tag
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-orange-500 shadow-lg'
                    : 'bg-zinc-700/50 text-gray-300 border-gray-600 hover:bg-orange-500/20 hover:border-orange-500/50 hover:text-orange-300')
                }
              >
                {tag}
              </button>
            ))}
          </div>
        </aside>

        {/* Blog Post List */}
        <motion.div
          className="space-y-6"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {filteredAndSortedPosts.length > 0 ? (
            filteredAndSortedPosts.map(post => {
              const postTagNames = (post.post_tags || []).map((pt) => pt?.tags?.name).filter(Boolean);
              const readingTimeLabel = formatReadingTimeFromHtml(post.content);
              const initialLikeCount = reactionCounts?.[post.id] ?? 0;
              return (
                <motion.article
                  key={post.slug}
                  variants={itemVariants}
                  className="bg-zinc-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-orange-400 transition-colors cursor-pointer">{post.title}</h2>
                  </Link>

                  {postTagNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {postTagNames.map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                  <div className="text-xs font-medium text-gray-500">
                    <span>By </span>
                    <Link href={`/authors/${post.profiles?.username}`} className="hover:underline text-orange-400 font-semibold hover:text-red-400 transition-colors">
                      {post.profiles?.username || 'Unknown Author'}
                    </Link>
                    <span className="text-gray-500"> • {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="text-gray-600"> • </span>
                    <span className="text-gray-400">{readingTimeLabel}</span>
                    <span className="text-gray-600"> • </span>
                    <LikeButton postId={post.id} initialCount={initialLikeCount} className="px-2 py-1" />
                    <span className="text-gray-600"> • </span>
                    <BookmarkButton postId={post.id} className="px-2 py-1" size={16} />
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div className="text-center py-16">
              <div className="inline-block bg-zinc-800/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-200">No Articles Found</h3>
                <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
