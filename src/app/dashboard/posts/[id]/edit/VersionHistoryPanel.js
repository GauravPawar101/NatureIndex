'use client';

import { useMemo, useState } from 'react';

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ');
}

function formatTs(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || '');
  }
}

export default function VersionHistoryPanel({ versions, restoreAction }) {
  const rows = useMemo(() => (Array.isArray(versions) ? versions : []), [versions]);
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? null);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );

  return (
    <section className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Version History</h2>

      {rows.length === 0 ? (
        <p className="text-gray-400">No previous versions yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {rows.map((v) => {
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    active
                      ? 'border-teal-500/40 bg-teal-500/10'
                      : 'border-gray-700/40 bg-black/20 hover:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-gray-100 font-semibold truncate">{v.title || 'Untitled'}</p>
                    <p className="text-gray-400 text-xs shrink-0">{formatTs(v.updated_at)}</p>
                  </div>
                  {v.updated_by ? (
                    <p className="text-gray-500 text-xs mt-1 truncate">Updated by: {v.updated_by}</p>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-700/40 bg-black/20 p-4">
            {!selected ? (
              <p className="text-gray-400">Select a version to preview.</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-gray-100 font-semibold truncate">{selected.title || 'Untitled'}</p>
                    <p className="text-gray-500 text-xs mt-1">{formatTs(selected.updated_at)}</p>
                  </div>

                  <form action={restoreAction}>
                    <input type="hidden" name="versionId" value={selected.id} />
                    <button
                      type="submit"
                      className="shrink-0 px-3 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium"
                    >
                      Restore
                    </button>
                  </form>
                </div>

                <div className="mt-4">
                  <p className="text-gray-400 text-xs mb-2">Preview</p>
                  <div className="max-h-72 overflow-auto rounded-lg border border-gray-700/40 bg-black/30 p-3">
                    <p className="text-gray-200 text-sm whitespace-pre-wrap">
                      {stripHtml(selected.content).replace(/\s+/g, ' ').trim() || '(empty)'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-4">
        Versions are captured automatically when you change the title or content.
      </p>
    </section>
  );
}
