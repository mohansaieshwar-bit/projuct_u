import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function PublisherDashboard() {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    const [{ data: storiesData }, { data: requestsData }] = await Promise.all([
      supabase.from('stories').select('*').order('created_at', { ascending: false }),
      supabase.from('delete_requests').select('*, stories(title)').order('created_at', { ascending: false }),
    ])
    setStories(storiesData || [])
    setRequests(requestsData || [])
  }

  async function changeStatus(id, status) {
    const payload = { status }
    if (status === 'pending') payload.publish_at = null
    const { error } = await supabase.from('stories').update(payload).eq('id', id)
    if (!error) {
      setMessage('Story updated.')
      fetchData()
    }
  }

  async function requestDelete(storyId) {
    const reason = prompt('Write delete reason')
    if (!reason) return
    const { error } = await supabase.from('delete_requests').insert({ story_id: storyId, reason })
    if (!error) {
      setMessage('Delete request sent to admin.')
      fetchData()
    }
  }

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="row between center">
        <div>
          <h1 className="title">Publisher dashboard</h1>
          <p className="muted">You can see if your story is published or not, and request delete.</p>
        </div>
        <Link className="btn btn-primary" to="/publisher/stories/new">Create story</Link>
      </div>
      {message && <div className="notice success">{message}</div>}

      <div className="card">
        <h2>Your stories</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Publish date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story.id}>
                <td>{story.title}</td>
                <td><span className="badge">{story.status}</span></td>
                <td>{story.publish_at ? new Date(story.publish_at).toLocaleString() : '-'}</td>
                <td>
                  <div className="actions">
                    <Link className="btn btn-secondary" to={`/publisher/stories/${story.id}/edit`}>Edit</Link>
                    {story.status === 'draft' && (
                      <button className="btn btn-primary" onClick={() => changeStatus(story.id, 'pending')}>Submit</button>
                    )}
                    <button className="btn btn-danger" onClick={() => requestDelete(story.id)}>Request delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr><td colSpan="4">No stories yet.</td></tr>
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
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((item) => (
              <tr key={item.id}>
                <td>{item.stories?.title || 'Story'}</td>
                <td>{item.reason}</td>
                <td><span className="badge">{item.status}</span></td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan="4">No delete requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
