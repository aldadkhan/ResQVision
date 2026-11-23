import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Check, ChevronDown, ClipboardList,
  Clock3, HeartHandshake, MapPin, PawPrint, Plus, Search, ShieldCheck,
  Users, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from './api';
import useRescueReportStream from './useRescueReportStream';

const STORAGE_KEY = 'resqvision_demo_ngo_cases';
const teams = ['Asha Care Team', 'Green Paws Unit', 'Hope Rescue Crew', 'Wildlife Response'];
const statuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'rescued', label: 'Rescued' },
  { value: 'closed', label: 'Closed' }
];
const now = Date.now();
const seedCases = [
  {
    id: 'demo-1', animal: 'Dog', title: 'Injured dog near the bus stand',
    description: 'A limping dog is resting beside the north entrance. A local shopkeeper is keeping an eye on it.',
    location: 'Central Bus Stand, Ward 4', priority: 'Urgent', status: 'assigned',
    assignedTo: 'Asha Care Team', createdAt: new Date(now - 1000 * 60 * 38).toISOString(),
    updates: [{ id: 'u1', message: 'Team dispatched; caller says the dog is calm and staying in the shade.', createdAt: new Date(now - 1000 * 60 * 16).toISOString(), by: 'NGO coordinator' }]
  },
  {
    id: 'demo-2', animal: 'Cat', title: 'Stray cat trapped in a drain',
    description: 'A cat can be heard inside the covered drain. The opening is near the community garden gate.',
    location: 'Community Garden, East Gate', priority: 'Urgent', status: 'pending',
    assignedTo: '', createdAt: new Date(now - 1000 * 60 * 52).toISOString(),
    updates: [{ id: 'u2', message: 'Waiting for a nearby rescue team to confirm availability.', createdAt: new Date(now - 1000 * 60 * 34).toISOString(), by: 'NGO coordinator' }]
  },
  {
    id: 'demo-3', animal: 'Bird', title: 'Young kite with a damaged wing',
    description: 'Bird is on the ground near the school wall. Please send a trained wildlife handler.',
    location: 'Lakeview Public School', priority: 'Normal', status: 'assigned',
    assignedTo: 'Wildlife Response', createdAt: new Date(now - 1000 * 60 * 95).toISOString(),
    updates: [{ id: 'u3', message: 'Wildlife handler is travelling to the location. Do not handle the bird.', createdAt: new Date(now - 1000 * 60 * 42).toISOString(), by: 'NGO coordinator' }]
  },
  {
    id: 'demo-4', animal: 'Puppies', title: 'Litter needs a safe temporary shelter',
    description: 'Three puppies were found in heavy rain. The area is safe, but they need temporary shelter.',
    location: 'Mill Road, near the old post office', priority: 'Normal', status: 'rescued',
    assignedTo: 'Hope Rescue Crew', createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    updates: [
      { id: 'u4', message: 'Puppies are safe at the partner shelter. Intake team has been notified.', createdAt: new Date(now - 1000 * 60 * 28).toISOString(), by: 'NGO coordinator' },
      { id: 'u5', message: 'Shelter transfer completed.', createdAt: new Date(now - 1000 * 60 * 55).toISOString(), by: 'Hope Rescue Crew' }
    ]
  },
  {
    id: 'demo-5', animal: 'Cow', title: 'Cow wandering beside a busy road',
    description: 'A cow is close to moving traffic on the westbound road. Keep a safe distance.',
    location: 'Ring Road, West Junction', priority: 'Urgent', status: 'pending',
    assignedTo: '', createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
    updates: [{ id: 'u6', message: 'Caller alerted local traffic support. Rescue team assignment needed.', createdAt: new Date(now - 1000 * 60 * 8).toISOString(), by: 'NGO coordinator' }]
  },
  {
    id: 'demo-6', animal: 'Dog', title: 'Routine check requested for a street dog',
    description: 'A resident noticed the dog has not been eating. Requesting a welfare check.',
    location: 'Rose Street, Block B', priority: 'Low', status: 'closed',
    assignedTo: 'Green Paws Unit', createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    updates: [{ id: 'u7', message: 'Welfare check completed; dog is alert and the community caregiver has been informed.', createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(), by: 'Green Paws Unit' }]
  }
];

