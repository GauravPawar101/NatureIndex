import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CreatePostForm from './CreatePostForm'; 

export default async function CreatePostPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-2xl px-6">
        <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Create a New Post</h1>
            <p className="text-lg text-gray-400">Share your story, knowledge, or latest adventure.</p>
        </div>
        <CreatePostForm userId={session.user.id} />
      </div>
    </div>
  );
}