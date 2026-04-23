import Link from 'next/link';
import Image from 'next/image';
import BookmarkButton from '../../components/BookmarkButton';

export default function RelatedPosts({ posts }) {
  const items = Array.isArray(posts) ? posts : [];
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-6">Related Posts</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="group bg-zinc-800/30 rounded-2xl border border-gray-700/30 overflow-hidden hover:border-orange-500/30 transition-colors shadow-xl"
          >
            {p.image_url && (
              <div className="relative h-40 w-full">
                <Image
                  src={p.image_url}
                  alt={p.title}
                  fill
                  className="object-cover"
                  placeholder={p.cover_blur ? 'blur' : 'empty'}
                  blurDataURL={p.cover_blur || undefined}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-gray-400 mb-2">
                  {p.username ? (
                    <span className="text-orange-400 font-semibold">{p.username}</span>
                  ) : (
                    <span className="text-gray-400">Unknown Author</span>
                  )}
                  {p.date && (
                    <>
                      <span className="text-gray-600"> • </span>
                      <span className="text-gray-500">
                        {new Date(p.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                </div>
                <BookmarkButton postId={p.id} className="px-2 py-1" size={16} />
              </div>
              <h3 className="text-lg font-bold text-gray-100 group-hover:text-orange-400 transition-colors line-clamp-2">
                {p.title}
              </h3>
              {p.excerpt && (
                <p className="mt-2 text-sm text-gray-400 line-clamp-3">{p.excerpt}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
