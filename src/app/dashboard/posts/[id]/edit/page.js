import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import PostEditForm from './PostEditForm';
import VersionHistoryPanel from './VersionHistoryPanel';
import { createSupabaseClerkServerClient } from '../../../../lib/supabaseClerkServer';

export default async function EditPostPage({ params }) {
  const { userId, supabase } = await createSupabaseClerkServerClient();

  if (!userId || !supabase) {
    redirect('/login');
  }

  async function restorePostVersionAction(formData) {
    'use server';

    const { userId: uid, supabase: sb } = await createSupabaseClerkServerClient();
    if (!uid || !sb) redirect('/login');

    const versionIdRaw = formData.get('versionId');
    const versionId = Number(versionIdRaw);
    if (!Number.isFinite(versionId)) {
      redirect(`/dashboard/posts/${params.id}/edit?error=Invalid%20version`);
    }

    const { data: version, error: versionError } = await sb
      .from('post_versions')
      .select('id,post_id,title,content,updated_at')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      redirect(`/dashboard/posts/${params.id}/edit?error=${encodeURIComponent(versionError?.message || 'Version not found')}`);
    }

    // Update the post (will itself create a new version snapshot via trigger)
    const { error: updateError } = await sb
      .from('posts')
      .update({
        title: version.title,
        content: version.content,
      })
      .eq('id', version.post_id)
      .eq('author_id', uid);

    if (updateError) {
      redirect(`/dashboard/posts/${params.id}/edit?error=${encodeURIComponent(updateError.message || 'Restore failed')}`);
    }

    revalidatePath(`/dashboard/posts/${params.id}/edit`);
    redirect(`/dashboard/posts/${params.id}/edit?success=Restored`);
  }

  const { data: post } = await supabase
    .from('posts')
    .select('id,title,content,status,image_url, post_tags(tags(name))')
    .eq('id', params.id)
    .eq('author_id', userId)
    .single();

  if (!post) {
    notFound();
  }

  const tags = (post.post_tags || []).map((pt) => pt.tags?.name).filter(Boolean);

  const { data: versions } = await supabase
    .from('post_versions')
    .select('id,title,content,updated_at,updated_by')
    .eq('post_id', post.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Edit Post</h1>
          <p className="text-gray-400">Update your draft or publish when ready.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
            <PostEditForm post={{ ...post, tags }} />
          </div>

          <VersionHistoryPanel versions={versions || []} restoreAction={restorePostVersionAction} />
        </div>
      </div>
    </div>
  );
}