function readCases() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedCases;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedCases;
  } catch {
    return seedCases;
  }
}

function formatTime(value) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const fromApiStatus = status => ({
  submitted: 'pending',
  reviewing: 'pending',
  pending_rescue: 'pending',
  assigned: 'assigned',
  rescued: 'rescued',
  closed: 'closed'
}[status] || 'pending');
const toApiStatus = status => ({ pending: 'pending_rescue', assigned: 'assigned', rescued: 'rescued', closed: 'closed' }[status] || 'pending_rescue');

function fromApiReport(report) {
  return {
    id: `live-${report._id}`,
    reportId: report._id,
    source: 'live',
    reporterEmail: report.reporter?.email || '',
    animal: report.animalType || 'Animal',
    title: `${report.animalType || 'Animal'} rescue report`,
    description: report.description || '',
    location: report.location || 'Location not provided',
    priority: ['urgent', 'emergency'].includes(report.priority) ? 'Urgent' : report.priority === 'low' ? 'Low' : 'Normal',
    status: fromApiStatus(report.status),
    apiStatus: report.status,
    assignedTo: report.assignedTo || '',
    createdAt: report.createdAt,
    updatedAt: report.updatedAt || report.createdAt,
    updates: (report.rescueUpdates || []).slice().reverse().map(update => ({
      id: update._id || `${update.createdAt}-${update.message}`,
      message: update.message,
      createdAt: update.createdAt,
      by: update.by || 'Rescue team'
    }))
  };
}

