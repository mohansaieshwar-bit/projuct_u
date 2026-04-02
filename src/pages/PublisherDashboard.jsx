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
    try {
      const [{ data: storiesData }, { data: requestsData }] = await Promise.all([
        supabase
          .from('stories')
          .select('id, title, status, publish_at, created_at')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('delete_requests')
          .select(`
            *,
            stories!delete_requests_story_id_fkey (
              title
            )
          `)
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
      ])
      setStories(storiesData || [])
      setRequests(requestsData || [])
    } catch (error) {
      console.error('fetchData error:', error)
      setMessage('Error loading data')
    }
  }

  async function changeStatus(id, status) {
    try {
      const payload = { status }
      const { error } = await supabase
        .from('stories')
        .update(payload)
        .eq('id', id)
        .eq('author_id', user.id)

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Status updated successfully.')
        setTimeout(fetchData, 500)
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  async function requestDelete(storyId) {
    const reason = prompt('Write delete reason:')
    if (!reason?.trim()) return
    
    try {
      const { error } = await supabase.from('delete_requests').insert({
        story_id: storyId,
        requested_by: user.id,
        reason: reason.trim()
      })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Delete request sent to admin.')
        setTimeout(fetchData, 500)
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <div className="row between center">
        <div>
          <h1 className="title">Publisher dashboard</h1>
          <p className="muted">Manage your stories and request deletes. Submit drafts for admin review.</p>
        </div>
        <Link className="btn btn-primary" to="/publisher/stories/new">+ Create story</Link>
      </div>
      
      {message && (
        <div className={`notice ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <h2>Your stories</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story.id}>
                <td>{story.title}</td>
                <td>
                  <span className={`badge ${
                    story.status === 'published' ? 'success' : 
                    story.status === 'pending' ? 'warning' : 
                    story.status === 'draft' ? 'default' : 'error'
                  }`}>
                    {story.status}
                  </span>
                </td>
                <td>{new Date(story.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="row gap-sm">
                    <Link className="btn btn-secondary btn-sm" to={`/publisher/stories/${story.id}/edit`}>Edit</Link>
                    {story.status === 'draft' && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => changeStatus(story.id, 'pending')}
                      >
                        Submit for review
                      </button>
                    )}
                    {story.status === 'pending' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => changeStatus(story.id, 'draft')}
                      >
                        Back to draft
                      </button>
                    )}
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => requestDelete(story.id)}
                    >
                      Request delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No stories yet. <Link to="/publisher/stories/new">Create one</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Your delete requests</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Story</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.stories?.title || 'Unknown story'}</td>
                <td>{request.reason}</td>
                <td><span className="badge">{request.status}</span></td>
                <td>{new Date(request.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">No delete requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

