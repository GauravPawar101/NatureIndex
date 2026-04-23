import { NextResponse } from 'next/server';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';

export async function GET(req: Request) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const followingId = url.searchParams.get('followingId');

  if (!followingId) {
    return NextResponse.json({ error: 'Missing followingId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ following: Boolean(data) });
}

export async function POST(req: Request) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const followingId = body?.followingId;

  if (!followingId || typeof followingId !== 'string') {
    return NextResponse.json({ error: 'Missing followingId' }, { status: 400 });
  }

  if (followingId === userId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: userId,
    following_id: followingId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const followingId = url.searchParams.get('followingId');

  if (!followingId) {
    return NextResponse.json({ error: 'Missing followingId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', followingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
