/**
 * Shared "there is nothing here" state.
 *
 * Every list in the app previously hand-rolled this, with three different
 * grey-on-black paragraphs and no way to recover. This one always offers a
 * next action, because an empty state with no way out is a dead end.
 */
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
    return (
        <div className={`flex flex-col items-center px-6 py-16 text-center ${className}`}>
            {Icon && (
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]">
                    <Icon size={22} aria-hidden="true" />
                </span>
            )}
            <h3 className="display-3 text-[var(--ink)]">{title}</h3>
            {description && (
                <p className="lede mt-3 text-sm">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
