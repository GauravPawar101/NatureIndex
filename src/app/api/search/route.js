import { NextResponse } from 'next/server';
import { searchPosts } from '../../lib/posts';

const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;
const MAX_QUERY_LENGTH = 200;
const VALID_SORTS = new Set(['newest', 'oldest', 'popular']);

/**
 * GET /api/search?q=&topic=&sort=&limit=&offset=
 *
 * Backs the blog page's "load more" button and powers the same query the server
 * component renders, so client paging and SSR agree on ordering.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);

    // Truncate rather than reject: an absurdly long query is a paste accident,
    // and a silent 200 with sensible results beats an error the user cannot act
    // on. The cut happens before the database sees it.
    const query = (searchParams.get('q') || '').slice(0, MAX_QUERY_LENGTH);
    const topic = (searchParams.get('topic') || 'All').slice(0, 80);
    const sort = searchParams.get('sort') || 'newest';

    const requestedLimit = Number(searchParams.get('limit'));
    const requestedOffset = Number(searchParams.get('offset'));

    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(MAX_LIMIT, requestedLimit)
        : DEFAULT_LIMIT;

    const offset = Number.isInteger(requestedOffset) && requestedOffset > 0
        ? requestedOffset
        : 0;

    if (!VALID_SORTS.has(sort)) {
        return NextResponse.json(
            { error: 'Invalid sort', details: `sort must be one of: ${[...VALID_SORTS].join(', ')}` },
            { status: 400 }
        );
    }

    const { posts, total, degraded, reason } = await searchPosts({ query, topic, sort, limit, offset });

    return NextResponse.json(
        { posts, total, degraded: Boolean(degraded), ...(reason ? { reason } : {}) },
        {
            headers: {
                // Search results are user-specific and cheap to recompute; a
                // short shared cache keeps the blog list fast without pinning
                // a stale result after someone publishes.
                'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
            },
        }
    );
}
