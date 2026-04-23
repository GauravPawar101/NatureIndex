import { auth } from '@clerk/nextjs/server';

export type Role = 'admin' | 'author' | 'reader';

function normalizeRole(value: unknown): Role {
  const raw = String(value || '').toLowerCase();
  if (raw === 'admin' || raw === 'author' || raw === 'reader') return raw;
  return 'reader';
}

function getRoleFromClaims(claims: unknown): Role {
  const c = (claims || {}) as any;
  return normalizeRole(
    c?.publicMetadata?.role ??
      c?.public_metadata?.role ??
      c?.metadata?.role ??
      c?.user?.publicMetadata?.role
  );
}

export async function getCurrentUserRole(): Promise<Role> {
  const { sessionClaims } = await auth();
  return getRoleFromClaims(sessionClaims);
}
