import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'

/**
 * ReportButton - allows users to report threads or replies.
 * Props:
 *  - type: 'thread' | 'reply'
 *  - targetId: the thread/reply ID
 *  - communityId: community ID
 */
const ReportButton = ({ type, targetId, communityId }) => {
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const reasons = [
    'Spam or advertising',
    'Offensive or hateful content',
    'Scam or fraud',
    'Doxxing or personal info',
    'Off-topic',
    'Other',
  ]

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE_URL}/communities/${communityId}/report`, {
        type,
        targetId,
        reason,
      })
      setDone(true)
      setTimeout(() => {
        setShowForm(false)
        setDone(false)
        setReason('')
      }, 2000)
    } catch {
      // Still show success to prevent report abuse detection
      setDone(true)
      setTimeout(() => {
        setShowForm(false)
        setDone(false)
        setReason('')
      }, 2000)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return <span className="report-done">Reported</span>
  }

  return (
    <span className="report-wrapper">
      <button
        className="report-btn"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowForm(!showForm)
        }}
        title={`Report this ${type}`}
      >
        Report
      </button>
      {showForm && (
        <div className="report-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="report-header">Report {type}</div>
          {reasons.map((r) => (
            <label key={r} className={`report-option ${reason === r ? 'selected' : ''}`}>
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {r}
            </label>
          ))}
          <div className="report-actions">
            <button
              className="report-submit"
              onClick={handleSubmit}
              disabled={!reason || submitting}
            >
              {submitting ? 'Sending...' : 'Submit Report'}
            </button>
            <button className="report-cancel" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </span>
  )
}

export default ReportButton
