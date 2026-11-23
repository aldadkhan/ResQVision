import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, HeartHandshake, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from './api';

export default function RescueTeamApplications() {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/dashboard/rescue-teams');
      setTeams(data.teams);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load rescue-team applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const decide = async (team, action) => {
    setBusyId(team._id);
    setError('');
    setMessage('');
    try {
      await api.patch(`/dashboard/rescue-teams/${team._id}/${action}`);
      setTeams(current => current.filter(item => item._id !== team._id));
      setMessage(action === 'approve' ? `${team.name} is approved. Ask them to sign in again to refresh rescue-team access.` : `${team.name}'s rescue-team request was declined.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update this application.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="team-page">
      <header className="team-top">
        <Link to="/dashboard" className="team-back"><ArrowLeft size={17} /> Back to dashboard</Link>
        <span><ShieldCheck size={16} /> ADMIN REVIEW</span>
      </header>
      <section className="team-content">
        <div className="team-heading">
          <div className="team-icon"><HeartHandshake size={24} /></div>
          <div>
            <div className="section-tag">GROW THE RESCUE NETWORK</div>
            <h1>Rescue team applications</h1>
            <p>Review and approve teams before they can access community reports.</p>
          </div>
          <button className="icon-btn" onClick={loadTeams} disabled={loading} title="Refresh applications"><RefreshCw size={17} /></button>
        </div>
        {error && <div className="team-alert team-alert-error">{error}</div>}
        {message && <div className="team-alert"><CheckCircle2 size={17} />{message}</div>}
        <section className="team-panel">
          <div className="team-panel-head">
            <div><h2>Awaiting review</h2><p>{teams.length} pending {teams.length === 1 ? 'application' : 'applications'}</p></div>
            <span className="team-count"><Clock3 size={15} /> {teams.length} PENDING</span>
          </div>
          {loading ? <div className="team-empty">Loading applications…</div> : teams.length ? (
            <div className="team-list">
              {teams.map(team => (
                <article className="team-row" key={team._id}>
                  <div className="avatar">{team.name?.[0]?.toUpperCase() || 'R'}</div>
                  <div className="team-details">
                    <b>{team.name}</b>
                    <span>{team.email}</span>
                    <small>Applied {new Date(team.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className="team-actions">
                    <button className="team-decline" disabled={busyId === team._id} onClick={() => decide(team, 'decline')}><X size={15} /> Decline</button>
                    <button className="primary" disabled={busyId === team._id} onClick={() => decide(team, 'approve')}><CheckCircle2 size={16} /> Approve</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="team-empty"><HeartHandshake size={30} /><b>All caught up</b><span>New rescue-team requests will appear here.</span></div>}
        </section>
        <div className="team-footnote"><ShieldCheck size={16} /> Approved teams can review all reports and update rescue-case status. Community accounts can only view their own reports.</div>
      </section>
    </main>
  );
}
