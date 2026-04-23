import { NextResponse } from 'next/server';
import { createSupabaseClerkServerClient } from '../../lib/supabaseClerkServer';

export async function GET(req: Request) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const postId = url.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ bookmarked: Boolean(data) });
}

export async function POST(req: Request) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const postId = body?.postId;

  if (!postId || typeof postId !== 'string') {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, post_id: postId });

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
  const postId = url.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
