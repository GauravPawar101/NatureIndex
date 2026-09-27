/**
 * Password requirements + a simple strength score.
 *
 * Kept in its own module (rather than inside the form) so the signup form and
 * any future "change password" screen share one definition, and so the scoring
 * rules can be unit tested without rendering anything.
 *
 * Note: this is *entropy guidance for humans*, not a security control. The real
 * requirement is whatever Supabase's Auth settings enforce. The 8-character
 * minimum here matches the stricter of the two so the form does not promise
 * something the server will reject.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Shown as a live checklist under the signup password field. */
export const PASSWORD_RULES = [
    {
        id: 'length',
        label: `At least ${MIN_PASSWORD_LENGTH} characters`,
        test: (value) => value.length >= MIN_PASSWORD_LENGTH,
    },
    {
        id: 'lowercase',
        label: 'A lowercase letter',
        test: (value) => /[a-z]/.test(value),
    },
    {
        id: 'uppercase',
        label: 'An uppercase letter',
        test: (value) => /[A-Z]/.test(value),
    },
    {
        id: 'number',
        label: 'A number',
        test: (value) => /[0-9]/.test(value),
    },
    {
        id: 'symbol',
        label: 'A symbol like ! @ # $',
        test: (value) => /[^A-Za-z0-9]/.test(value),
    },
];

/**
 * A tiny deny list. Not a substitute for a breached-password service, but it
 * catches the handful of guesses that show up in every credential-stuffing
 * wordlist.
 */
const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', 'passw0rd', '123456', '1234567', '12345678',
    '123456789', '1234567890', 'qwerty', 'qwerty123', 'qwertyuiop', 'letmein', 'welcome',
    'welcome1', 'monkey', 'dragon', 'iloveyou', 'admin', 'admin123', 'root', 'toor',
    'abc123', 'football', 'baseball', 'sunshine', 'princess', 'trustno1', 'supabase',
    'natureindex', 'nature123', 'changeme', 'secret', 'test1234', 'whatever',
]);

/**
 * @param {string} value
 * @param {Array<{id: string, label: string, test: (value: string) => boolean}>} [rules]
 * @returns {Array<{id: string, label: string, passed: boolean}>}
 */
export function checkPasswordRules(value, rules = PASSWORD_RULES) {
    const candidate = typeof value === 'string' ? value : '';
    return rules.map((rule) => ({ id: rule.id, label: rule.label, passed: rule.test(candidate) }));
}

/** True when every rule passes. An empty string is never "valid". */
export function isPasswordValid(value, rules = PASSWORD_RULES) {
    if (!value) return false;
    return checkPasswordRules(value, rules).every((rule) => rule.passed);
}

export function isCommonPassword(value) {
    if (!value) return false;
    return COMMON_PASSWORDS.has(value.trim().toLowerCase());
}

/**
 * Crude but explainable strength: length, character variety, and penalties for
 * repetition / sequences / known-common passwords.
 *
 * @returns {{ score: 0|1|2|3|4, label: string, hint: string, color: string }}
 *   `score` is out of 4 and maps onto the four meter bars.
 */
export function scorePassword(value) {
    const password = typeof value === 'string' ? value : '';
    const result = (score, label, hint, color) => ({ score, label, hint, color });

    if (!password) {
        return result(0, '', 'Pick something a person would not guess.', 'bg-[var(--surface-raised)]');
    }

    if (isCommonPassword(password)) {
        return result(0, 'Too common', 'This is one of the first things anyone would try. Make it longer and less predictable.', 'bg-red-400');
    }

    let points = 0;

    if (password.length >= MIN_PASSWORD_LENGTH) points += 1;
    if (password.length >= 12) points += 1;

    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
    if (classes >= 2) points += 1;
    if (classes >= 3) points += 1;

    // Penalties.
    if (/^(.)\1+$/.test(password)) points -= 2;                       // aaaaaa
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(password)) points -= 1; // sequences
    if (/(.)\1{2,}/.test(password)) points -= 1;                      // repeated runs

    const score = Math.max(0, Math.min(4, points));

    switch (score) {
        case 0:
            return result(0, 'Too weak', 'Add length and a mix of letters, numbers and symbols.', 'bg-red-400');
        case 1:
            return result(1, 'Weak', 'Add length and a mix of letters, numbers and symbols.', 'bg-orange-400');
        case 2:
            return result(2, 'Fair', 'Longer is stronger — try a memorable phrase.', 'bg-amber-300');
        case 3:
            return result(3, 'Good', 'A few more characters would make this hard to guess.', 'bg-emerald-400');
        default:
            return result(4, 'Strong', 'Great — long and varied. Keep it unique to this site.', 'bg-emerald-300');
    }
}

export default scorePassword;
