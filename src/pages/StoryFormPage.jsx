import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function StoryFormPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', content: '', status: 'draft' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id === 'new' || !id) return
    fetchStory()
  }, [id])

  async function fetchStory() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('stories')
        .select('title, slug, content')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) {
        setForm({
          ...data,
          status: 'draft'
        })
      }
    } catch (err) {
      setError('Failed to load story')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      setError('Must be logged in')
      return
    }
    
    const slug = form.slug || slugify(form.title)
    const payload = {
      title: form.title.trim(),
      slug,
      content: form.content.trim(),
      author_id: user.id,
      status: 'draft'  // Always draft for publishers
    }

    try {
      setLoading(true)
      setError('')
      setMessage('')
      
      let response
      if (id && id !== 'new') {
        // Update existing - publishers can only edit content/title/slug
        const { error } = await supabase
          .from('stories')
          .update(payload)
          .eq('id', id)
          .eq('author_id', user.id)
        if (error) throw error
        setMessage('Story updated successfully!')
      } else {
        // Create new
        const { error } = await supabase
          .from('stories')
          .insert([payload])
        if (error) throw error
        setMessage('Story created successfully!')
      }
      
      setTimeout(() => navigate('/publisher/dashboard'), 1500)
    } catch (err) {
      console.error('Story save error:', err)
      setError(err.message || 'Failed to save story')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h1>{id === 'new' || !id ? 'Create story' : 'Edit story'}</h1>
      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice success">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Title</label>
          <input 
            className="input" 
            value={form.title} 
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required 
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label className="label">Slug</label>
          <input 
            className="input" 
            value={form.slug || slugify(form.title)} 
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label className="label">Content</label>
          <textarea 
            className="textarea" 
            rows="20"
            value={form.content} 
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required 
            disabled={loading}
          />
        </div>
        
        <p className="muted small">
          Status: draft (submit for admin review from dashboard)
        </p>
        
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            className="btn btn-secondary" 
            type="button" 
            onClick={() => navigate('/publisher/dashboard')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

