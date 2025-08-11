import { getBlogPosts } from '../lib/blog';
import BlogList from './BlogList';

// This remains a Server Component for fast initial load
export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    // Professional conservation color scheme inspired by WWF and National Geographic
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-100 to-stone-100 p-6 flex items-center justify-center">
      {/* Main content panel with sophisticated earth tones */}
      <div className="w-full max-w-6xl bg-white backdrop-blur-sm rounded-3xl shadow-2xl shadow-slate-200/60 p-10 flex flex-col border border-slate-200/50">
        {/* Professional header with refined typography */}
        <div className="text-center mb-8 shrink-0">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-stone-800 rounded-2xl mb-6 shadow-lg shadow-slate-300/50">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-800 via-stone-700 to-amber-800 bg-clip-text text-transparent mb-4 leading-tight">
            ConserveNow
          </h1>
          <p className="text-xl text-stone-700 max-w-2xl mx-auto leading-relaxed font-medium">
            Evidence-based conservation research, field reports, and actionable insights for protecting our planet's biodiversity.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-stone-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Field Research</span>
            </div>
            <div className="w-1 h-4 bg-stone-300 rounded-full"></div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-stone-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Scientific Reports</span>
            </div>
            <div className="w-1 h-4 bg-stone-300 rounded-full"></div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Policy Insights</span>
            </div>
          </div>
        </div>
        
        {/* Render the interactive component */}
        <div className="flex-grow">
          <BlogList posts={posts} />
        </div>
        
        {/* Professional footer */}
        <div className="mt-8 pt-6 border-t border-stone-200/70 text-center">
          <p className="text-sm text-stone-600 font-medium">
            Advancing conservation science through rigorous research and collaborative action
          </p>
        </div>
      </div>
    </div>
  );
}