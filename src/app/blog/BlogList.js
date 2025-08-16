'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function BlogList({ posts }) {
  const [activeTopic, setActiveTopic] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const topics = useMemo(() => ['All', ...Array.from(new Set(posts.map(p => p.topic).filter(Boolean)))], [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    return posts
      .filter(post => post && post.slug)
      .filter(post => {
        const topicMatch = activeTopic === 'All' || post.topic === activeTopic;
        const searchMatch = searchTerm === '' || post.title.toLowerCase().includes(searchTerm.toLowerCase());
        return topicMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'popular') return b.views - a.views;
        return new Date(b.date) - new Date(a.date);
      });
  }, [posts, activeTopic, sortBy, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto">
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
      
      {/* Blog Post List */}
      <div className="space-y-6">
        {filteredAndSortedPosts.length > 0 ? (
          filteredAndSortedPosts.map(post => (
            <article key={post.slug} className="bg-zinc-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-orange-500/20 hover:border-orange-500/40 transition-all duration-300 transform hover:-translate-y-1 group">
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-orange-400 transition-colors cursor-pointer">{post.title}</h2>
                </Link>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                <div className="text-xs font-medium text-gray-500">
                  <span>By </span>
                  <Link href={`/profile/${post.profiles?.username}`} className="hover:underline text-orange-400 font-semibold hover:text-red-400 transition-colors">
                    {post.profiles?.username || 'Unknown Author'}
                  </Link>
                  <span className="text-gray-500"> • {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </article>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="inline-block bg-zinc-800/70 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50">
              <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-200">No Articles Found</h3>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
