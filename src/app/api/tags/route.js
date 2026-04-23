import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').trim().toLowerCase();

  let q = supabase.from('tags').select('id,name,slug').order('name', { ascending: true }).limit(25);
  if (query) {
    q = q.ilike('name', `%${query}%`);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tags: data || [] });
}
