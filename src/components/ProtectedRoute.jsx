import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p>Verifying login...</p>
        </div>
      </div>
    )
  }
  
  return user ? (children || <Outlet />) : <Navigate to="/login" replace />
}

export function RoleRoute({ allowedRoles, children }) {
  const { profile, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p>Loading your account...</p>
        </div>
      </div>
    )
  }
  
  if (!profile?.role) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p>Account setup incomplete. <a href="/register" style={{ color: 'blue' }}>Complete profile</a></p>
        </div>
      </div>
    )
  }
  
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }
  
  return children || <Outlet />
}

