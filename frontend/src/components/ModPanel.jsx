import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const ModPanel = ({ communityId, community, onContentDeleted }) => {
  const { user, getToken } = useAuth()
  const [reports, setReports] = useState([])
  const [moderators, setModerators] = useState([])
  const [modDetails, setModDetails] = useState([])
  const [creatorUsername, setCreatorUsername] = useState(null)
  const [bans, setBans] = useState([])
  const [warnings, setWarnings] = useState([])
  const [newModUsername, setNewModUsername] = useState('')
  const [banUsername, setBanUsername] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('')
  const [warnUsername, setWarnUsername] = useState('')
  const [warnReason, setWarnReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('reports')
  const [isOpen, setIsOpen] = useState(false)

  const isCreator = user && community?.creatorId === user.uid
  const isMod = user && (isCreator || (community?.moderators || []).includes(user.uid))

  useEffect(() => {
    if (!isMod || !isOpen) return

    const loadData = async () => {
      setLoading(true)
      try {
        const token = await getToken()
        const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        const [reportsRes, modsRes, bansRes, warningsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/mod/${communityId}/reports`, authHeaders),
          axios.get(`${API_BASE_URL}/mod/${communityId}/mods`),
          axios.get(`${API_BASE_URL}/mod/${communityId}/bans`, authHeaders),
          axios.get(`${API_BASE_URL}/mod/${communityId}/warnings`, authHeaders),
        ])

        if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data)
        if (modsRes.status === 'fulfilled') {
          setModerators(modsRes.value.data.moderators || [])
          setModDetails(modsRes.value.data.moderatorDetails || [])
          setCreatorUsername(modsRes.value.data.creatorUsername || null)
        }
        if (bansRes.status === 'fulfilled') setBans(bansRes.value.data || [])
        if (warningsRes.status === 'fulfilled') setWarnings(warningsRes.value.data || [])
      } catch (err) {
        console.error('Error loading mod data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [communityId, isMod, isOpen])

  if (!isMod) return null

  const showMsg = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }
  const showErr = (msg) => {
    setError(msg)
    setTimeout(() => setError(''), 3000)
  }

  const handleResolveReport = async (reportId, action, contentType, contentId) => {
    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      if (action === 'resolved') {
        const endpoint = contentType === 'thread' ? 'thread' : 'reply'
        await axios.delete(`${API_BASE_URL}/mod/${endpoint}/${contentId}?communityId=${communityId}`, authHeaders)
        onContentDeleted?.()
      }

      await axios.post(`${API_BASE_URL}/mod/resolve/${reportId}`, { action, communityId }, authHeaders)
      setReports(prev => prev.filter(r => r.id !== reportId))
      showMsg(action === 'resolved' ? 'Content deleted & report resolved' : 'Report dismissed')
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to resolve report')
    }
  }

  const handleAddMod = async (e) => {
    e.preventDefault()
    if (!newModUsername.trim()) return

    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.post(`${API_BASE_URL}/mod/${communityId}/mods`, { username: newModUsername.trim() }, authHeaders)
      showMsg(`${newModUsername} added as moderator`)
      setNewModUsername('')
      // Refresh mods list
      const modsRes = await axios.get(`${API_BASE_URL}/mod/${communityId}/mods`)
      setModerators(modsRes.data.moderators || [])
      setModDetails(modsRes.data.moderatorDetails || [])
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to add moderator')
    }
  }

  const handleRemoveMod = async (userId) => {
    if (!confirm('Remove this moderator?')) return
    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.delete(`${API_BASE_URL}/mod/${communityId}/mods/${userId}`, authHeaders)
      setModerators(prev => prev.filter(m => m !== userId))
      setModDetails(prev => prev.filter(m => m.uid !== userId))
      showMsg('Moderator removed')
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to remove moderator')
    }
  }

  const handleBanUser = async (e) => {
    e.preventDefault()
    if (!banUsername.trim()) return

    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.post(`${API_BASE_URL}/mod/${communityId}/ban`, {
        username: banUsername.trim(),
        reason: banReason.trim() || 'Rule violation',
        duration: banDuration ? Number(banDuration) : null,
      }, authHeaders)
      showMsg(`${banUsername} has been banned`)
      setBanUsername('')
      setBanReason('')
      setBanDuration('')
      // Refresh bans list
      const bansRes = await axios.get(`${API_BASE_URL}/mod/${communityId}/bans`, authHeaders)
      setBans(bansRes.data || [])
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to ban user')
    }
  }

  const handleWarnUser = async (e) => {
    e.preventDefault()
    if (!warnUsername.trim()) return
    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.post(`${API_BASE_URL}/mod/${communityId}/warn`, {
        username: warnUsername.trim(),
        reason: warnReason.trim() || 'Rule violation',
      }, authHeaders)
      showMsg(` Warning issued to ${warnUsername}`)
      setWarnUsername('')
      setWarnReason('')
      // Refresh warnings
      const token2 = await getToken()
      const wRes = await axios.get(`${API_BASE_URL}/mod/${communityId}/warnings`,
        token2 ? { headers: { Authorization: `Bearer ${token2}` } } : {})
      setWarnings(wRes.data || [])
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to warn user')
    }
  }

  const handleUnban = async (banId, username) => {
    if (!confirm(`Unban ${username}?`)) return
    try {
      const token = await getToken()
      const authHeaders = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.delete(`${API_BASE_URL}/mod/${communityId}/ban/${banId}`, authHeaders)
      setBans(prev => prev.filter(b => b.id !== banId))
      showMsg(`${username} unbanned`)
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to unban')
    }
  }

  const formatBanExpiry = (expiresAt) => {
    if (!expiresAt) return 'Permanent'
    const d = new Date(expiresAt)
    const now = new Date()
    const hoursLeft = Math.max(0, Math.round((d - now) / (1000 * 60 * 60)))
    if (hoursLeft <= 0) return 'Expired'
    if (hoursLeft < 24) return `${hoursLeft}h left`
    return `${Math.round(hoursLeft / 24)}d left`
  }

  return (
    <div className="mod-panel-wrapper">
      <button className="mod-panel-toggle" onClick={() => setIsOpen(!isOpen)}>
         Mod Panel {reports.length > 0 && `(${reports.length})`}
      </button>

      {isOpen && (
        <div className="mod-panel">
          <div className="mod-panel-header">
            <div className="mod-panel-tabs">
              <button
                className={`mod-tab ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                Reports {reports.length > 0 && <span className="report-badge">{reports.length}</span>}
              </button>
              <button
                className={`mod-tab ${activeTab === 'bans' ? 'active' : ''}`}
                onClick={() => setActiveTab('bans')}
              >
                Bans {bans.length > 0 && <span className="report-badge">{bans.length}</span>}
              </button>
              <button
                className={`mod-tab ${activeTab === 'warnings' ? 'active' : ''}`}
                onClick={() => setActiveTab('warnings')}
              >
                Warnings {warnings.length > 0 && <span className="report-badge">{warnings.length}</span>}
              </button>
              {isCreator && (
                <button
                  className={`mod-tab ${activeTab === 'mods' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mods')}
                >
                  Moderators
                </button>
              )}
            </div>
          </div>

          {message && <div className="mod-success">{message}</div>}
          {error && <div className="mod-error">{error}</div>}

          {/* ====== REPORTS TAB ====== */}
          {activeTab === 'reports' && (
            <div className="mod-reports">
              {loading ? (
                <p className="mod-loading">Loading reports...</p>
              ) : reports.length === 0 ? (
                <p className="mod-empty">No pending reports OK</p>
              ) : (
                reports.map(report => (
                  <div key={report.id} className="report-item">
                    <div className="report-info">
                      <span className="report-type">[{report.contentType}]</span>
                      <span className="report-reason">{report.reason}</span>
                      <span className="report-date">
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="report-actions">
                      <button
                        className="mod-btn mod-btn-delete"
                        onClick={() => handleResolveReport(report.id, 'resolved', report.contentType, report.contentId)}
                      >
                        Delete Content
                      </button>
                      <button
                        className="mod-btn mod-btn-dismiss"
                        onClick={() => handleResolveReport(report.id, 'dismissed')}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ====== BANS TAB ====== */}
          {activeTab === 'bans' && (
            <div className="mod-bans">
              <form onSubmit={handleBanUser} className="ban-form">
                <div className="ban-form-row">
                  <input
                    type="text"
                    value={banUsername}
                    onChange={(e) => setBanUsername(e.target.value)}
                    placeholder="Username to ban..."
                    className="mod-input"
                    required
                  />
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="mod-input ban-duration-select"
                  >
                    <option value="">Permanent</option>
                    <option value="1">1 hour</option>
                    <option value="6">6 hours</option>
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">1 week</option>
                    <option value="720">30 days</option>
                  </select>
                </div>
                <div className="ban-form-row">
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Reason for ban..."
                    className="mod-input ban-reason-input"
                  />
                  <button type="submit" className="mod-btn mod-btn-ban"> Ban User</button>
                </div>
              </form>

              <div className="bans-list">
                <h4>Active Bans ({bans.length})</h4>
                {bans.length === 0 ? (
                  <p className="mod-empty">No active bans</p>
                ) : (
                  bans.map(ban => (
                    <div key={ban.id} className="ban-item">
                      <div className="ban-info">
                        <span className="ban-username"> {ban.username}</span>
                        <span className="ban-reason">— {ban.reason}</span>
                        <span className="ban-expiry">{formatBanExpiry(ban.expiresAt)}</span>
                      </div>
                      <button
                        className="mod-btn mod-btn-unban"
                        onClick={() => handleUnban(ban.id, ban.username)}
                      >
                        Unban
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ====== WARNINGS TAB ====== */}
          {activeTab === 'warnings' && (
            <div className="mod-bans">
              <form onSubmit={handleWarnUser} className="ban-form">
                <div className="ban-form-row">
                  <input
                    type="text"
                    value={warnUsername}
                    onChange={(e) => setWarnUsername(e.target.value)}
                    placeholder="Username to warn..."
                    className="mod-input"
                    required
                  />
                </div>
                <div className="ban-form-row">
                  <input
                    type="text"
                    value={warnReason}
                    onChange={(e) => setWarnReason(e.target.value)}
                    placeholder="Reason for warning..."
                    className="mod-input ban-reason-input"
                  />
                  <button type="submit" className="mod-btn mod-btn-warn"> Warn User</button>
                </div>
              </form>

              <div className="bans-list">
                <h4>Issued Warnings ({warnings.length})</h4>
                {warnings.length === 0 ? (
                  <p className="mod-empty">No warnings issued yet</p>
                ) : (
                  warnings.map(w => (
                    <div key={w.id} className="ban-item warning-item">
                      <div className="ban-info">
                        <span className="ban-username"> {w.username}</span>
                        <span className="ban-reason">— {w.reason}</span>
                        <span className="ban-expiry" style={{ background: '#e8a000' }}>
                          {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ====== MODS TAB ====== */}
          {activeTab === 'mods' && isCreator && (
            <div className="mod-management">
              <div className="creator-info">
                <span className="creator-label"> Creator:</span>
                <span className="creator-name">{creatorUsername || 'Unknown'}</span>
              </div>

              <form onSubmit={handleAddMod} className="add-mod-form">
                <input
                  type="text"
                  value={newModUsername}
                  onChange={(e) => setNewModUsername(e.target.value)}
                  placeholder="Username to add as mod..."
                  className="mod-input"
                />
                <button type="submit" className="mod-btn mod-btn-add">Add Mod</button>
              </form>
              
              <div className="mods-list">
                <h4>Current Moderators ({modDetails.length})</h4>
                {modDetails.length === 0 ? (
                  <p className="mod-empty">No moderators yet</p>
                ) : (
                  modDetails.map((mod) => (
                    <div key={mod.uid} className="mod-item">
                      <span className="mod-username"> {mod.username}</span>
                      <button
                        className="mod-btn mod-btn-remove"
                        onClick={() => handleRemoveMod(mod.uid)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ModPanel
