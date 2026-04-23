'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '../../../../create-post/RichTextEditor';
import TagInput from '../../../../components/TagInput';
import { updatePostAction } from './actions';

export default function PostEditForm({ post }) {
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [tags, setTags] = useState(post.tags || []);
  const [imageUrl, setImageUrl] = useState(post.image_url || '');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const intent = e?.nativeEvent?.submitter?.value === 'published' ? 'published' : 'draft';

    const payload = await updatePostAction(post.id, { title, content, tags, image_url: imageUrl }, intent);
    setIsLoading(false);

    if (!payload?.ok) {
      setError(payload?.formError ? `Failed to save. ${payload.formError}` : 'Failed to save.');
      return;
    }

    const updated = payload?.post;
    if (intent === 'published' && updated?.slug) {
      router.push(`/blog/${updated.slug}`);
    } else {
      router.push('/dashboard');
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          required
        />
      </div>

      <div>
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-800 mb-1">Cover image URL</label>
        <input
          type="url"
          id="image_url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          disabled={isLoading}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Content</label>
        <RichTextEditor value={content} onChange={setContent} disabled={isLoading} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Tags</label>
        <TagInput value={tags} onChange={setTags} disabled={isLoading} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div>
        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-md font-medium text-gray-900 bg-stone-200 hover:bg-stone-300 disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="submit"
            name="intent"
            value="published"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
          >
            {isLoading ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </form>
  );
}
