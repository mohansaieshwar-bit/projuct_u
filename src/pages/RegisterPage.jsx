import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'publisher' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error } = await signUp(form)
    if (error) return setError(error.message)
    setMessage('Account created. Check email if confirmation is enabled in Supabase.')
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 className="title">Register</h1>
      <p className="muted">Choose publisher or admin role for testing. In production, create admin manually.</p>
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Full name</label>
          <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Role</label>
          <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="publisher">Publisher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Create account</button>
      </form>
      <p className="muted">Already have account? <Link to="/login">Login</Link></p>
    </div>
  )
}
