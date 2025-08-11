'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function BlogList({ posts }) {
  const [activeTopic, setActiveTopic] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const topics = ['All', ...Array.from(new Set(posts.map(p => p.topic)))];

  const filteredAndSortedPosts = useMemo(() => {
    return posts
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
    <>
      {/* Professional Filter and Sort Controls with sophisticated color scheme */}
      <div className="my-8 py-8 px-6 rounded-2xl bg-gradient-to-br from-stone-50 via-slate-50 to-neutral-100 border border-stone-200/60 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type="text"
              placeholder="Search conservation research..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all duration-200 placeholder:text-stone-400 text-stone-800 font-medium shadow-sm hover:shadow-md hover:border-stone-300"
            />
          </div>
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition-all duration-200 text-stone-800 font-medium shadow-sm hover:shadow-md hover:border-stone-300 cursor-pointer"
            >
              <option value="newest">Sort by Newest</option>
              <option value="oldest">Sort by Oldest</option>
              <option value="popular">Sort by Popular</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        {/* Topic Filters with professional styling */}
        <div className="flex items-center gap-3 overflow-x-auto pt-6 mt-6 border-t border-stone-200/70">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full shrink-0 transition-all duration-200 border-2 transform hover:scale-105 ${
                activeTopic === topic 
                  ? 'bg-gradient-to-r from-slate-800 to-stone-700 text-white border-slate-800 shadow-lg shadow-slate-300/50' 
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-gradient-to-r hover:from-slate-800 hover:to-stone-700 hover:text-white hover:border-slate-800 hover:shadow-lg hover:shadow-slate-300/50'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
      
      {/* Professional blog cards with refined color scheme */}
      <div className="space-y-6 overflow-y-auto p-2 pr-4 flex-grow max-h-[55vh]">
        {filteredAndSortedPosts.length > 0 ? (
          filteredAndSortedPosts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <div className="bg-gradient-to-br from-white to-stone-50/40 rounded-2xl p-7 border border-stone-200/60 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/30 transition-all duration-300 transform hover:-translate-y-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-amber-700 transition-colors duration-200 leading-tight">{post.title}</h2>
                  <p className="text-stone-600 mb-5 text-base leading-relaxed line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-stone-500 font-medium">
                      <span className="text-stone-800 font-semibold">{post.author}</span> • {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-stone-50 to-slate-100 rounded-2xl p-12 border border-stone-200/60 shadow-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-stone-200 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-stone-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">No Research Articles Found</h3>
              <p className="text-stone-600 text-lg">Adjust your search criteria to explore different conservation topics.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}