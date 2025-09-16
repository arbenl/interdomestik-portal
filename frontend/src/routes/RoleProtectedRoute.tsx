import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Role = 'admin'|'agent'|'member'
export function RoleProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, loading, isAdmin, isAgent } = useAuth()

  if (loading) return <p className='p-4 text-sm text-muted-foreground'>Checking permissions…</p>
  if (!user) return <Navigate to='/signin' replace />

  const ok =
    (roles.includes('admin') && isAdmin) ||
    (roles.includes('agent') && isAgent) ||
    (roles.includes('member') && !isAdmin && !isAgent)

  if (!ok) return <Navigate to='/portal' replace />
  return <Outlet />
}
