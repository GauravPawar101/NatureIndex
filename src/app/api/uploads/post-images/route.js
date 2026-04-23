import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  // `file` is a Web File/Blob in Next route handlers.
  const mimeType = file.type || 'application/octet-stream';
  if (!mimeType.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
  }

  const maxBytes = 8 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > maxBytes) {
    return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 413 });
  }

  const originalName = file.name || 'image';
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'png';
  const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('post-images')
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('post-images').getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
