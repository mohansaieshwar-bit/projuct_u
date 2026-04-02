import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [stories, setStories] = useState([])
  const [deleteRequests, setDeleteRequests] = useState([])
  const [stats, setStats] = useState({ totalStories: 0, publishedStories: 0, totalViews: 0, pendingDeletes: 0 })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [storiesRes, requestsRes, viewsRes] = await Promise.all([
      supabase.from('stories_admin').select('*').order('created_at', { ascending: false }),
      supabase.from('delete_requests_admin').select('*, stories(title)').order('created_at', { ascending: false }),
      supabase.from('story_views').select('id'),
    ])

    const storyRows = storiesRes.data || []
    const requestRows = requestsRes.data || []
    setStories(storyRows)
    setDeleteRequests(requestRows)
    setStats({
      totalStories: storyRows.length,
      publishedStories: storyRows.filter((x) => x.status === 'published').length,
      totalViews: viewsRes.data?.length || 0,
      pendingDeletes: requestRows.filter((x) => x.status === 'pending').length,
    })
  }

  async function updateStory(story, nextStatus) {
    let publishAt = story.publish_at
    let publishedAt = story.published_at
    let unpublishedAt = story.unpublished_at

    if (nextStatus === 'published') {
      publishedAt = new Date().toISOString()
      publishAt = publishAt || publishedAt
      unpublishedAt = null
    }
    if (nextStatus === 'unpublished') {
      unpublishedAt = new Date().toISOString()
    }

    const { error } = await supabase
      .from('stories')
      .update({ status: nextStatus, publish_at: publishAt, published_at: publishedAt, unpublished_at: unpublishedAt })
      .eq('id', story.id)

    if (!error) {
      await supabase.from('story_logs').insert({ story_id: story.id, action: `changed to ${nextStatus}`, old_status: story.status, new_status: nextStatus })
      setMessage('Story updated.')
      fetchData()
    }
  }

  async function scheduleStory(storyId) {
    const input = prompt('Enter publish date and time like 2026-04-03T15:30:00')
    if (!input) return
    const iso = new Date(input).toISOString()
    const { error } = await supabase.from('stories').update({ status: 'scheduled', publish_at: iso }).eq('id', storyId)
    if (!error) {
      setMessage('Story scheduled.')
      fetchData()
    }
  }

  async function handleDeleteRequest(item, status) {
    const { error } = await supabase.from('delete_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', item.id)
    if (!error && status === 'approved') {
      await supabase.from('stories').delete().eq('id', item.story_id)
    }
    if (!error) {
      setMessage('Delete request updated.')
      fetchData()
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div>
        <h1 className="title">Admin dashboard</h1>
        <p className="muted">See insights, publish or unpublish stories, keep stories in loop, schedule posts, and manage delete requests.</p>
      </div>
      {message && <div className="notice success">{message}</div>}

      <div className="stats">
        <div className="stat-box"><div className="muted">Total stories</div><h2>{stats.totalStories}</h2></div>
        <div className="stat-box"><div className="muted">Published stories</div><h2>{stats.publishedStories}</h2></div>
        <div className="stat-box"><div className="muted">Total visits</div><h2>{stats.totalViews}</h2></div>
        <div className="stat-box"><div className="muted">Pending deletes</div><h2>{stats.pendingDeletes}</h2></div>
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
                <td><span className="badge">{story.status}</span></td>
                <td>{story.publish_at ? new Date(story.publish_at).toLocaleString() : '-'}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-primary" onClick={() => updateStory(story, 'published')}>Publish</button>
                    <button className="btn btn-secondary" onClick={() => updateStory(story, 'in_review')}>Keep in loop</button>
                    <button className="btn btn-warning" onClick={() => scheduleStory(story.id)}>Set date</button>
                    <button className="btn btn-danger" onClick={() => updateStory(story, 'unpublished')}>Unpublish</button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && <tr><td colSpan="5">No stories found.</td></tr>}
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
                <td>{item.stories?.title || 'Story'}</td>
                <td>{item.reason}</td>
                <td><span className="badge">{item.status}</span></td>
                <td>
                  {item.status === 'pending' ? (
                    <div className="actions">
                      <button className="btn btn-primary" onClick={() => handleDeleteRequest(item, 'approved')}>Approve</button>
                      <button className="btn btn-secondary" onClick={() => handleDeleteRequest(item, 'rejected')}>Reject</button>
                    </div>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {deleteRequests.length === 0 && <tr><td colSpan="4">No delete requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
