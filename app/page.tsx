'use client';

import { useState, useEffect, useCallback } from 'react';

// ==================== TYPES ====================
type Status = 'Not Applied' | 'Applied' | 'Pending' | 'Won' | 'Lost' | 'Prospect' | 'Negotiating' | 'Confirmed' | 'Paid' | 'Planning' | 'Active' | 'Paused';

interface Grant {
  id: string; name: string; amount: string; amountValue: number;
  deadline: string; status: Status; url: string; description: string; notes: string;
}
interface Sponsor {
  id: string; company: string; contact: string; email: string;
  deal: string; dealValue: number; editions: string; status: Status; notes: string;
}
interface Partnership {
  id: string; company: string; type: string; value: string;
  dealValue: number; status: Status; startDate: string; notes: string;
}
interface Speaking {
  id: string; event: string; organizer: string; fee: string;
  feeValue: number; date: string; status: Status; location: string; notes: string;
}
interface Membership {
  id: string; name: string; price: string; priceValue: number;
  members: number; status: Status; notes: string;
}
interface Data {
  grants: Grant[]; sponsors: Sponsor[]; partnerships: Partnership[];
  speaking: Speaking[]; memberships: Membership[];
}
type Tab = 'grants' | 'sponsors' | 'partnerships' | 'speaking' | 'memberships';

// ==================== STATUS CONFIG ====================
const STATUS_COLORS: Record<string, string> = {
  'Not Applied': 'bg-zinc-800 text-zinc-400',
  'Applied': 'bg-blue-900/50 text-blue-400',
  'Pending': 'bg-yellow-900/50 text-yellow-400',
  'Won': 'bg-emerald-900/50 text-emerald-400',
  'Lost': 'bg-red-900/50 text-red-400',
  'Prospect': 'bg-zinc-800 text-zinc-400',
  'Negotiating': 'bg-yellow-900/50 text-yellow-400',
  'Confirmed': 'bg-blue-900/50 text-blue-400',
  'Paid': 'bg-emerald-900/50 text-emerald-400',
  'Planning': 'bg-purple-900/50 text-purple-400',
  'Active': 'bg-emerald-900/50 text-emerald-400',
  'Paused': 'bg-zinc-800 text-zinc-500',
};
const GRANT_STATUSES: Status[] = ['Not Applied', 'Applied', 'Pending', 'Won', 'Lost'];
const SPONSOR_STATUSES: Status[] = ['Prospect', 'Negotiating', 'Confirmed', 'Paid'];
const PARTNERSHIP_STATUSES: Status[] = ['Prospect', 'Negotiating', 'Confirmed', 'Active', 'Paused'];
const SPEAKING_STATUSES: Status[] = ['Prospect', 'Negotiating', 'Confirmed', 'Paid'];
const MEMBERSHIP_STATUSES: Status[] = ['Planning', 'Active', 'Paused'];

// ==================== HELPERS ====================
function deadlineTag(deadline: string) {
  if (!deadline || ['Rolling', 'Continuous', 'Rolling 2026'].includes(deadline))
    return <span className="text-xs text-zinc-500">{deadline || '—'}</span>;
  const d = new Date(deadline);
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-xs text-red-500">Expired</span>;
  if (diff <= 7) return <span className="text-xs text-red-400 font-semibold">⚡ {diff}d left</span>;
  if (diff <= 30) return <span className="text-xs text-yellow-400">⏰ {diff}d left</span>;
  return <span className="text-xs text-zinc-400">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-4"><label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">{label}</label>{children}</div>;
}
const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500";
const sel = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500";
const ta = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none";

