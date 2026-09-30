import { createClient, hasSupabaseConfig } from '../lib/supabase/server';
import { redirect } from 'next/navigation';
import CreatePostForm from './CreatePostForm';
import PageHero from '../components/PageHero';

export const metadata = {
    title: 'Create a New Post',
};

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
            <div className="container-page">
                <PageHero
                    eyebrow="Contribute"
                    title="New story"
                    description="Share your research, field notes, or conservation story with the community."
                />
                <div className="measure">
                    <CreatePostForm userId={user.id} />
                </div>
            </div>
        </div>
    );
}
