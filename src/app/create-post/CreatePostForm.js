'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import RichTextEditor from './RichTextEditor';
import TagInput from '../components/TagInput';
import { PostSchema } from '../lib/postSchema';
import { createPost } from '@/actions/posts';

export default function CreatePostForm() {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
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

    const intent = e?.nativeEvent?.submitter?.value === 'published' ? 'published' : 'draft';

    startTransition(async () => {
      const result = await createPost({
        title: values.title,
        slug: values.slug,
        content: values.content,
        summary: null,
        cover_image: values.image_url || null,
        cover_blur: null,
        status: intent,
        tags: values.tags || [],
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (intent === 'published' && result.data?.slug) {
        router.push(`/blog/${result.data.slug}`);
      } else {
        router.push('/dashboard');
      }
    });
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
          disabled={isPending}
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
          disabled={isPending}
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
          disabled={isPending}
        />
        {errors.image_url?.message && <p className="text-red-500 text-sm mt-1">{errors.image_url.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">Content</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} disabled={isPending} />
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
            <TagInput value={field.value} onChange={field.onChange} disabled={isPending} />
          )}
        />
        {errors.tags?.message && <p className="text-red-500 text-sm mt-1">{errors.tags.message}</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={isPending}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md font-medium text-gray-900 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving…
              </>
            ) : (
              'Save Draft'
            )}
          </button>
          <button
            type="submit"
            name="intent"
            value="published"
            disabled={isPending}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing…
              </>
            ) : (
              'Publish'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

