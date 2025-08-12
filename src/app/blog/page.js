import { getBlogPosts } from '../lib/blog';
import BlogList from './BlogList';
import { BookOpen } from 'lucide-react';

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-zinc-900">
      <div className="absolute inset-0 mb-300 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-orange-500 rounded-full opacity-15 blur-xl"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-red-600 rounded-full opacity-10 blur-xl"></div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-orange-600 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-1/2 right-1/3 w-36 h-36 bg-red-500 rounded-full opacity-8 blur-xl"></div>
      </div>

      <main className="relative container mx-auto px-4 py-16 md:py-24">
        <header className="text-center mb-16 md:mb-50">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-full p-6 mb-6 shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 border-2 border-orange-400">
            <BookOpen className="w-12 h-12" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-400 to-red-500 tracking-tight mb-4 transition-transform duration-300">
            The Field Journal
          </h1>
          <div className="w-32 h-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 mx-auto mb-8 rounded-full shadow-lg"></div>
          
          <p className="mt-6 max-w-3xl mx-auto text-2xl md:text-3xl text-gray-200 leading-relaxed font-medium">
            An open journal for conservation science, field discoveries, and community action.
          </p>
          
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed font-light">
            Documenting nature stories, sharing scientific insights, and inspiring environmental stewardship through field research and community engagement.
          </p>
        </header>
        
        <div className="relative">
          <div className="bg-gradient-to-br from-zinc-800/90 to-black/90 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-orange-500/30 p-8 md:p-12 hover:border-red-500/50 transition-all duration-500">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <BlogList posts={posts} />
            </div>
          </div>
        </div>
        
      </main>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 via-gray-900/50 to-transparent pointer-events-none"></div>
    </div>
  );
}