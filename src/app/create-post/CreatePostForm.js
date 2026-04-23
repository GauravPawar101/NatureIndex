'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import RichTextEditor from './RichTextEditor';
import TagInput from '../components/TagInput';
import { PostSchema } from '../lib/postSchema';
import { createPostAction } from './actions';

export default function CreatePostForm() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(PostSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      tags: [],
      image_url: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (values, e) => {
    setError(null);
    setIsLoading(true);

    const intent = e?.nativeEvent?.submitter?.value === 'published' ? 'published' : 'draft';

    const result = await createPostAction(values, intent);
    setIsLoading(false);

    if (!result?.ok) {
      const fieldErrors = result?.fieldErrors || {};
      for (const [field, message] of Object.entries(fieldErrors)) {
        setFieldError(field, { type: 'server', message: String(message) });
      }
      if (result?.formError) {
        setError(String(result.formError));
      }
      return;
    }

    const post = result?.post;
    if (intent === 'published' && post?.slug) {
      router.push(`/blog/${post.slug}`);
    } else {
      router.push('/dashboard');
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">Title</label>
        <input
          type="text"
          id="title"
          {...register('title')}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          disabled={isLoading}
        />
        {errors.title?.message && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-800 mb-1">Slug</label>
        <input
          type="text"
          id="slug"
          placeholder="e.g. my-first-post"
          {...register('slug')}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          disabled={isLoading}
        />
        {errors.slug?.message && <p className="text-red-500 text-sm mt-1">{errors.slug.message}</p>}
      </div>

      <div>
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-800 mb-1">Cover image URL</label>
        <input
          type="url"
          id="image_url"
          placeholder="https://..."
          {...register('image_url')}
          className="block w-full bg-stone-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-800"
          disabled={isLoading}
        />
        {errors.image_url?.message && <p className="text-red-500 text-sm mt-1">{errors.image_url.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} disabled={isLoading} />
          )}
        />
        {errors.content?.message && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Tags</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} disabled={isLoading} />
          )}
        />
        {errors.tags?.message && <p className="text-red-500 text-sm mt-1">{errors.tags.message}</p>}
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

