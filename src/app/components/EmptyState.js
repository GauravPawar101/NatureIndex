/**
 * Shared "there is nothing here" state.
 *
 * Medium's equivalent is a 1px-ruled block of 16px text with the recovery
 * action underneath — no illustration, no tinted panel, no rounded card. Every
 * list in the app used to hand-roll this with three different treatments and
 * no way out; this one always offers a next action, because an empty state
 * with no way out is a dead end.
 */
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
    return (
        <div className={`border-y border-[var(--line)] py-14 text-center ${className}`}>
            {Icon && <Icon size={24} aria-hidden="true" className="mx-auto mb-4 text-[var(--ink-faint)]" />}
            <h3 className="display-3">{title}</h3>
            {description && (
                <p className="mx-auto mt-2 max-w-md text-[15px] leading-[1.5] text-[var(--ink-muted)]">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
