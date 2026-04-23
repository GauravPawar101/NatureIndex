import 'server-only';

import sharp from 'sharp';

const DEFAULT_TIMEOUT_MS = 8000;

function withTimeout(signal, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return { signal, cancel: () => {} };
  const controller = new AbortController();

  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    },
  };
}

/**
 * Generates a tiny blurred base64 placeholder for a remote image URL.
 *
 * Returns a full data URL like: `data:image/webp;base64,...`
 */
export async function generateCoverBlurDataUrl(imageUrl, options = {}) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  const width = Number(options.width ?? 24);
  const quality = Number(options.quality ?? 40);
  const blurSigma = Number(options.blurSigma ?? 8);
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const { signal, cancel } = withTimeout(undefined, timeoutMs);

  try {
    const res = await fetch(imageUrl, {
      // We want the original bytes for sharp.
      cache: 'no-store',
      signal,
    });

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const input = Buffer.from(arrayBuffer);

    const out = await sharp(input, { failOn: 'none' })
      .resize({ width, withoutEnlargement: true })
      .blur(blurSigma)
      .webp({ quality })
      .toBuffer();

    return `data:image/webp;base64,${out.toString('base64')}`;
  } catch {
    return null;
  } finally {
    cancel();
  }
}
