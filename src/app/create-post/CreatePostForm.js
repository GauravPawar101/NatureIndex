'use client';

import { useState, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import "easymde/dist/easymde.min.css";

const SimpleMdeEditor = dynamic(() => import("react-simplemde-editor"), { ssr: false });

export default function CreatePostForm({ userId }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
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

  const editorOptions = useMemo(() => ({
    spellChecker: false,
    uploadImage: true,
    imageUploadFunction: handleImageUpload,
    toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"],
  }), [handleImageUpload]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
