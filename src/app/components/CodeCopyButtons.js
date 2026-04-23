'use client';

import { useEffect } from 'react';

function copyText(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for older browsers.
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('Copy failed'));
    } catch (e) {
      reject(e);
    }
  });
}

export default function CodeCopyButtons({ scopeSelector = '.post-content' }) {
  useEffect(() => {
    const root = document.querySelector(scopeSelector);
    if (!root) return;

    const pres = root.querySelectorAll('pre');
    for (const pre of pres) {
      // Only attach to code blocks.
      const code = pre.querySelector('code');
      if (!code) continue;

      if (pre.querySelector('[data-code-copy-button="true"]')) continue;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Copy';
      btn.className = 'code-copy-button';
      btn.setAttribute('data-code-copy-button', 'true');

      btn.addEventListener('click', async () => {
        const raw = code.textContent || '';
        if (!raw.trim()) return;

        btn.setAttribute('data-copy-state', 'busy');
        try {
          await copyText(raw);
          btn.textContent = 'Copied';
          btn.setAttribute('data-copy-state', 'copied');
          window.setTimeout(() => {
            btn.textContent = 'Copy';
            btn.setAttribute('data-copy-state', 'idle');
          }, 1200);
        } catch {
          btn.textContent = 'Failed';
          btn.setAttribute('data-copy-state', 'error');
          window.setTimeout(() => {
            btn.textContent = 'Copy';
            btn.setAttribute('data-copy-state', 'idle');
          }, 1200);
        }
      });

      pre.classList.add('code-block');
      pre.appendChild(btn);
    }
  }, [scopeSelector]);

  return null;
}
