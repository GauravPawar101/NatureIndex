'use client';

import { useMemo, useRef, useState } from 'react';

function toUtcDate(day) {
  // day is expected to be YYYY-MM-DD
  return new Date(`${day}T00:00:00Z`);
}

function formatTooltipDate(day) {
  const d = toUtcDate(day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pickLevel(count, max) {
  if (!count || count <= 0) return 0;
  if (!max || max <= 0) return 0;

  // If the scale is tiny, use simple integer thresholds.
  if (max <= 4) {
    return clamp(count, 1, 4);
  }

  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export default function ViewsHeatmap({ days }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const data = useMemo(() => {
    const safe = Array.isArray(days) ? days : [];
    const map = new Map();
    for (const row of safe) {
      if (!row?.day) continue;
      map.set(row.day, Number(row.views || 0));
    }

    // If the RPC returns a complete series, we can render directly.
    const ordered = safe
      .filter((r) => r?.day)
      .map((r) => ({ day: r.day, views: Number(r.views || 0) }))
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

    const maxViews = ordered.reduce((m, r) => Math.max(m, Number(r.views || 0)), 0);

    // Pad to week start (Sunday) like GitHub.
    const pad = ordered.length ? toUtcDate(ordered[0].day).getUTCDay() : 0;
    const cells = [];
    for (let i = 0; i < pad; i += 1) cells.push(null);
    for (const r of ordered) cells.push(r);

    return { map, ordered, cells, maxViews };
  }, [days]);

  const cellSize = 12;
  const gap = 3;
  const weeks = Math.ceil(data.cells.length / 7) || 1;
  const width = weeks * (cellSize + gap) - gap;
  const height = 7 * (cellSize + gap) - gap;

  const colors = [
    'rgba(255,255,255,0.06)',
    'rgba(13,148,136,0.25)',
    'rgba(13,148,136,0.45)',
    'rgba(13,148,136,0.65)',
    'rgba(13,148,136,0.90)',
  ];

  function showTooltip(e, cell) {
    if (!cell?.day) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : e.clientX;
    const y = rect ? e.clientY - rect.top : e.clientY;

    setTooltip({
      day: cell.day,
      views: Number(cell.views || 0),
      x: clamp(x + 12, 0, (rect?.width || x + 12) - 10),
      y: clamp(y + 12, 0, (rect?.height || y + 12) - 10),
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Daily Views (Last 12 Months)</h2>
          <p className="text-gray-400 text-sm mt-1">GitHub-style activity map.</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {colors.map((c, i) => (
              <span
                key={i}
                className="inline-block rounded-sm"
                style={{ width: 10, height: 10, background: c }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          role="img"
          aria-label="Contribution heatmap showing daily post views"
        >
          {data.cells.map((cell, idx) => {
            const week = Math.floor(idx / 7);
            const dow = idx % 7;

            const x = week * (cellSize + gap);
            const y = dow * (cellSize + gap);

            const views = cell ? Number(cell.views || 0) : 0;
            const level = pickLevel(views, data.maxViews);
            const fill = colors[level];

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={3}
                fill={fill}
                stroke="rgba(255,255,255,0.06)"
                onMouseEnter={(e) => showTooltip(e, cell)}
                onMouseMove={(e) => showTooltip(e, cell)}
                onMouseLeave={hideTooltip}
              />
            );
          })}
        </svg>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 px-3 py-2 rounded-lg border border-gray-700 bg-black/90 text-white text-xs shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="font-semibold">{tooltip.views.toLocaleString()} views</div>
            <div className="text-gray-300">{formatTooltipDate(tooltip.day)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
