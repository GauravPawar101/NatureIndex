import { NextResponse } from 'next/server';

// This route is deprecated - Clerk handles auth callbacks
// Redirect to sign-in for any legacy links
export async function GET(request) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL('/sign-in', requestUrl.origin));
}