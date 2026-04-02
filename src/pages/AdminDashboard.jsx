import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()

  const [stories, setStories] = useState([])
  const [deleteRequests, setDeleteRequests] = useState([])
  const [stats, setStats] = useState({
    totalStories: 0,
    publishedStories: 0,
    totalViews: 0,
    pendingDeletes: 0,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setError('')

      const [storiesRes, requestsRes, viewsRes] = await Promise.all([
        supabase
          .from('stories_admin')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('delete_requests')
          .select(`
            *,
            stories (
              id,
              title
            )
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('story_views')
          .select('*', { count: 'exact', head: true }),
      ])

      if (storiesRes.error) throw storiesRes.error
      if (requestsRes.error) throw requestsRes.error
      if (viewsRes.error) throw viewsRes.error

      const storyRows = storiesRes.data || []
      const requestRows = requestsRes.data || []
      const totalViews = viewsRes.count || 0

      setStories(storyRows)
      setDeleteRequests(requestRows)
      setStats({
        totalStories: storyRows.length,
        publishedStories: storyRows.filter((x) => x.status === 'published').length,
        totalViews,
        pendingDeletes: requestRows.filter((x) => x.status === 'pending').length,
      })
    } catch (fetchError) {
      console.error('Admin fetch error:', fetchError)
      setError(fetchError.message || 'Failed to load admin dashboard')
    }
  }

  async function insertStoryLog({ storyId, action, oldStatus, newStatus }) {
    try {
      const { error: logError } = await supabase.from('story_logs').insert({
        story_id: storyId,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        admin_id: user?.id || null,
      })

      if (logError) {
        console.warn('Story log insert failed:', logError.message)
      }
    } catch (logError) {
      console.warn('Story log insert failed:', logError)
    }
  }

  async function updateStory(storyId, nextStatus) {
    setIsUpdating(true)
    setMessage('')
    setError('')

    try {
      const existingStory = stories.find((story) => story.id === storyId)
      const oldStatus = existingStory?.status || null

      const payload = { status: nextStatus }

      if (nextStatus === 'published') {
        payload.published_at = new Date().toISOString()
        payload.unpublished_at = null
      }

      if (nextStatus === 'unpublished') {
        payload.unpublished_at = new Date().toISOString()
      }

      if (nextStatus === 'in_review') {
        payload.published_at = null
        payload.unpublished_at = null
      }

      const { error: updateError } = await supabase
        .from('stories')
        .update(payload)
        .eq('id', storyId)

      if (updateError) throw updateError

      setStories((prevStories) =>
        prevStories.map((story) =>
          story.id === storyId
            ? {
                ...story,
                status: nextStatus,
                published_at:
                  payload.published_at !== undefined ? payload.published_at : story.published_at,
                unpublished_at:
                  payload.unpublished_at !== undefined
                    ? payload.unpublished_at
                    : story.unpublished_at,
              }
            : story
        )
      )

      setMessage('Story updated successfully')

      await insertStoryLog({
        storyId,
        action: `changed to ${nextStatus}`,
        oldStatus,
        newStatus: nextStatus,
      })

      await fetchData()
    } catch (updateError) {
      console.error('updateStory error:', updateError)
      setError(updateError.message || 'Failed to update story')
    } finally {
      setIsUpdating(false)
    }
  }

  async function scheduleStory(storyId) {
    const input = prompt('Enter publish date (YYYY-MM-DDTHH:mm:ss):')
    if (!input) return

    setIsUpdating(true)
    setMessage('')
    setError('')

    try {
      const existingStory = stories.find((story) => story.id === storyId)
      const oldStatus = existingStory?.status || null
      const iso = new Date(input).toISOString()

      const { error: scheduleError } = await supabase
        .from('stories')
        .update({
          status: 'scheduled',
          publish_at: iso,
        })
        .eq('id', storyId)

      if (scheduleError) throw scheduleError

      setStories((prevStories) =>
        prevStories.map((story) =>
          story.id === storyId
            ? { ...story, status: 'scheduled', publish_at: iso }
            : story
        )
      )

      setMessage('Story scheduled successfully')

      await insertStoryLog({
        storyId,
        action: 'scheduled',
        oldStatus,
        newStatus: 'scheduled',
      })

      await fetchData()
    } catch (scheduleError) {
      console.error('scheduleStory error:', scheduleError)
      setError(scheduleError.message || 'Failed to schedule story')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDeleteRequest(item, status) {
    setIsUpdating(true)
    setMessage('')
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('delete_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      if (status === 'approved') {
        const { error: deleteError } = await supabase
          .from('stories')
          .delete()
          .eq('id', item.story_id)

        if (deleteError) {
          console.warn('Story delete failed after approval:', deleteError.message)
        }
      }

      setMessage('Delete request processed successfully')
      await fetchData()
    } catch (requestError) {
      console.error('handleDeleteRequest error:', requestError)
      setError(requestError.message || 'Failed to process delete request')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <div>
        <h1 className="title">Admin dashboard</h1>
        <p className="muted">Full story moderation and management.</p>
      </div>

      {error && <div className="notice error">Error: {error}</div>}
      {message && <div className="notice success">{message}</div>}

      <div className="stats">
        <div className="stat-box">
          <div className="muted">Total stories</div>
          <h2>{stats.totalStories}</h2>
        </div>
        <div className="stat-box">
          <div className="muted">Published</div>
          <h2>{stats.publishedStories}</h2>
        </div>
        <div className="stat-box">
          <div className="muted">Total views</div>
          <h2>{stats.totalViews}</h2>
        </div>
        <div className="stat-box">
          <div className="muted">Pending deletes</div>
          <h2>{stats.pendingDeletes}</h2>
        </div>
      </div>

      <div className="card">
        <h2>All stories</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story.id}>
                <td>{story.title}</td>
                <td>{story.author_name || 'Unknown'}</td>
                <td>
                  <span className="badge">{story.status}</span>
                </td>
                <td>{story.publish_at ? new Date(story.publish_at).toLocaleString() : '-'}</td>
                <td>
                  <div className="row gap-sm">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStory(story.id, 'published')}
                      disabled={isUpdating}
                    >
                      Publish
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => updateStory(story.id, 'in_review')}
                      disabled={isUpdating}
                    >
                      Keep in loop
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => scheduleStory(story.id)}
                      disabled={isUpdating}
                    >
                      Schedule
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => updateStory(story.id, 'unpublished')}
                      disabled={isUpdating}
                    >
                      Unpublish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No stories.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Delete requests</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Story</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deleteRequests.map((item) => (
              <tr key={item.id}>
                <td>{item.stories?.title || 'Unknown'}</td>
                <td>{item.reason}</td>
                <td>
                  <span className="badge">{item.status}</span>
                </td>
                <td>
                  {item.status === 'pending' ? (
                    <div className="row gap-sm">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDeleteRequest(item, 'approved')}
                        disabled={isUpdating}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteRequest(item, 'rejected')}
                        disabled={isUpdating}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="muted small">Complete</span>
                  )}
                </td>
              </tr>
            ))}
            {deleteRequests.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No delete requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}