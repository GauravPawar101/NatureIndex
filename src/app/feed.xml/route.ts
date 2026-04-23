import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient<Database>(url, anonKey);
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRssPubDate(dateLike: unknown) {
  if (!dateLike) return null;
  const date = new Date(String(dateLike));
  if (Number.isNaN(date.getTime())) return null;
  return date.toUTCString();
}

export async function GET() {
  const siteUrl = getSiteUrl();

  let posts:
    | Array<{
        slug: string;
        title: string | null;
        excerpt: string | null;
        date: string | null;
        created_at?: string | null;
        profiles?: { username?: string | null } | null;
      }>
    | null = null;

  try {
    const supabase = getSupabaseClient();

    // Prefer `date` as publish time (used throughout the blog pages).
    const { data, error } = await supabase
      .from('posts')
      .select('slug,title,excerpt,date,created_at,profiles:profiles!posts_author_id_fkey(username)')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .order('date', { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) {
      console.error('feed.xml: error fetching posts', error);
      posts = [];
    } else {
      posts = (data || []) as typeof posts;
    }
  } catch (err) {
    console.error('feed.xml: failed to create Supabase client or fetch posts', err);
    posts = [];
  }

  const channelTitle = 'Nature Index.';
  const channelLink = `${siteUrl}/blog`;
  const channelDescription = 'Latest posts from Nature Index.';

  const itemsXml = (posts || [])
    .filter((p) => typeof p.slug === 'string' && p.slug.length > 0)
    .map((p) => {
      const title = escapeXml(p.title || 'Untitled');
      const link = `${siteUrl}/blog/${encodeURIComponent(p.slug)}`;
      const description = escapeXml(p.excerpt || '');
      const pubDate = toRssPubDate(p.date || p.created_at);
      const author = escapeXml(p.profiles?.username || 'Unknown Author');

      return [
        '<item>',
        `  <title>${title}</title>`,
        `  <link>${escapeXml(link)}</link>`,
        `  <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `  <description>${description}</description>`,
        pubDate ? `  <pubDate>${escapeXml(pubDate)}</pubDate>` : null,
        `  <author>${author}</author>`,
        '</item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `  <title>${escapeXml(channelTitle)}</title>`,
    `  <link>${escapeXml(channelLink)}</link>`,
    `  <description>${escapeXml(channelDescription)}</description>`,
    itemsXml,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
