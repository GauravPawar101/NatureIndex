'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
        if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
        return new Date(b.date) - new Date(a.date);
      });
  }, [posts, activeTopic, sortBy, searchTerm]);

  return (
    <div>
      <div className="mb-8 p-6 glass-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-dark pl-11"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-dark appearance-none cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="popular">Sort: Popular</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-white/10">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              className={`px-4 py-1.5 text-sm rounded-full shrink-0 transition-all duration-200 border ${
                activeTopic === topic ? 'pill-active' : 'pill-inactive'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredAndSortedPosts.length > 0 ? (
          filteredAndSortedPosts.map(post => (
            <article key={post.slug} className="glass-card-hover p-0 overflow-hidden group">
              <div className="flex flex-col sm:flex-row">
                {post.image_url && (
                  <div className="relative w-full sm:w-48 h-40 sm:h-auto sm:min-h-[140px] shrink-0">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 192px"
                    />
                  </div>
                )}
                <div className="p-6 flex-1">
                  {post.topic && (
                    <span className="eyebrow text-[10px] mb-2">{post.topic}</span>
                  )}
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:underline underline-offset-4">{post.title}</h2>
                  </Link>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                  <div className="text-xs font-medium text-gray-500">
                    <span>By </span>
                    <Link href={`/profile/${post.profiles?.username}`} className="link-accent text-sm">
                      {post.profiles?.username || 'Unknown Author'}
                    </Link>
                    <span> • {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {post.views != null && <span> • {post.views.toLocaleString()} views</span>}
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="inline-block glass-card p-8">
              <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white">No Articles Found</h3>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
