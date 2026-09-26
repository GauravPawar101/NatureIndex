import { Redis } from '@upstash/redis';

let client;

/**
 * Server-only Upstash Redis client. Uses the REST URL/token pair from the
 * Upstash dashboard — NOT the redis:// / rediss:// TCP URL the Rust
 * PageRank job connects with. Same database, different credentials.
 */
export function getUpstashClient() {
    if (client) return client;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        throw new Error(
            'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in your environment.'
        );
    }

    client = new Redis({ url, token });
    return client;
}