// ==================== FORM MODAL ====================
function ItemModal({ modal, data, onClose, onSave }: {
  modal: { type: string; item?: unknown }; data: Data;
  onClose: () => void; onSave: (d: Data) => void;
}) {
  const isEdit = modal.type.startsWith('edit-');
  const section = modal.type.replace('add-', '').replace('edit-', '');
  const blanks: Record<string, unknown> = {
    grant: { id: `g${Date.now()}`, name: '', amount: '', amountValue: 0, deadline: '', status: 'Not Applied', url: '', description: '', notes: '' },
    sponsor: { id: `s${Date.now()}`, company: '', contact: '', email: '', deal: '', dealValue: 0, editions: '', status: 'Prospect', notes: '' },
    partnership: { id: `p${Date.now()}`, company: '', type: '', value: '', dealValue: 0, status: 'Prospect', startDate: '', notes: '' },
    speaking: { id: `sp${Date.now()}`, event: '', organizer: '', fee: '', feeValue: 0, date: '', status: 'Prospect', location: '', notes: '' },
    membership: { id: `m${Date.now()}`, name: '', price: '', priceValue: 0, members: 0, status: 'Planning', notes: '' },
  };
  const [form, setForm] = useState<Record<string, unknown>>(isEdit ? (modal.item as Record<string, unknown>) : (blanks[section] as Record<string, unknown>));
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const u = { ...data };
    if (section === 'grant') u.grants = isEdit ? u.grants.map(g => g.id === form.id ? form as unknown as Grant : g) : [...u.grants, form as unknown as Grant];
    else if (section === 'sponsor') u.sponsors = isEdit ? u.sponsors.map(s => s.id === form.id ? form as unknown as Sponsor : s) : [...u.sponsors, form as unknown as Sponsor];
    else if (section === 'partnership') u.partnerships = isEdit ? u.partnerships.map(p => p.id === form.id ? form as unknown as Partnership : p) : [...u.partnerships, form as unknown as Partnership];
    else if (section === 'speaking') u.speaking = isEdit ? u.speaking.map(s => s.id === form.id ? form as unknown as Speaking : s) : [...u.speaking, form as unknown as Speaking];
    else if (section === 'membership') u.memberships = isEdit ? u.memberships.map(m => m.id === form.id ? form as unknown as Membership : m) : [...u.memberships, form as unknown as Membership];
    onSave(u);
  };
  const handleDelete = () => {
    const u = { ...data };
    if (section === 'grant') u.grants = u.grants.filter(g => g.id !== form.id);
    else if (section === 'sponsor') u.sponsors = u.sponsors.filter(s => s.id !== form.id);
    else if (section === 'partnership') u.partnerships = u.partnerships.filter(p => p.id !== form.id);
    else if (section === 'speaking') u.speaking = u.speaking.filter(s => s.id !== form.id);
    else if (section === 'membership') u.memberships = u.memberships.filter(m => m.id !== form.id);
    onSave(u);
  };

  const titles: Record<string, string> = {
    'add-grant': 'Add Grant', 'edit-grant': 'Edit Grant',
    'add-sponsor': 'Add Sponsor', 'edit-sponsor': 'Edit Sponsor',
    'add-partnership': 'Add Partnership', 'edit-partnership': 'Edit Partnership',
    'add-speaking': 'Add Speaking Event', 'edit-speaking': 'Edit Speaking Event',
    'add-membership': 'Add Membership Tier', 'edit-membership': 'Edit Membership Tier',
  };

  return (
    <Modal title={titles[modal.type] || 'Edit'} onClose={onClose}>
      {section === 'grant' && <>
        <Field label="Grant Name"><input className={inp} value={form.name as string} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Amount"><input className={inp} value={form.amount as string} onChange={e => set('amount', e.target.value)} placeholder="e.g. $10,000" /></Field>
        <Field label="Amount Value (number)"><input className={inp} type="number" value={form.amountValue as number} onChange={e => set('amountValue', Number(e.target.value))} /></Field>
        <Field label="Deadline"><input className={inp} value={form.deadline as string} onChange={e => set('deadline', e.target.value)} placeholder="YYYY-MM-DD or Rolling" /></Field>
        <Field label="Status"><select className={sel} value={form.status as string} onChange={e => set('status', e.target.value)}>{GRANT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="URL"><input className={inp} value={form.url as string} onChange={e => set('url', e.target.value)} /></Field>
        <Field label="Description"><textarea className={ta} value={form.description as string} onChange={e => set('description', e.target.value)} /></Field>
        <Field label="Notes"><textarea className={ta} value={form.notes as string} onChange={e => set('notes', e.target.value)} /></Field>
      </>}
      {section === 'sponsor' && <>
        <Field label="Company"><input className={inp} value={form.company as string} onChange={e => set('company', e.target.value)} /></Field>
        <Field label="Contact Name"><input className={inp} value={form.contact as string} onChange={e => set('contact', e.target.value)} /></Field>
        <Field label="Email"><input className={inp} type="email" value={form.email as string} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Deal"><input className={inp} value={form.deal as string} onChange={e => set('deal', e.target.value)} placeholder="e.g. $2,500 per edition" /></Field>
        <Field label="Deal Value (number)"><input className={inp} type="number" value={form.dealValue as number} onChange={e => set('dealValue', Number(e.target.value))} /></Field>
        <Field label="# Editions"><input className={inp} value={form.editions as string} onChange={e => set('editions', e.target.value)} /></Field>
        <Field label="Status"><select className={sel} value={form.status as string} onChange={e => set('status', e.target.value)}>{SPONSOR_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea className={ta} value={form.notes as string} onChange={e => set('notes', e.target.value)} /></Field>
      </>}
      {section === 'partnership' && <>
        <Field label="Company"><input className={inp} value={form.company as string} onChange={e => set('company', e.target.value)} /></Field>
        <Field label="Type"><input className={inp} value={form.type as string} onChange={e => set('type', e.target.value)} placeholder="e.g. Affiliate, Co-creator" /></Field>
        <Field label="Value"><input className={inp} value={form.value as string} onChange={e => set('value', e.target.value)} placeholder="e.g. $1,000/mo" /></Field>
        <Field label="Deal Value (number)"><input className={inp} type="number" value={form.dealValue as number} onChange={e => set('dealValue', Number(e.target.value))} /></Field>
        <Field label="Start Date"><input className={inp} type="date" value={form.startDate as string} onChange={e => set('startDate', e.target.value)} /></Field>
        <Field label="Status"><select className={sel} value={form.status as string} onChange={e => set('status', e.target.value)}>{PARTNERSHIP_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea className={ta} value={form.notes as string} onChange={e => set('notes', e.target.value)} /></Field>
      </>}
      {section === 'speaking' && <>
        <Field label="Event Name"><input className={inp} value={form.event as string} onChange={e => set('event', e.target.value)} /></Field>
        <Field label="Organizer"><input className={inp} value={form.organizer as string} onChange={e => set('organizer', e.target.value)} /></Field>
        <Field label="Fee"><input className={inp} value={form.fee as string} onChange={e => set('fee', e.target.value)} placeholder="e.g. $5,000" /></Field>
        <Field label="Fee Value (number)"><input className={inp} type="number" value={form.feeValue as number} onChange={e => set('feeValue', Number(e.target.value))} /></Field>
        <Field label="Date"><input className={inp} type="date" value={form.date as string} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Location"><input className={inp} value={form.location as string} onChange={e => set('location', e.target.value)} /></Field>
        <Field label="Status"><select className={sel} value={form.status as string} onChange={e => set('status', e.target.value)}>{SPEAKING_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea className={ta} value={form.notes as string} onChange={e => set('notes', e.target.value)} /></Field>
      </>}
      {section === 'membership' && <>
        <Field label="Tier Name"><input className={inp} value={form.name as string} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Price"><input className={inp} value={form.price as string} onChange={e => set('price', e.target.value)} placeholder="e.g. $97/mo" /></Field>
        <Field label="Price Value (number)"><input className={inp} type="number" value={form.priceValue as number} onChange={e => set('priceValue', Number(e.target.value))} /></Field>
        <Field label="Members"><input className={inp} type="number" value={form.members as number} onChange={e => set('members', Number(e.target.value))} /></Field>
        <Field label="Status"><select className={sel} value={form.status as string} onChange={e => set('status', e.target.value)}>{MEMBERSHIP_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Notes"><textarea className={ta} value={form.notes as string} onChange={e => set('notes', e.target.value)} /></Field>
      </>}
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium">Save</button>
        {isEdit && <button onClick={handleDelete} className="bg-red-900/50 hover:bg-red-800 text-red-400 px-4 py-2 rounded-lg text-sm">Delete</button>}
        <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm">Cancel</button>
      </div>
    </Modal>
  );
}

type DbGrant = { name: string; amount: string; description: string; deadline: string; url: string };
type GrantDb = Record<string, DbGrant[]>;
const DB_CATEGORIES = ['Women Grants', 'Business Grants', 'Non-Profits'] as const;
type GrantSubTab = 'pipeline' | 'applied' | typeof DB_CATEGORIES[number];

// ==================== MAIN ====================
export default function RevenueHub() {
  const [activeTab, setActiveTab] = useState<Tab>('grants');
  const [grantSubTab, setGrantSubTab] = useState<GrantSubTab>('pipeline');
  const [grantDb, setGrantDb] = useState<GrantDb>({});
  const [expandedCat, setExpandedCat] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: string; item?: unknown } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [init, db] = await Promise.all([
        fetch('/api/initiatives').then(r => r.json()),
        fetch('/api/grants-db').then(r => r.json()),
      ]);
      setData(init);
      setGrantDb(db);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveData = async (updated: Data) => {
    setSaving(true);
    const res = await fetch('/api/initiatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const result = await res.json();
    if (result.ok) {
      setData(updated);
    } else {
      alert('Save failed: ' + (result.error || 'Unknown error. KV storage may not be configured.'));
    }
    setSaving(false);
    setModal(null);
  };

  const deleteExpired = () => {
    if (!data) return;
    const expired = data.grants.filter(g => {
      if (['Rolling', 'Continuous', 'Rolling 2026', ''].includes(g.deadline)) return false;
      const diff = (new Date(g.deadline).getTime() - Date.now()) / 86400000;
      return diff < 0 && !['Applied', 'Pending', 'Won'].includes(g.status);
    });
    if (expired.length === 0) { alert('No expired grants to clean up!'); return; }
    if (!confirm(`Delete ${expired.length} expired grant(s) that weren't applied to?`)) return;
    saveData({ ...data, grants: data.grants.filter(g => !expired.find(e => e.id === g.id)) });
  };

  const addToPipeline = (g: DbGrant) => {
    if (!data) return;
    const newGrant: Grant = {
      id: `g${Date.now()}`, name: g.name, amount: g.amount || 'Variable',
      amountValue: 0, deadline: g.deadline || 'Rolling', status: 'Not Applied',
      url: g.url || '#', description: g.description || '', notes: '',
    };
    saveData({ ...data, grants: [...data.grants, newGrant] });
    setGrantSubTab('pipeline');
  };

  const editOrAdd = (g: DbGrant) => {
    if (!data) return;
    const existing = data.grants.find(p => p.name === g.name);
    if (existing) {
      setModal({ type: 'edit-grant', item: existing });
    } else {
      const newGrant: Grant = {
        id: `g${Date.now()}`, name: g.name, amount: g.amount || 'Variable',
        amountValue: 0, deadline: g.deadline || 'Rolling', status: 'Not Applied',
        url: g.url || '#', description: g.description || '', notes: '',
      };
      const updated = { ...data, grants: [...data.grants, newGrant] };
      setData(updated);
      setModal({ type: 'edit-grant', item: newGrant });
    }
  };

  const totalGrantPotential = data?.grants.filter(g => g.status !== 'Lost').reduce((s, g) => s + g.amountValue, 0) || 0;
  const wonGrants = data?.grants.filter(g => g.status === 'Won').reduce((s, g) => s + g.amountValue, 0) || 0;
  const confirmedSponsors = data?.sponsors.filter(s => ['Confirmed', 'Paid'].includes(s.status)).reduce((s, sp) => s + sp.dealValue, 0) || 0;
  const confirmedSpeaking = data?.speaking.filter(s => ['Confirmed', 'Paid'].includes(s.status)).reduce((s, sp) => s + sp.feeValue, 0) || 0;
  const activeMembers = data?.memberships.filter(m => m.status === 'Active').reduce((s, m) => s + m.priceValue * m.members, 0) || 0;
  const totalConfirmed = wonGrants + confirmedSponsors + confirmedSpeaking + activeMembers;
  const urgentDeadlines = data?.grants.filter(g => { const d = new Date(g.deadline); const diff = (d.getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 30; }).length || 0;

  const tabs = [
    { id: 'grants' as Tab, label: 'Grants', emoji: '🏆' },
    { id: 'sponsors' as Tab, label: 'Ad Sponsors', emoji: '📢' },
    { id: 'partnerships' as Tab, label: 'Partnerships', emoji: '🤝' },
    { id: 'speaking' as Tab, label: 'Speaking', emoji: '🎤' },
    { id: 'memberships' as Tab, label: 'Memberships', emoji: '🎓' },
  ];

  const thCls = "pb-4 text-xs uppercase tracking-widest text-zinc-500 font-medium";
  const trCls = "border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-400 text-zinc-950 flex items-center justify-center text-sm font-bold">YB</div>
          <div>
            <div className="text-lg font-semibold tracking-tight">Revenue Initiatives Hub</div>
            <div className="text-xs text-zinc-500">Yrmis Barroeta · myheadquarters.club</div>
          </div>
        </div>
        <button onClick={fetchData} className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors">
          {saving ? 'Saving…' : 'Refresh'}
        </button>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Confirmed Revenue', value: `$${totalConfirmed.toLocaleString()}`, sub: 'won + confirmed', color: 'text-emerald-400' },
            { label: 'Grant Potential', value: `$${totalGrantPotential.toLocaleString()}`, sub: `${data?.grants.filter(g => ['Applied','Pending'].includes(g.status)).length || 0} in pipeline`, color: 'text-indigo-400' },
            { label: 'Active Sponsors', value: `${data?.sponsors.filter(s => ['Confirmed','Paid'].includes(s.status)).length || 0}`, sub: `$${confirmedSponsors.toLocaleString()} confirmed`, color: 'text-blue-400' },
            { label: 'Urgent Deadlines', value: `${urgentDeadlines}`, sub: 'grants due in 30 days', color: urgentDeadlines > 0 ? 'text-yellow-400' : 'text-zinc-400' },
          ].map(card => (
            <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{card.label}</div>
              <div className={`text-2xl font-semibold ${card.color}`}>{loading ? '···' : card.value}</div>
              <div className="text-xs text-zinc-600 mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}`}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {data && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            {/* GRANTS */}
            {activeTab === 'grants' && <>
              {/* Grant sub-tabs */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex gap-1.5 flex-wrap">
                  {(['pipeline', 'applied', ...DB_CATEGORIES] as GrantSubTab[]).map(sub => {
                    const appliedCount = sub === 'applied' ? data.grants.filter(g => ['Applied','Pending','Won'].includes(g.status)).length : 0;
                    return (
                      <button key={sub} onClick={() => { setGrantSubTab(sub); setExpandedCat(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${grantSubTab === sub ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        {sub === 'pipeline' ? '📋 My Pipeline'
                          : sub === 'applied' ? `✅ Applied${appliedCount > 0 ? ` (${appliedCount})` : ''}`
                          : sub === 'Women Grants' ? '👩 Women Grants'
                          : sub === 'Business Grants' ? '💼 Business Grants'
                          : '🏛 Non-Profits'}
                      </button>
                    );
                  })}
                </div>
                {grantSubTab === 'pipeline' && (
                  <div className="flex gap-2">
                    <button onClick={deleteExpired} className="text-xs text-zinc-500 hover:text-red-400 px-3 py-2 rounded-lg border border-zinc-800 hover:border-red-900 transition-colors">🗑 Clean expired</button>
                    <button onClick={() => setModal({ type: 'add-grant' })} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">+ Add Grant</button>
                  </div>
                )}
              </div>

              {/* Pipeline sub-tab */}
              {grantSubTab === 'pipeline' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-zinc-800">
                      <th className={thCls}>Grant</th><th className={thCls}>Amount</th>
                      <th className={thCls}>Deadline</th><th className={thCls}>Status</th>
                      <th className={thCls}>Notes</th><th className={thCls}></th>
                    </tr></thead>
                    <tbody>{[...data.grants].sort((a, b) => {
                        const rolling = ['Rolling', 'Continuous', 'Rolling 2026', ''];
                        const aRolling = rolling.includes(a.deadline);
                        const bRolling = rolling.includes(b.deadline);
                        if (aRolling && bRolling) return 0;
                        if (aRolling) return 1;
                        if (bRolling) return -1;
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                      }).map(g => (
                      <tr key={g.id} className={trCls}>
                        <td className="py-4 pr-4">
                          <div className="font-medium text-white text-sm">{g.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5 max-w-xs">{g.description.slice(0, 80)}{g.description.length > 80 ? '…' : ''}</div>
                        </td>
                        <td className="py-4 pr-4 text-sm text-emerald-400 whitespace-nowrap">{g.amount}</td>
                        <td className="py-4 pr-4 whitespace-nowrap">{deadlineTag(g.deadline)}</td>
                        <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[g.status]}`}>{g.status}</span></td>
                        <td className="py-4 pr-4 text-xs text-zinc-500 max-w-xs">{g.notes || '—'}</td>
                        <td className="py-4">
                          <div className="flex gap-3">
                            <button onClick={() => setModal({ type: 'edit-grant', item: g })} className="text-xs text-zinc-500 hover:text-white">Edit</button>
                            {g.url && g.url !== '#' && <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">Apply →</a>}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {/* Applied sub-tab */}
              {grantSubTab === 'applied' && (() => {
                const applied = [...data.grants]
                  .filter(g => ['Applied', 'Pending', 'Won', 'Lost'].includes(g.status))
                  .sort((a, b) => {
                    const order = ['Won', 'Pending', 'Applied', 'Lost'];
                    return order.indexOf(a.status) - order.indexOf(b.status);
                  });
                return applied.length === 0
                  ? <div className="text-center py-12 text-zinc-600">No applied grants yet. Change a grant status to Applied to see it here.</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="border-b border-zinc-800">
                          <th className={thCls}>Grant</th><th className={thCls}>Amount</th>
                          <th className={thCls}>Deadline</th><th className={thCls}>Status</th>
                          <th className={thCls}>Notes</th><th className={thCls}></th>
                        </tr></thead>
                        <tbody>{applied.map(g => (
                          <tr key={g.id} className={trCls}>
                            <td className="py-4 pr-4">
                              <div className="font-medium text-white text-sm">{g.name}</div>
                              <div className="text-xs text-zinc-500 mt-0.5 max-w-xs">{g.description.slice(0, 80)}{g.description.length > 80 ? '…' : ''}</div>
                            </td>
                            <td className="py-4 pr-4 text-sm text-emerald-400 whitespace-nowrap">{g.amount}</td>
                            <td className="py-4 pr-4 whitespace-nowrap">{deadlineTag(g.deadline)}</td>
                            <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[g.status]}`}>{g.status}</span></td>
                            <td className="py-4 pr-4 text-xs text-zinc-500 max-w-xs">{g.notes || '—'}</td>
                            <td className="py-4">
                              <div className="flex gap-3">
                                <button onClick={() => setModal({ type: 'edit-grant', item: g })} className="text-xs text-zinc-500 hover:text-white">Edit</button>
                                {g.url && g.url !== '#' && <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">Apply →</a>}
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  );
              })()}

              {/* DB category sub-tabs */}
              {grantSubTab !== 'pipeline' && grantSubTab !== 'applied' && (() => {
                const list = grantDb[grantSubTab] || [];
                const shown = expandedCat ? list : list.slice(0, 8);
                return (
                  <>
                    <div className="text-xs text-zinc-500 mb-4">{list.length} grants in this category</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="border-b border-zinc-800">
                          <th className={thCls}>Grant</th><th className={thCls}>Amount</th>
                          <th className={thCls}>Deadline</th><th className={thCls}>Status</th>
                          <th className={thCls}></th>
                        </tr></thead>
                        <tbody>{shown.map((g, i) => {
                          const inPipeline = data.grants.find(p => p.name === g.name);
                          return (
                            <tr key={i} className={trCls}>
                              <td className="py-4 pr-4">
                                <div className="font-medium text-white text-sm">{g.name}</div>
                                <div className="text-xs text-zinc-500 mt-0.5 max-w-sm">{(g.description || '').slice(0, 100)}{(g.description || '').length > 100 ? '…' : ''}</div>
                              </td>
                              <td className="py-4 pr-4 text-sm text-emerald-400 whitespace-nowrap">{g.amount || 'Variable'}</td>
                              <td className="py-4 pr-4 whitespace-nowrap">{deadlineTag(g.deadline || 'Rolling')}</td>
                              <td className="py-4 pr-4">
                                {inPipeline
                                  ? <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[inPipeline.status]}`}>{inPipeline.status}</span>
                                  : <span className="text-xs text-zinc-600">—</span>}
                              </td>
                              <td className="py-4">
                                <div className="flex gap-3 items-center">
                                  <button onClick={() => editOrAdd(g)} className="text-xs text-zinc-500 hover:text-white">Edit</button>
                                  {g.url && g.url !== '#' && <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">Apply →</a>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                    {list.length > 8 && (
                      <button onClick={() => setExpandedCat(v => !v)}
                        className="mt-4 w-full text-xs text-zinc-500 hover:text-white py-2 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors">
                        {expandedCat ? `Show less ↑` : `+ Show all ${list.length} grants ↓`}
                      </button>
                    )}
                  </>
                );
              })()}
            </>}

            {/* SPONSORS */}
            {activeTab === 'sponsors' && <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-zinc-300">Ad Sponsors Pipeline</h3>
                <button onClick={() => setModal({ type: 'add-sponsor' })} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">+ Add Sponsor</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-zinc-800">
                    {['Company','Contact','Deal','Editions','Status','Notes',''].map(h => <th key={h} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>{data.sponsors.map(s => (
                    <tr key={s.id} className={trCls}>
                      <td className="py-4 pr-4 font-medium text-white text-sm">{s.company}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{s.contact || '—'}</td>
                      <td className="py-4 pr-4 text-sm text-emerald-400">{s.deal}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{s.editions || '—'}</td>
                      <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                      <td className="py-4 pr-4 text-xs text-zinc-500">{s.notes || '—'}</td>
                      <td className="py-4"><button onClick={() => setModal({ type: 'edit-sponsor', item: s })} className="text-xs text-zinc-500 hover:text-white">Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {/* PARTNERSHIPS */}
            {activeTab === 'partnerships' && <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-zinc-300">Partnerships</h3>
                <button onClick={() => setModal({ type: 'add-partnership' })} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">+ Add Partnership</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-zinc-800">
                    {['Company','Type','Value','Start Date','Status','Notes',''].map(h => <th key={h} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>{data.partnerships.map(p => (
                    <tr key={p.id} className={trCls}>
                      <td className="py-4 pr-4 font-medium text-white text-sm">{p.company}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{p.type}</td>
                      <td className="py-4 pr-4 text-sm text-emerald-400">{p.value}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{p.startDate || '—'}</td>
                      <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                      <td className="py-4 pr-4 text-xs text-zinc-500">{p.notes || '—'}</td>
                      <td className="py-4"><button onClick={() => setModal({ type: 'edit-partnership', item: p })} className="text-xs text-zinc-500 hover:text-white">Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {/* SPEAKING */}
            {activeTab === 'speaking' && <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-zinc-300">Speaking Engagements</h3>
                <button onClick={() => setModal({ type: 'add-speaking' })} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">+ Add Event</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-zinc-800">
                    {['Event','Organizer','Fee','Date','Location','Status','Notes',''].map(h => <th key={h} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>{data.speaking.map(s => (
                    <tr key={s.id} className={trCls}>
                      <td className="py-4 pr-4 font-medium text-white text-sm">{s.event}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{s.organizer || '—'}</td>
                      <td className="py-4 pr-4 text-sm text-emerald-400">{s.fee}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{s.date || '—'}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{s.location || '—'}</td>
                      <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                      <td className="py-4 pr-4 text-xs text-zinc-500">{s.notes || '—'}</td>
                      <td className="py-4"><button onClick={() => setModal({ type: 'edit-speaking', item: s })} className="text-xs text-zinc-500 hover:text-white">Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {/* MEMBERSHIPS */}
            {activeTab === 'memberships' && <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-zinc-300">Memberships</h3>
                <button onClick={() => setModal({ type: 'add-membership' })} className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg">+ Add Tier</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-zinc-800">
                    {['Tier','Price','Members','Monthly Revenue','Status','Notes',''].map(h => <th key={h} className={thCls}>{h}</th>)}
                  </tr></thead>
                  <tbody>{data.memberships.map(m => (
                    <tr key={m.id} className={trCls}>
                      <td className="py-4 pr-4 font-medium text-white text-sm">{m.name}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{m.price}</td>
                      <td className="py-4 pr-4 text-sm text-zinc-400">{m.members}</td>
                      <td className="py-4 pr-4 text-sm text-emerald-400">${(m.priceValue * m.members).toLocaleString()}</td>
                      <td className="py-4 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[m.status]}`}>{m.status}</span></td>
                      <td className="py-4 pr-4 text-xs text-zinc-500">{m.notes || '—'}</td>
                      <td className="py-4"><button onClick={() => setModal({ type: 'edit-membership', item: m })} className="text-xs text-zinc-500 hover:text-white">Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}
          </div>
        )}
      </div>

      {modal && data && <ItemModal modal={modal} data={data} onClose={() => setModal(null)} onSave={saveData} />}
    </div>
  );
}
