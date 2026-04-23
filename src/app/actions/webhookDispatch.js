'use server';

import crypto from 'crypto';
import { createSupabaseClerkServerClient } from '../lib/supabaseClerkServer';

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ');
}

function buildExcerpt({ excerpt, content }, maxLen = 180) {
  const base = (excerpt && String(excerpt).trim()) || stripHtml(content);
  const cleaned = base.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

function signHmacSha256Hex({ secret, timestamp, body }) {
  const msg = `${timestamp}.${body}`;
  return crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}

async function postJsonWithTimeout(url, { headers, body, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
      cache: 'no-store',
    });

    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e?.message || String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchPostPublishedWebhooks(postId) {
  const { userId, supabase } = await createSupabaseClerkServerClient();
  if (!userId || !supabase) {
    return { ok: false, error: 'Unauthorized' };
  }

  if (!postId || typeof postId !== 'string') {
    return { ok: false, error: 'Missing postId' };
  }

  // Fetch post payload (author can read their own posts via RLS)
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id,title,slug,excerpt,content,date,author_id,status')
    .eq('id', postId)
    .single();

  if (postError) {
    return { ok: false, error: postError.message || 'Failed to load post' };
  }

  if (!post || post.author_id !== userId) {
    return { ok: false, error: 'Not authorized for this post' };
  }

  if (post.status !== 'published') {
    // Only dispatch for published posts.
    return { ok: true, skipped: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username,full_name')
    .eq('user_id', userId)
    .maybeSingle();

  const payload = {
    title: post.title,
    slug: post.slug,
    excerpt: buildExcerpt({ excerpt: post.excerpt, content: post.content }),
    author: {
      user_id: userId,
      username: profile?.username || null,
      full_name: profile?.full_name || null,
    },
    published_at: post.date,
  };

  const { data: hooks, error: hooksError } = await supabase
    .from('webhooks')
    .select('url,secret')
    .eq('user_id', userId);

  if (hooksError) {
    return { ok: false, error: hooksError.message || 'Failed to load webhooks' };
  }

  const endpoints = (hooks || []).filter((h) => h?.url && h?.secret);
  if (endpoints.length === 0) {
    return { ok: true, dispatched: 0, results: [] };
  }

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const results = await Promise.allSettled(
    endpoints.map(async (h) => {
      const signature = signHmacSha256Hex({ secret: h.secret, timestamp, body });
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'NatureIndex-Webhooks/1.0',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': `sha256=${signature}`,
      };

      const resp = await postJsonWithTimeout(h.url, {
        headers,
        body,
        timeoutMs: 8000,
      });

      return { url: h.url, ...resp };
    })
  );

  const normalized = results.map((r) => {
    if (r.status === 'fulfilled') return r.value;
    return { ok: false, status: 0, url: 'unknown', error: r.reason?.message || String(r.reason) };
  });

  return {
    ok: true,
    dispatched: endpoints.length,
    succeeded: normalized.filter((r) => r.ok).length,
    results: normalized,
  };
}
