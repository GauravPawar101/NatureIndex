import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function GET(req) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const { data, error } = await supabase.rpc('search_posts', {
    p_query: q,
    p_limit: 8,
  });

  if (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const results = (data || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date,
  }));

  return NextResponse.json({ results }, { status: 200 });
}
