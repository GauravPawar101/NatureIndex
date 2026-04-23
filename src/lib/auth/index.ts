import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Role } from './roles'

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  return userId
}

export async function requireRole(allowedRoles: Role[]) {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const role = getRoleFromClaims(sessionClaims)

  if (!allowedRoles.includes(role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }

  return { userId, role }
}

function getRoleFromClaims(claims: unknown): Role {
  const c = (claims || {}) as any
  const raw = String(
    c?.publicMetadata?.role ??
      c?.public_metadata?.role ??
      c?.metadata?.role ??
      c?.user?.publicMetadata?.role ??
      ''
  ).toLowerCase()

  if (raw === 'admin' || raw === 'author' || raw === 'reader') {
    return raw
  }

  return 'reader'
}

export { getCurrentUserRole, type Role } from './roles'
