'use client';

import { useState, useMemo, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import "easymde/dist/easymde.min.css";

const SimpleMdeEditor = dynamic(() => import("react-simplemde-editor"), { ssr: false });

const POST_TOPICS = [
  'Climate Change',
  'Wildlife Conservation',
  'Renewable Energy',
  'Pollution',
  'Sustainable Living',
  'Deforestation',
  'Ocean Conservation',
  'Water Resources',
];

export default function CreatePostForm({ userId }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleImageUpload = useCallback(async (file, onSuccess, onError) => {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from('post-images') // Make sure this uses a hyphen
      .upload(fileName, file);

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      onError(`Image Upload Failed: ${uploadError.message}`);
      setError(`Image Upload Failed: ${uploadError.message}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);
    
    onSuccess(publicUrl);
  }, [supabase.storage]);

  const handleCoverImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `${Date.now()}_${file.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (uploadError) {
      setError(`Cover image upload failed: ${uploadError.message}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(data.path);

    setImageUrl(publicUrl);
  };

  const editorOptions = useMemo(() => ({
    spellChecker: false,
    uploadImage: true,
    imageUploadFunction: handleImageUpload,
    toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"],
  }), [handleImageUpload]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase is not configured. Check your environment variables.');
      return;
    }
    setError(null);
    setIsLoading(true);

    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const { data: postData, error: insertError } = await supabase
      .from('posts')
      .insert({ 
        title, 
        content,
        slug,
        user_id: userId,
        date: new Date().toISOString(),
        topic: topic || null,
        image_url: imageUrl.trim() || null,
      })
      .select()
      .single();

    setIsLoading(false);

    if (insertError) {
      setError('Failed to create post. ' + insertError.message);
    } else {
      router.push(`/blog/${postData.slug}`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">Title</label>
        <input
          type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800" required
        />
      </div>
      
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-800 mb-1">Topic</label>
        <select
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          required
        >
          <option value="">Select a topic</option>
          {POST_TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-800 mb-1">Cover image URL</label>
        <input
          type="url"
          id="image_url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
        />
        <p className="mt-1 text-xs text-gray-500">Or upload an image:</p>
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverImageUpload}
          className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Content</label>
        <div className="prose prose-lg max-w-none">
          <SimpleMdeEditor
            value={content}
            onChange={setContent}
            options={editorOptions}
          />
        </div>
      </div>
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      <div>
        <button type="submit" disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
        >
          {isLoading ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>
    </form>
  );
}
