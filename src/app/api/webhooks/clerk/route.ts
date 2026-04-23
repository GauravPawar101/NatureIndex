import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

type ClerkWebhookEvent = {
  type: string;
  data: any;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toUsernameCandidate(raw: string) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pickUsername(data: any) {
  const direct = data?.username;
  if (direct) return toUsernameCandidate(direct);

  const email = data?.email_addresses?.[0]?.email_address;
  if (email && typeof email === 'string') {
    const local = email.split('@')[0];
    const candidate = toUsernameCandidate(local);
    if (candidate) return candidate;
  }

  // Last resort: stable-ish username from user id.
  const id = data?.id;
  return toUsernameCandidate(id) || `user-${String(id || '').slice(-6)}`;
}

function pickProfileFields(data: any) {
  const meta = data?.public_metadata || {};

  return {
    user_id: String(data?.id || ''),
    username: pickUsername(data),
    bio: typeof meta.bio === 'string' ? meta.bio : null,
    avatar_url: typeof data?.image_url === 'string' ? data.image_url : null,
    twitter: typeof meta.twitter === 'string' ? meta.twitter : null,
    website: typeof meta.website === 'string' ? meta.website : null,
    full_name:
      typeof data?.first_name === 'string' || typeof data?.last_name === 'string'
        ? `${data?.first_name || ''} ${data?.last_name || ''}`.trim() || null
        : null,
  };
}

async function upsertProfileWithUniqueUsername(supabase: ReturnType<typeof getSupabaseAdmin>, profile: any) {
  // Basic retry for username collisions.
  const baseUsername = profile.username;

  for (let attempt = 0; attempt < 3; attempt++) {
    const username = attempt === 0 ? baseUsername : `${baseUsername}-${String(profile.user_id).slice(-4)}${attempt}`;

    const { error } = await supabase
      .from('profiles')
      .upsert({ ...profile, username, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (!error) return;

    const msg = String((error as any)?.message || '').toLowerCase();
    if (msg.includes('profiles_username') || msg.includes('username') || msg.includes('duplicate')) {
      continue;
    }

    throw error;
  }

  throw new Error('Failed to upsert profile due to username conflicts');
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  const payload = await req.text();

  let evt: ClerkWebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const profile = pickProfileFields(evt.data);
      if (!profile.user_id || !profile.username) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      await upsertProfileWithUniqueUsername(supabase, profile);
      return NextResponse.json({ ok: true });
    }

    if (evt.type === 'user.deleted') {
      const userId = String(evt.data?.id || '');
      if (userId) {
        await supabase.from('profiles').delete().eq('user_id', userId);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (err: any) {
    console.error('clerk webhook handler failed', err);
    return NextResponse.json({ error: err?.message || 'Webhook handler failed' }, { status: 500 });
  }
}
