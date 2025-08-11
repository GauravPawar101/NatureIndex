'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function CreatePostForm({ userId }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!title || !content) {
      setError('Title and Content are required.');
      setIsLoading(false);
      return;
    }
    
    // Create a URL-friendly slug from the title
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({ 
        title, 
        content,
        slug,
        user_id: userId,
        // You can add other fields like excerpt, date, author name here
        excerpt: content.substring(0, 150) + '...',
        author: 'A registered user', // You might want to fetch a username from a 'profiles' table
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      setError('Failed to create post. Please try again. ' + insertError.message);
      setIsLoading(false);
    } else {
      // Redirect to the new post page
      router.push(`/blog/${data.slug}`);
      router.refresh(); // Tell Next.js to refresh server components
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full bg-black border border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-white focus:border-white"
          required
        />
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-300">Content</label>
        <textarea
          id="content"
          rows="10"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 block w-full bg-black border border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-white focus:border-white"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50"
        >
          {isLoading ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>
    </form>
  );
}