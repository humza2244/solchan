import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'

const REPORT_REASONS = [
  'Spam / Advertising',
  'Off-topic / Wrong community',
  'Illegal content',
  'Harassment / Threats',
  'Impersonation',
  'Other',
]

const ReportModal = ({ contentType, contentId, communityId, onClose }) => {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalReason = reason === 'Other' ? customReason.trim() : reason
    if (!finalReason) {
      setError('Please select a reason')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await axios.post(`${API_BASE_URL}/mod/report`, {
        contentType,
        contentId,
        communityId,
        reason: finalReason,
      })
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}></button>
        
        {success ? (
          <div className="report-success">
            <h3>✓ Report Submitted</h3>
            <p>A moderator will review your report.</p>
          </div>
        ) : (
          <>
            <h3>Report {contentType === 'thread' ? 'Thread' : 'Reply'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="report-reasons">
                {REPORT_REASONS.map(r => (
                  <label key={r} className={`report-reason-option ${reason === r ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
              
              {reason === 'Other' && (
                <textarea
                  className="report-custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe the issue..."
                  maxLength={500}
                  rows={3}
                />
              )}

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="report-submit-btn" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ReportModal
