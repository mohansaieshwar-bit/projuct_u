import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn(form.email, form.password)
      if (result.error) {
        setError(result.error)
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 className="title">Login</h1>
      <p className="muted">Admin and publisher both can login here.</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Email</label>
          <input 
            className="input" 
            type="email"
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <input 
            className="input" 
            type="password" 
            value={form.password} 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
            disabled={loading}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <p className="muted">No account? <Link to="/register">Create one</Link></p>
    </div>
  )
}

