import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';

function safeUrl(input) {
  try {
    const u = new URL(String(input || '').trim());
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default async function WebhooksPage({ searchParams }) {
  const { userId, supabase } = await createSupabaseClerkServerClient();

  if (!userId || !supabase) {
    redirect('/login');
  }

  async function addWebhookAction(formData) {
    'use server';

    const { userId: uid, supabase: sb } = await createSupabaseClerkServerClient();
    if (!uid || !sb) redirect('/login');

    const url = safeUrl(formData.get('url'));
    const secret = String(formData.get('secret') || '').trim();

    if (!url) {
      redirect('/dashboard/webhooks?error=Invalid%20URL');
    }
    if (!secret) {
      redirect('/dashboard/webhooks?error=Secret%20is%20required');
    }

    const { error } = await sb.from('webhooks').upsert(
      {
        user_id: uid,
        url,
        secret,
      },
      { onConflict: 'user_id,url' }
    );

    if (error) {
      redirect(`/dashboard/webhooks?error=${encodeURIComponent(error.message || 'Failed to save webhook')}`);
    }

    revalidatePath('/dashboard/webhooks');
    redirect('/dashboard/webhooks?success=Saved');
  }

  async function deleteWebhookAction(formData) {
    'use server';

    const { userId: uid, supabase: sb } = await createSupabaseClerkServerClient();
    if (!uid || !sb) redirect('/login');

    const url = safeUrl(formData.get('url'));
    if (!url) {
      redirect('/dashboard/webhooks?error=Invalid%20URL');
    }

    const { error } = await sb.from('webhooks').delete().eq('user_id', uid).eq('url', url);

    if (error) {
      redirect(`/dashboard/webhooks?error=${encodeURIComponent(error.message || 'Failed to delete webhook')}`);
    }

    revalidatePath('/dashboard/webhooks');
    redirect('/dashboard/webhooks?success=Deleted');
  }

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('url,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const errorMessage = searchParams?.error ? String(searchParams.error) : null;
  const successMessage = searchParams?.success ? String(searchParams.success) : null;

  return (
    <div className="min-h-screen bg-gray-900 pt-32 pb-20">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 mt-2">Send signed POST requests when you publish posts.</p>
        </div>

        {errorMessage ? (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 bg-teal-500/10 border border-teal-500/30 text-teal-200 rounded-xl p-4">
            {successMessage}
          </div>
        ) : null}

        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Add endpoint</h2>

          <form action={addWebhookAction} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://example.com/webhooks/natureindex"
                className="block w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-gray-100"
              />
              <p className="text-gray-500 text-xs mt-2">We send JSON via POST on publish.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Signing secret</label>
              <input
                name="secret"
                type="password"
                required
                placeholder="Paste a random secret"
                className="block w-full bg-black/30 border border-gray-700 rounded-lg py-2 px-3 text-gray-100"
              />
              <p className="text-gray-500 text-xs mt-2">
                We sign requests with HMAC-SHA256. Your endpoint should verify{' '}
                <span className="text-gray-300">x-webhook-timestamp</span> and{' '}
                <span className="text-gray-300">x-webhook-signature</span>.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-white bg-teal-700 hover:bg-teal-800"
            >
              Save webhook
            </button>
          </form>
        </section>

        <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Your endpoints</h2>

          {!webhooks?.length ? (
            <p className="text-gray-400">No webhooks registered.</p>
          ) : (
            <ul className="space-y-3">
              {webhooks.map((h) => (
                <li key={h.url} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-100 font-semibold truncate">{h.url}</p>
                    <p className="text-gray-500 text-sm">
                      Added: {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                    </p>
                  </div>

                  <form action={deleteWebhookAction}>
                    <input type="hidden" name="url" value={h.url} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
