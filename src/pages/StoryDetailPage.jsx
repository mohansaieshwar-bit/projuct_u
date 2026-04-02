import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function StoryDetailPage({ listMode = false }) {
  const { slug } = useParams()
  const [stories, setStories] = useState([])
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (listMode) {
      fetchStories()
    } else {
      fetchStory()
    }
  }, [slug, listMode])

  async function fetchStories() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('stories_public')
        .select('id,title,slug,content,published_at')
        .order('published_at', { ascending: false })
        .limit(9)

      if (error) {
        setError(`Stories error: ${error.message}`)
        throw error
      }
      
      setStories(data || [])
    } catch (err) {
      console.error('fetchStories failed:', err)
      setStories([])
      setError('Failed to load stories')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStory() {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('stories_public')
        .select('id,title,slug,content,published_at')
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      
      setStory(data)
      
      // Safe view tracking - no chaining .catch()
      if (data?.id) {
        try {
          await supabase.from('story_views').insert({ story_id: data.id })
        } catch (viewError) {
          console.warn('Story view tracking failed:', viewError.message)
        }
      }
    } catch (err) {
      console.error('fetchStory failed:', err)
      setError(err.message)
      setStory(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="card">Loading...</div>

  if (listMode) {
    return (
      <div>
        <div className="hero">
          <h1 className="title">Welcome to projuct_u</h1>
          <p className="muted">Readers only see published stories. Admin controls publishing and scheduling.</p>
        </div>
        
        {error && (
          <div className="card" style={{ color: 'red', margin: '1rem 0' }}>
            Error: {error}
          </div>
        )}
        
        <div className="grid grid-3">
          {stories.map(item => (
            <div key={item.id} className="card story-card">
              <span className="badge">Published</span>
              <h3>{item.title}</h3>
              <p className="muted">{item.content?.slice(0, 100)}...</p>
              <Link className="btn btn-primary" to={`/stories/${item.slug}`}>Read story</Link>
            </div>
          ))}
          {stories.length === 0 && !error && (
            <div className="card">No published stories yet.</div>
          )}
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="card">
        <h2>Story not found</h2>
        {error && <p style={{color: 'red'}}>{error}</p>}
        <Link className="btn btn-primary" to="/">← Back to Home</Link>
      </div>
    )
  }

  return (
    <article className="card">
      <span className="badge">Published</span>
      <h1>{story.title}</h1>
      <p className="muted">Published: {new Date(story.published_at).toLocaleString()}</p>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{story.content}</div>
    </article>
  )
}

