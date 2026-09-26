/**
 * Shared "there is nothing here" state.
 *
 * Every list in the app previously hand-rolled this, with three different
 * grey-on-black paragraphs and no way to recover. This one always offers a
 * next action, because an empty state with no way out is a dead end.
 */
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
    return (
        <div className={`flex flex-col items-center px-6 py-14 text-center ${className}`}>
            {Icon && (
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gray-400 ring-1 ring-white/10">
                    <Icon size={24} aria-hidden="true" />
                </span>
            )}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && (
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
