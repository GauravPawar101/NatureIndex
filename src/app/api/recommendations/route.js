import { NextResponse } from 'next/server';
import { createClient } from '../../lib/supabase/server';

const MAX_LIMIT = 24;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
    let body = {};

    // 1. Safe JSON Body Parsing
    try {
        body = await req.json();
    } catch {
        // Silently ignore malformed/empty JSON to support plain POST requests
    }

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get('limit'));

    // Validate limit parameter bounds
    const limit = Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(MAX_LIMIT, limitParam)
        : 6;

    const excludeSlug = searchParams.get('exclude') || undefined;
    const userId = typeof body.userId === 'string' ? body.userId.trim() : undefined;

    // 2. Validate User ID Format (Prevents Postgres invalid UUID syntax errors)
    if (userId && !UUID_REGEX.test(userId)) {
        return NextResponse.json(
            { error: 'Invalid Request', details: 'userId must be a valid UUID v4 string.' },
            { status: 400 }
        );
    }

    // 3. Supabase Client Initialization Check
    let supabase;
    try {
        supabase = await createClient();
        if (!supabase) throw new Error('Supabase client failed to initialize');
    } catch (clientErr) {
        console.error('POST /api/recommendations client error:', clientErr);
        return NextResponse.json(
            { error: 'Service Unavailable', details: 'Unable to connect to database service.' },
            { status: 503 }
        );
    }

    try {
        let posts = [];

        // 4. Personalized Collaborative Filtering Fetch
        if (userId) {
            const { data: cfRows, error: cfError } = await supabase
                .from('cf_user_scores')
                .select(`
                    cf_score,
                    posts!inner(
                        id, slug, title, excerpt, image_url, topic, date, views, published,
                        profiles!posts_user_id_fkey(username, avatar_url, full_name)
                    )
                `)
                .eq('user_id', userId)
                .eq('posts.published', true)
                .order('cf_score', { ascending: false })
                .limit(limit + 1);

            if (cfError) {
                console.error('cf_user_scores query error:', cfError.message, cfError.details);
                // Non-fatal: drop down to PageRank fallback
            } else if (cfRows) {
                posts = cfRows.map((r) => r.posts).filter(Boolean);
            }
        }

        // 5. Fallback PageRank Query
        if (posts.length < limit) {
            const { data: prRows, error: prError } = await supabase
                .from('pagerank_scores')
                .select(`
                    pr_score,
                    posts!inner(
                        id, slug, title, excerpt, image_url, topic, date, views, published,
                        profiles!posts_user_id_fkey(username, avatar_url, full_name)
                    )
                `)
                .eq('posts.published', true)
                .order('pr_score', { ascending: false })
                .limit(limit + 1);

            if (prError) {
                console.error('pagerank_scores query error:', prError.message, prError.details);
            } else if (prRows) {
                const seen = new Set(posts.map((p) => p.id));
                for (const row of prRows) {
                    if (row.posts && !seen.has(row.posts.id)) {
                        posts.push(row.posts);
                        seen.add(row.posts.id);
                    }
                }
            }
        }

        // 6. Exclude Current Article
        if (excludeSlug) {
            posts = posts.filter((p) => p.slug !== excludeSlug);
        }

        return NextResponse.json({ posts: posts.slice(0, limit) });

    } catch (err) {
        console.error('Unhandled error in POST /api/recommendations:', err);
        return NextResponse.json(
            { error: 'Internal Server Error', message: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
