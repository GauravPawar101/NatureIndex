import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getPostOgData(slug: string) {
  const supabase = getSupabaseClient();
  if (!supabase || !slug) return null;

  const { data, error } = await supabase
    .from('posts')
    .select('title, profiles:profiles!posts_author_id_fkey(username)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    // Avoid throwing inside OG image generation.
    console.error('OG image post fetch failed:', error);
    return null;
  }

  return data;
}

export default async function OpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostOgData(params.slug);

  const title = post?.title || 'Nature Index';
  const author = post?.profiles?.[0]?.username || 'Unknown Author';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #050508 0%, #0b0b10 45%, #111827 100%)',
          padding: 64,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: 36,
            border: '1px solid rgba(255,255,255,0.12)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            padding: 56,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, rgba(249,115,22,1) 0%, rgba(239,68,68,1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: -0.5,
              }}
            >
              NI
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              Nature Index
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                color: 'rgba(255,255,255,0.98)',
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: -1.2,
                lineHeight: 1.05,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: 'rgba(249,115,22,1)',
                }}
              />
              <div
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                By {author}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              /blog/{params.slug}
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              natureindex
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}
