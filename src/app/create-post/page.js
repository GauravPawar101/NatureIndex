import { createClient, hasSupabaseConfig } from '../lib/supabase/server';
import { redirect } from 'next/navigation';
import CreatePostForm from './CreatePostForm';
import PageHero from '../components/PageHero';

export default async function CreatePostPage() {
  if (!hasSupabaseConfig()) {
    redirect('/login');
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect('/login');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="page-shell">
      <div className="container mx-auto max-w-2xl px-6">
        <PageHero
          eyebrow="Contribute"
          title="Create a New Post"
          description="Share your research, field notes, or conservation story with the community."
        />
        <div className="glass-card p-6 md:p-8">
          <CreatePostForm userId={user.id} />
        </div>
      </div>
    </div>
  );
}
