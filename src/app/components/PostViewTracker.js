'use client';

import { useEffect, useRef } from 'react';

export default function PostViewTracker({ postId }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!postId) return;
    if (fired.current) return;

    fired.current = true;

    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
      keepalive: true,
    }).catch(() => {});
  }, [postId]);

  return null;
}