function mergeLiveCases(current, incoming) {
  const merged = new Map(current.map(item => [item.id, item]));
  incoming.forEach(item => {
    const existing = merged.get(item.id);
    if (!existing || new Date(item.updatedAt) >= new Date(existing.updatedAt)) merged.set(item.id, item);
  });
  return [...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function DemoNgo({ user }) {
  const [cases, setCases] = useState(readCases);
  const [liveCases, setLiveCases] = useState([]);
  const [loadingLive, setLoadingLive] = useState(Boolean(user));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState({ status: 'pending', message: '' });
  const [newCase, setNewCase] = useState({ animal: 'Dog', title: '', description: '', location: '', priority: 'Normal' });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLiveCases([]);
      setLoadingLive(false);
      return () => { active = false; };
    }
    setLoadingLive(true);
    api.get('/reports')
      .then(({ data }) => {
        if (active) setLiveCases(current => mergeLiveCases(current, (data.reports || []).map(fromApiReport)));
      })
      .catch(error => {
        if (active) setNotice(error.response?.data?.message || 'Could not load reports from the API.');
      })
      .finally(() => {
        if (active) setLoadingLive(false);
      });
    return () => { active = false; };
  }, [user?.email, user?.role]);

  const syncLiveReports = async () => {
    try {
      const { data } = await api.get('/reports');
      setLiveCases(current => mergeLiveCases(current, (data.reports || []).map(fromApiReport)));
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not sync reports from the API.');
    }
  };
  useRescueReportStream(['admin', 'rescuer'].includes(user?.role), {
    onReport: report => setLiveCases(current => mergeLiveCases(current, [fromApiReport(report)])),
    onReady: syncLiveReports,
    onError: error => {
      console.error('NGO live report stream failed:', error);
      setNotice('Live report updates interrupted. Reconnecting…');
    }
  });

  const allCases = useMemo(() => [...liveCases, ...cases], [liveCases, cases]);
  const canManageLive = ['admin', 'rescuer'].includes(user?.role);

  const counts = useMemo(() => ({
    total: allCases.length,
    pending: allCases.filter(item => item.status === 'pending').length,
    assigned: allCases.filter(item => item.status === 'assigned').length,
    rescued: allCases.filter(item => item.status === 'rescued').length
  }), [allCases]);

  const visibleCases = useMemo(() => allCases.filter(item => {
    const matchesStatus = filter === 'all' || item.status === filter;
    const haystack = `${item.animal} ${item.title} ${item.description} ${item.location} ${item.assignedTo}`.toLowerCase();
    return matchesStatus && haystack.includes(query.trim().toLowerCase());
  }), [allCases, filter, query]);

  const addUpdate = (item, message, status = item.status, assignedTo = item.assignedTo) => ({
    ...item,
    status,
    assignedTo,
    updates: [{ id: `${Date.now()}-${Math.random()}`, message, createdAt: new Date().toISOString(), by: 'NGO coordinator' }, ...item.updates]
  });

  const updateLiveCase = async (item, { status = item.status, assignedTo = item.assignedTo, reportMessage } = {}) => {
    if (!canManageLive) {
      setNotice('Approved rescue-team access is needed to update real reports.');
      return;
    }
    try {
      const { data } = await api.patch(`/reports/${item.reportId}/status`, {
        status: toApiStatus(status),
        assignedTo,
        ...(reportMessage ? { reportMessage } : {})
      });
      setLiveCases(current => current.map(existing =>
        existing.id === item.id ? fromApiReport(data.report) : existing
      ));
      return true;
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not save this update to the API.');
      return false;
    }
  };

  const changeStatus = async (id, status) => {
    const item = allCases.find(entry => entry.id === id);
    if (!item) return;
    if (item.source === 'live') {
      if (await updateLiveCase(item, { status })) setNotice('Report status saved to the NGO workspace.');
      return;
    }
    setCases(current => current.map(item => item.id === id
      ? addUpdate(item, `Status changed to ${statuses.find(option => option.value === status)?.label || status}.`, status)
      : item));
    setNotice('Case status updated.');
  };

  const assignTeam = async (id, assignedTo) => {
    const item = allCases.find(entry => entry.id === id);
    if (!item) return;
    const status = ['rescued', 'closed'].includes(item.status)
      ? item.status
      : assignedTo ? 'assigned' : 'pending';
    if (item.source === 'live') {
      if (await updateLiveCase(item, { status, assignedTo })) {
        setNotice(assignedTo ? `Report assigned to ${assignedTo}.` : 'Report assignment removed.');
      }
      return;
    }
    setCases(current => current.map(item => {
      if (item.id !== id) return item;
      const message = assignedTo ? `Assigned to ${assignedTo}.` : 'Team assignment removed.';
      return addUpdate(item, message, status, assignedTo);
    }));
    setNotice(assignedTo ? `Case assigned to ${assignedTo}.` : 'Team assignment removed.');
  };

  const openReport = item => {
    setReport({ status: item.status, message: '' });
    setModal({ type: 'report', id: item.id });
  };

  const saveReport = async event => {
    event.preventDefault();
    const message = report.message.trim();
    if (!message) return;
    const item = allCases.find(entry => entry.id === modal.id);
    if (!item) return;
    if (item.source === 'live') {
      if (await updateLiveCase(item, { status: report.status, reportMessage: message })) {
        setModal(null);
        setNotice('Progress report saved to the NGO workspace.');
      }
      return;
    }
    setCases(current => current.map(item => item.id === modal.id
      ? addUpdate(item, message, report.status)
      : item));
    setModal(null);
    setNotice('Progress report saved.');
  };

  const createCase = event => {
    event.preventDefault();
    const createdAt = new Date().toISOString();
    const item = {
      ...newCase,
      id: `demo-${Date.now()}`,
      status: 'pending',
      assignedTo: '',
      createdAt,
      updates: [{ id: `u-${Date.now()}`, message: 'Case created and added to the pending queue.', createdAt, by: 'NGO coordinator' }]
    };
    setCases(current => [item, ...current]);
    setNewCase({ animal: 'Dog', title: '', description: '', location: '', priority: 'Normal' });
    setModal(null);
    setFilter('all');
    setNotice('New demo rescue task created.');
  };

  return (
    <main className="ngo-demo">
      <aside className="ngo-sidebar">
        <Link to="/" className="ngo-brand"><span><PawPrint size={21}/></span><b>Hope<span> & Paws</span><small>COMMUNITY RESCUE NGO</small></b></Link>
        <div className="ngo-side-label">OPERATIONS</div>
        <a className="ngo-side-link active" href="#ngo-cases"><ClipboardList size={17}/> Rescue tasks <span>{counts.pending}</span></a>
        <a className="ngo-side-link" href="#ngo-impact"><Activity size={17}/> Team overview</a>
        <div className="ngo-sidebar-bottom"><ShieldCheck size={18}/><b>People-first rescue</b><p>Keep a safe distance and coordinate with trained local responders.</p></div>
      </aside>

      <section className="ngo-main">
        <header className="ngo-topbar">
          <div className="ngo-breadcrumb"><Link to="/">ResQVision</Link><span>/</span> Hope & Paws demo</div>
          <div className="ngo-top-actions"><span className="ngo-demo-badge"><i/> DEMO WORKSPACE</span><Link className="ngo-back" to="/"><ArrowLeft size={15}/> Main site</Link></div>
        </header>

        <div className="ngo-content">
          <div className="ngo-demo-notice"><AlertTriangle size={17}/><span><b>Demo cases are samples.</b> {loadingLive ? 'Loading reports…' : `${liveCases.length} live report${liveCases.length === 1 ? '' : 's'} from across the network are available to this account.`} Live report changes are saved to the API; no rescue team is automatically contacted.</span></div>
          {notice && <div className="ngo-toast" role="status"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15}/></button></div>}

          <div className="ngo-heading">
            <div><div className="ngo-eyebrow">HOPE & PAWS · RESCUE OPERATIONS</div><h1>Good morning, coordinator.</h1><p>Keep every report moving from first alert to safe outcome.</p></div>
            <button className="ngo-create" onClick={() => setModal({ type: 'create' })}><Plus size={17}/> Create rescue task</button>
          </div>

          <section className="ngo-metrics" id="ngo-impact">
            <Metric icon={ClipboardList} label="Total reports" value={counts.total} note={`${liveCases.length} live reports · ${cases.length} demo samples`}/>
            <Metric icon={Clock3} label="Pending" value={counts.pending} note="Needs team assignment" tone="amber"/>
            <Metric icon={Users} label="Assigned" value={counts.assigned} note="With a response team" tone="blue"/>
            <Metric icon={HeartHandshake} label="Rescued" value={counts.rescued} note="Marked safe by the team" tone="green"/>
          </section>

          <section className="ngo-queue" id="ngo-cases">
            <div className="ngo-queue-head">
              <div><div className="ngo-eyebrow">LIVE CASE BOARD</div><h2>Rescue tasks</h2><p>Assign a team, update the status, and leave a clear progress report.</p></div>
              <label className="ngo-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports..." /></label>
            </div>

            <div className="ngo-filters" role="tablist" aria-label="Filter rescue tasks">
              {[['all', 'All reports', counts.total], ['pending', 'Pending', counts.pending], ['assigned', 'Assigned', counts.assigned], ['rescued', 'Rescued', counts.rescued]].map(([value, label, count]) => (
                <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>
              ))}
              <span className="ngo-showing">{visibleCases.length} shown</span>
            </div>

            <div className="ngo-case-list">
              {visibleCases.map(item => <article className="ngo-case" key={item.id}>
                <div className={`ngo-animal-icon ${item.status}`}><PawPrint size={20}/></div>
                <div className="ngo-case-body">
                  <div className="ngo-case-topline"><div className="ngo-case-title"><span className="ngo-animal">{item.animal}</span>{item.source === 'live' && <span className="ngo-live-badge">LIVE REPORT</span>}<Status value={item.status}/>{item.priority === 'Urgent' && <span className="ngo-urgent"><AlertTriangle size={12}/> Urgent</span>}</div><span className="ngo-created">{formatTime(item.createdAt)}</span></div>
                  <h3>{item.title}</h3>
                  <p className="ngo-description">{item.description}</p>
                  <div className="ngo-case-meta"><span><MapPin size={13}/>{item.location}</span>{item.assignedTo && <span><Users size={13}/>{item.assignedTo}</span>}</div>
                  {item.updates?.[0] && <div className="ngo-latest-report"><Clock3 size={13}/><span><b>Latest report:</b> {item.updates[0].message}<small>{item.updates[0].by} · {formatTime(item.updates[0].createdAt)}</small></span></div>}
                  {item.updates?.length > 1 && <details className="ngo-history"><summary>View {item.updates.length - 1} earlier update{item.updates.length > 2 ? 's' : ''}<ChevronDown size={13}/></summary><div>{item.updates.slice(1).map(entry => <p key={entry.id}><b>{entry.by} · {formatTime(entry.createdAt)}</b>{entry.message}</p>)}</div></details>}
                </div>
                <div className="ngo-case-actions">
                  <label>ASSIGN TEAM<select aria-label={`Assign team for ${item.title}`} value={item.assignedTo} disabled={item.source === 'live' && !canManageLive} onChange={event => assignTeam(item.id, event.target.value)}><option value="">Unassigned</option>{teams.map(team => <option key={team}>{team}</option>)}</select></label>
                  <label>STATUS<select aria-label={`Status for ${item.title}`} className={`ngo-status-select ${item.status}`} value={item.status} disabled={item.source === 'live' && !canManageLive} onChange={event => changeStatus(item.id, event.target.value)}>{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <button className="ngo-report-btn" disabled={item.source === 'live' && !canManageLive} onClick={() => openReport(item)}><ClipboardList size={14}/> Add report</button>
                </div>
              </article>)}
              {!visibleCases.length && <div className="ngo-empty"><PawPrint size={28}/><b>No reports in this view</b><span>Try another filter or create a new rescue task.</span></div>}
            </div>
          </section>

          <div className="ngo-footer-note"><ShieldCheck size={16}/><span>For demonstration only. Real deployments need verified NGO accounts, backend permissions, and direct confirmation from rescue partners.</span></div>
        </div>
      </section>

      {modal && <div className="ngo-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}>
        <form className="ngo-modal" onSubmit={modal.type === 'create' ? createCase : saveReport}>
          <div className="ngo-modal-heading"><div><div className="ngo-eyebrow">{modal.type === 'create' ? 'NEW CASE' : 'CASE PROGRESS'}</div><h2>{modal.type === 'create' ? 'Create a rescue task' : 'Add progress report'}</h2></div><button type="button" className="ngo-close" onClick={() => setModal(null)} aria-label="Close"><X size={18}/></button></div>
          {modal.type === 'create' ? <>
            <label>Animal type<select value={newCase.animal} onChange={event => setNewCase(current => ({ ...current, animal: event.target.value }))}>{['Dog', 'Cat', 'Bird', 'Cow', 'Horse', 'Wildlife', 'Other'].map(animal => <option key={animal}>{animal}</option>)}</select></label>
            <label>Task title<input required maxLength="100" value={newCase.title} onChange={event => setNewCase(current => ({ ...current, title: event.target.value }))} placeholder="Briefly describe the rescue task"/></label>
            <label>Report details<textarea required maxLength="600" rows="3" value={newCase.description} onChange={event => setNewCase(current => ({ ...current, description: event.target.value }))} placeholder="What does the team need to know?"/></label>
            <label>Location<input required maxLength="160" value={newCase.location} onChange={event => setNewCase(current => ({ ...current, location: event.target.value }))} placeholder="Street, area or landmark"/></label>
            <label>Priority<select value={newCase.priority} onChange={event => setNewCase(current => ({ ...current, priority: event.target.value }))}><option>Normal</option><option>Urgent</option><option>Low</option></select></label>
          </> : <>
            <label>Case status<select value={report.status} onChange={event => setReport(current => ({ ...current, status: event.target.value }))}>{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>Progress report<textarea required maxLength="600" rows="4" value={report.message} onChange={event => setReport(current => ({ ...current, message: event.target.value }))} placeholder="Add a useful update: team arrival, animal condition, handoff, or next step..."/></label>
          </>}
          <div className="ngo-modal-actions"><button type="button" className="ngo-cancel" onClick={() => setModal(null)}>Cancel</button><button className="ngo-create" type="submit">{modal.type === 'create' ? <><Plus size={16}/> Create task</> : <><Check size={16}/> Save report</>}</button></div>
        </form>
      </div>}
    </main>
  );
}

function Metric({ icon: Icon, label, value, note, tone }) {
  return <article className={`ngo-metric ${tone || ''}`}><div><span>{label}</span><Icon size={18}/></div><b>{value}</b><small>{note}</small></article>;
}

function Status({ value }) {
  const label = statuses.find(option => option.value === value)?.label || value;
  return <span className={`ngo-status ${value}`}><i/>{label}</span>;
}
