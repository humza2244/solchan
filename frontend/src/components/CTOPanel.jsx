import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const INACTIVE_HOURS = 2

/**
 * CTOPanel -- shows CTO eligibility info, request form, and vote UI.
 * CTO requires 35% of community members to vote in favor.
 * Props:
 *  - community: community object with { id, creatorId, lastMessageAt, ctoStatus }
 *  - onCTOApproved: callback when CTO is approved (refetch community)
 */
const CTOPanel = ({ community, onCTOApproved }) => {
  const { isLoggedIn, user, getToken, displayName } = useAuth()
  const [requests, setRequests] = useState([])
  const [threshold, setThreshold] = useState(2)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Check eligibility
  const noCreator = !community.creatorId
  // Use lastMessageAt if it exists, otherwise fall back to createdAt
  // This prevents brand-new communities from being immediately CTO-eligible
  const activityRef = community.lastMessageAt || community.createdAt
  const hoursSinceLast = activityRef
    ? (Date.now() - new Date(activityRef).getTime()) / (1000 * 60 * 60)
    : 0
  const isInactive = hoursSinceLast >= INACTIVE_HOURS
  // Only eligible if BOTH no creator AND inactive (or truly no creator and no createdAt)
  const isEligible = (noCreator && isInactive) || (!community.creatorId && !community.createdAt)

  const isCreator = user && community.creatorId === user.uid

  const eligibilityReason = noCreator
    ? 'This community has no creator -- anyone can claim it.'
    : isInactive
    ? `No activity for ${Math.floor(hoursSinceLast)} hours -- team appears inactive.`
    : null

  useEffect(() => {
    if (!isOpen) return
    fetchRequests()
  }, [community.id, isOpen])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/communities/${community.id}/cto`)
      // Backend returns { requests, threshold, memberCount }
      if (res.data.requests) {
        setRequests(res.data.requests)
        setThreshold(res.data.threshold || 2)
        setMemberCount(res.data.memberCount || 0)
      } else {
        // Fallback for old format (plain array)
        setRequests(Array.isArray(res.data) ? res.data : [])
      }
    } catch (e) {
      console.error('Error fetching CTO requests:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(''), 5000) }

  const handleSubmitCTO = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) return
    setSubmitting(true)
    try {
      const token = await getToken()
      await axios.post(`${API_BASE_URL}/communities/${community.id}/cto`,
        { reason: reason.trim() || 'Team appears inactive' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMsg('CTO request submitted! Community members can now vote.')
      setReason('')
      setShowForm(false)
      fetchRequests()
    } catch (e) {
      showErr(e.response?.data?.error || 'Failed to submit CTO request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (requestId, vote) => {
    if (!isLoggedIn) return showErr('You must be logged in to vote')
    setVoting(requestId)
    try {
      const token = await getToken()
      const res = await axios.post(
        `${API_BASE_URL}/communities/${community.id}/cto/${requestId}/vote`,
        { vote },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.status === 'approved') {
        showMsg('CTO approved! The community has a new creator.')
        onCTOApproved?.()
      } else {
        const t = res.data.threshold || threshold
        showMsg(`Vote recorded! ${res.data.upvotes || 0}/${t} votes needed (35% of members).`)
        fetchRequests()
      }
    } catch (e) {
      showErr(e.response?.data?.error || 'Failed to vote')
    } finally {
      setVoting(null)
    }
  }

  if (!isEligible) return null

  return (
    <div className="cto-panel-wrapper">
      <button
        className={`cto-panel-toggle ${community.ctoStatus === 'pending' ? 'cto-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
         CTO Available {requests.filter(r => r.status === 'pending').length > 0 && `(${requests.filter(r => r.status === 'pending').length} pending)`}
      </button>

      {isOpen && (
        <div className="cto-panel">
          <div className="cto-eligibility-badge">
            <span className="cto-badge-icon"></span>
            <span>{eligibilityReason}</span>
          </div>

          {memberCount > 0 && (
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8, padding: '0 4px' }}>
              Approval requires {threshold} votes (35% of {memberCount} members)
            </div>
          )}

          {msg && <div className="mod-success">{msg}</div>}
          {err && <div className="mod-error">{err}</div>}

          {/* Submit CTO request */}
          {isLoggedIn && !isCreator && (
            <div className="cto-submit-section">
              {!showForm ? (
                <button className="cto-request-btn" onClick={() => setShowForm(true)}>
                   Request Community Takeover (CTO)
                </button>
              ) : (
                <form onSubmit={handleSubmitCTO} className="cto-form">
                  <p className="cto-form-label">
                    Why should you lead this community? (Shown to voters)
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. I'm an active community member and will keep this place running..."
                    disabled={submitting}
                    className="cto-reason-input"
                  />
                  <div className="cto-form-actions">
                    <button type="submit" disabled={submitting} className="cto-submit-btn">
                      {submitting ? 'Submitting...' : 'Submit CTO Request'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="cto-cancel-btn">
                      Cancel
                    </button>
                  </div>
                  <small>Needs {threshold} upvotes (35% of community members) to be approved.</small>
                </form>
              )}
            </div>
          )}

          {!isLoggedIn && (
            <p className="cto-login-note">
              <a href="/login">Log in</a> to submit or vote on a CTO request.
            </p>
          )}

          {/* Existing CTO requests */}
          <div className="cto-requests">
            <h4>CTO Requests</h4>
            {loading ? (
              <p className="mod-loading">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="mod-empty">No CTO requests yet.</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className={`cto-request-item ${req.status}`}>
                  <div className="cto-request-header">
                    <span className="cto-requester"> {req.requesterUsername}</span>
                    <span className={`cto-status-badge ${req.status}`}>
                      {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                  <p className="cto-reason">"{req.reason}"</p>
                  <div className="cto-vote-row">
                    <span className="cto-votes">
                       {req.upvotes || 0} / {threshold} needed
                    </span>
                    <span className="cto-votes-down"> {req.downvotes || 0} against</span>
                    {req.status === 'pending' && isLoggedIn && user?.uid !== req.requesterId && (
                      <div className="cto-vote-btns">
                        <button
                          className="cto-vote-up"
                          onClick={() => handleVote(req.id, 'up')}
                          disabled={voting === req.id}
                          title="Support this CTO request"
                        >
                          {voting === req.id ? '...' : 'Support'}
                        </button>
                        <button
                          className="cto-vote-down-btn"
                          onClick={() => handleVote(req.id, 'down')}
                          disabled={voting === req.id}
                          title="Oppose this CTO request"
                        >
                          Oppose
                        </button>
                      </div>
                    )}
                  </div>
                  {req.createdAt && (
                    <span className="cto-date">{new Date(req.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CTOPanel
