/**
 * Presentation helpers shared across pages.
 *
 * These were previously copy-pasted into BlogList, CommentSection and the
 * article page, each with slightly different fallbacks ("Unknown Date" in one
 * place, silently hiding the date in another). Centralised so a post with a
 * malformed `date` always renders the same way.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** "12 Mar 2025", or `fallback` when the value is missing/unparseable. */
export function formatDate(value, fallback = 'Unknown date') {
    const date = toDate(value);
    if (!date) return fallback;
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** ISO `yyyy-mm-dd` for a <time dateTime> attribute. */
export function toISODate(value) {
    const date = toDate(value);
    return date ? date.toISOString().slice(0, 10) : undefined;
}

/**
 * "3 hours ago". Uses `Intl.RelativeTimeFormat` so it localises, and degrades
 * to `formatDate` for anything older than ~30 days where an absolute date is
 * clearer than "2 months ago".
 */
export function formatRelativeTime(value, fallback = '') {
    const date = toDate(value);
    if (!date) return fallback;

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absolute = Math.abs(diffSeconds);

    if (absolute > 60 * 60 * 24 * 30) return formatDate(date);

    const units = [
        { limit: 60, divisor: 1, unit: 'second' },
        { limit: 3600, divisor: 60, unit: 'minute' },
        { limit: 86400, divisor: 3600, unit: 'hour' },
        { limit: 604800, divisor: 86400, unit: 'day' },
        { limit: 2629800, divisor: 604800, unit: 'week' },
        { limit: 31557600, divisor: 2629800, unit: 'month' },
        { limit: Infinity, divisor: 31557600, unit: 'year' },
    ];

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const { limit, divisor, unit } of units) {
        if (absolute < limit) {
            return rtf.format(Math.round(diffSeconds / divisor), unit);
        }
    }

    return formatDate(date);
}

/** 1200 -> "1.2K". Keeps large view/comment counts from wrapping cards. */
export function formatCompactNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return '0';
    if (number < 1000) return String(Math.floor(number));
    if (number < 1_000_000) {
        const thousands = number / 1000;
        return `${thousands < 10 ? thousands.toFixed(1).replace(/\.0$/, '') : Math.floor(thousands)}K`;
    }
    const millions = number / 1_000_000;
    return `${millions < 10 ? millions.toFixed(1).replace(/\.0$/, '') : Math.floor(millions)}M`;
}

/** "1 min read" / "6 min read" from a word count, floored at 1. */
export function formatReadingTime(content, wordsPerMinute = 220) {
    const words = countWords(content);
    if (!words) return null;
    return `${Math.max(1, Math.round(words / wordsPerMinute))} min read`;
}

export function countWords(content) {
    if (!content || typeof content !== 'string') return 0;
    const text = content
        // Strip fenced code and inline code before counting: a 200-line code
        // block is not 400 words of prose and would wildly inflate the estimate.
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    return text.split(/\s+/).filter(Boolean).length;
}

/** "1 comment" / "4 comments" */
export function pluralize(count, singular, plural = `${singular}s`) {
    const number = Number(count) || 0;
    return `${formatCompactNumber(number)} ${number === 1 ? singular : plural}`;
}

export function formatBytes(bytes) {
    const number = Number(bytes);
    if (!Number.isFinite(number) || number <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(number) / Math.log(1024)));
    const value = number / 1024 ** index;
    return `${value < 10 && index > 0 ? value.toFixed(1).replace(/\.0$/, '') : Math.round(value)} ${units[index]}`;
}

/** "Member since Mar 2025" */
export function formatMemberSince(value) {
    const date = toDate(value);
    if (!date) return null;
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** First letter, for avatar fallbacks. "" for a blank name. */
export function initials(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().charAt(0).toUpperCase();
}
