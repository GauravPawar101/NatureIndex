import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

export const revalidate = 3600;

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // Fallback for local dev / misconfigured env.
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

async function fetchPublishedPostSlugsWithLastModified() {
  const supabase = getSupabaseClient();

  // We want lastModified from updated_at, but some schemas use different column names.
  // Try `updated_at` first (per requirement), then fall back gracefully.
  const attempts: Array<{ select: string; lastModifiedKey: 'updated_at' | 'created_at' | 'date' }> = [
    { select: 'slug,updated_at', lastModifiedKey: 'updated_at' },
    { select: 'slug,created_at', lastModifiedKey: 'created_at' },
    { select: 'slug,date', lastModifiedKey: 'date' },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    const pageSize = 1000;
    let from = 0;
    const results: Array<{ slug: string; lastModified?: string }> = [];

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('posts')
        .select(attempt.select)
        .eq('status', 'published')
        .not('slug', 'is', null)
        .order('slug', { ascending: true })
        .range(from, to);

      if (error) {
        lastError = error;
        break;
      }

      const rows = (data || []) as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        return results;
      }

      for (const row of rows) {
        const slug = typeof row.slug === 'string' ? row.slug : null;
        if (!slug) continue;

        const raw = row[attempt.lastModifiedKey];
        const lastModified = raw ? new Date(String(raw)).toISOString() : undefined;
        results.push({ slug, lastModified });
      }

      if (rows.length < pageSize) {
        return results;
      }

      from += pageSize;
    }
  }

  // If all attempts fail, surface the last error so it's visible in logs.
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch published posts for sitemap');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: new URL('/', siteUrl).toString(),
    },
    {
      url: new URL('/blog', siteUrl).toString(),
    },
  ];

  let posts: Array<{ slug: string; lastModified?: string }> = [];
  try {
    posts = await fetchPublishedPostSlugsWithLastModified();
  } catch (err) {
    // Don't fail the whole sitemap route if Supabase is temporarily unavailable.
    console.error('sitemap: failed to fetch published posts from Supabase', err);
  }

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: new URL(`/blog/${p.slug}`, siteUrl).toString(),
    ...(p.lastModified ? { lastModified: p.lastModified } : {}),
  }));

  return [...staticEntries, ...postEntries];
}
