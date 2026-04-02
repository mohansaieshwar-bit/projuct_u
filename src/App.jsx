import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'

export default function App() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <header className="topbar">
        <div className="container row between center">
          <Link className="brand" to="/">projuct_u</Link>
          <nav className="row gap-sm center">
            <Link to="/">Home</Link>
            {!user && <Link to="/login">Login</Link>}
            {!user && <Link to="/register">Register</Link>}
            {profile?.role === 'publisher' && <Link to="/publisher/dashboard">Publisher</Link>}
            {profile?.role === 'admin' && <Link to="/admin/dashboard">Admin</Link>}
            {user && (
              <button className="btn btn-secondary" onClick={handleSignOut}>
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="container page-space">
        <Outlet />
      </main>
    </div>
  )
}

