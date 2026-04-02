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
        .select('id, title, slug, content, published_at')
        .order('published_at', { ascending: false })
        .limit(9)

      if (error) {
        throw error
      }

      setStories(data || [])
    } catch (err) {
      console.warn('Stories fetch error:', err.message)
      setError(err.message || 'Failed to load stories')
      setStories([])
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
        .select('id, title, slug, content, published_at')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        throw error
      }

      setStory(data || null)

      if (data?.id) {
        supabase.from('story_views').insert({ story_id: data.id }).catch(() => {})
      }
    } catch (err) {
      console.warn('Story fetch error:', err.message)
      setError(err.message || 'Failed to load story')
      setStory(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (listMode) {
    return (
      <div>
        <div className="hero">
          <h1 className="title">Welcome to projuct_u</h1>
          <p className="muted">Readers only see published stories. Admin controls publishing and scheduling.</p>
        </div>

        {error && (
          <div className="card" style={{ marginBottom: '1rem', background: '#ffe5e5' }}>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-3">
          {stories.map((item) => (
            <div key={item.id} className="card story-card">
              <span className="badge">Published</span>
              <h3>{item.title}</h3>
              <p className="muted">
                {item.content ? `${item.content.slice(0, 120)}...` : 'No content preview.'}
              </p>
              <Link className="btn btn-primary" to={`/stories/${item.slug}`}>
                Read story
              </Link>
            </div>
          ))}

          {stories.length === 0 && !error && (
            <div className="card col-span-full">
              <p className="muted">No published stories yet.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>Story not found</h2>
        <p>{error || 'This story may not be published yet or the link is incorrect.'}</p>
        <Link className="btn btn-primary" to="/">← Back to Home</Link>
      </div>
    )
  }

  return (
    <article className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <span className="badge">Published</span>
      <h1>{story.title}</h1>
      <p className="muted">Published: {new Date(story.published_at).toLocaleString()}</p>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{story.content}</div>
    </article>
  )
}