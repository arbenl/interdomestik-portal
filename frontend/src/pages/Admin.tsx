import { useState, useEffect } from 'react';
import type { Profile } from '../types';
import useAdmin from '../hooks/useAdmin';
import useAgentOrAdmin from '../hooks/useAgentOrAdmin';
import { useUsers } from '../hooks/useUsers';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { REGIONS } from '../constants/regions';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useMemberSearch } from '../hooks/useMemberSearch';
import { useToast } from '../components/ui/useToast';
//
import ActivateMembershipModal from '../components/ActivateMembershipModal';
import AgentRegistrationCard from '../components/AgentRegistrationCard';
import Button from '../components/ui/Button';
import useReports from '../hooks/useReports';
import type { Organization, Coupon } from '../types';
import { collection, onSnapshot, orderBy, limit, query, doc } from 'firebase/firestore';
import { db, projectId, storageBucket } from '../firebase';

//

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { canRegister, allowedRegions, loading: roleLoading } = useAgentOrAdmin();
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL'|'ACTIVE'|'INACTIVE'|'EXPIRED'>('ALL');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const { users, loading: usersLoading, error: usersError, refresh, nextPage, prevPage, hasNext, hasPrev, page } = useUsers({ allowedRegions, limit: 25, region: regionFilter, status: statusFilter, expiringDays: expiringSoon ? 30 : null });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = users.length > 0 && users.every(u => selected[u.id!]);
  const selectedIds = users.filter(u => selected[u.id!]).map(u => u.id!)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Role management state (admin only)
  const [lookupEmail, setLookupEmail] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [targetRole, setTargetRole] = useState<'member'|'agent'|'admin'>('member');
  const [targetRegions, setTargetRegions] = useState<string[]>([]);
  const [roleBusy, setRoleBusy] = useState(false);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  const handleActivateClick = (user: Profile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleDownloadCsv = async () => {
    try {
      const isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
      const projectId = 'demo-interdomestik';
      const url = isLocal ? `http://127.0.0.1:5001/${projectId}/europe-west1/exportMembersCsv` : '/exportMembersCsv';
      const { getAuth } = await import('firebase/auth');
      const user = getAuth().currentUser;
      const idToken = await user?.getIdToken();
      const res = await fetch(url, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      if (!res.ok) throw new Error(`CSV export failed: ${res.status}`);
      const csvContent = await res.text();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'members.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleSuccess('CSV downloaded successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  // Emulator utilities (visible only when running locally)
  const isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const EMU_BASE = 'http://127.0.0.1:5001/demo-interdomestik/europe-west1';
  const today = new Date().toISOString().slice(0,10);
  const { items: auditLogs, loading: auditLoading, error: auditError } = useAuditLogs(20);
  const { push } = useToast();
  // Exports state
  const [exportsList, setExportsList] = useState<Array<{ id: string; path: string; url?: string; status: string; count?: number; size?: number; createdAt?: any }>>([]);
  const [exportsLimit, setExportsLimit] = useState<number>(5);
  const [expFilterRegions, setExpFilterRegions] = useState<string[]>([]);
  const [expFilterStatus, setExpFilterStatus] = useState<string>('');
  const [expFilterDays, setExpFilterDays] = useState<number>(0);
  const [expColumns, setExpColumns] = useState<Record<string, boolean>>({ memberNo:true, name:true, email:true, phone:true, region:true, orgId:true, active:true, expiresAt:true });
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);
  const [currentExport, setCurrentExport] = useState<any>(null);
  useEffect(() => {
    const qy = query(collection(db, 'exports'), orderBy('createdAt', 'desc'), limit(exportsLimit));
    const unsub = onSnapshot(qy, (snap) => {
      setExportsList(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [exportsLimit]);
  useEffect(() => {
    if (!currentExportId) { setCurrentExport(null); return; }
    const ref = doc(db, 'exports', currentExportId);
    const unsub = onSnapshot(ref, (d) => setCurrentExport({ id: d.id, ...(d.data() as any) }));
    return () => unsub();
  }, [currentExportId]);

  function formatBytes(n?: number) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    if (n < 1024*1024*1024) return `${(n/1024/1024).toFixed(1)} MB`;
    return `${(n/1024/1024/1024).toFixed(1)} GB`;
  }

  function statusBadge(s: string) {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold';
    if (s === 'done') return <span className={`${base} bg-green-100 text-green-800`}>done</span>;
    if (s === 'running') return <span className={`${base} bg-yellow-100 text-yellow-800`}>running</span>;
    if (s === 'error') return <span className={`${base} bg-red-100 text-red-800`}>error</span>;
    return <span className={`${base} bg-gray-100 text-gray-800`}>{s || 'unknown'}</span>;
  }

  async function copy(text: string, okMsg = 'Copied to clipboard') {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      push({ type: 'success', message: okMsg });
    } catch {
      push({ type: 'error', message: 'Copy failed' });
    }
  }
  const [searchTerm, setSearchTerm] = useState('');
  const { results: searchResults, loading: searchLoading, error: searchError, search, clear } = useMemberSearch();
  // Live search as user types (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const term = searchTerm.trim();
      if (term) {
        search(term);
      } else {
        clear();
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, search, clear]);
  // Backfill dialog state
  const [showBackfill, setShowBackfill] = useState(false);
  const [bfRunning, setBfRunning] = useState(false);
  const [bfCancel, setBfCancel] = useState(false);
  const [bfPage, setBfPage] = useState(0);
  const [bfUpdated, setBfUpdated] = useState(0);
  const [bfNext, setBfNext] = useState<string | null>(null);
  const { items: reports, loading: reportLoading } = useReports(6);

  const handleSeedEmulator = async () => {
    try {
      const res = await fetch(`${EMU_BASE}/seedDatabase`);
      if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
      handleSuccess('Emulator seeded with test users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed seeding emulator';
      setError(msg);
    }
  };

  const handleClearEmulator = async () => {
    try {
      const res = await fetch(`${EMU_BASE}/clearDatabase`);
      if (!res.ok) throw new Error(`Clear failed: ${res.status}`);
      handleSuccess('Emulator database cleared');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed clearing emulator';
      setError(msg);
    }
  };

  if (adminLoading || roleLoading || usersLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  // Show limited panel for agents (registration only); full dashboard for admins

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{isAdmin ? 'Admin Panel' : 'Agent Panel'}</h2>
{isAdmin && (
          <button onClick={handleDownloadCsv} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
            Download Members CSV
          </button>
        )}
      </div>

      {isLocal && (
        <div className="mb-6 p-4 border rounded bg-yellow-50">
          <p className="font-medium mb-2">Emulator Utilities (local only)</p>
          <div className="flex gap-3">
            <button onClick={handleSeedEmulator} className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">Seed Data</button>
            <button onClick={handleClearEmulator} className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600">Clear Data</button>
            <button data-testid="refresh-users" onClick={refresh} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700">Refresh list</button>
          </div>
        </div>
      )}

      {canRegister && (
        <AgentRegistrationCard allowedRegions={allowedRegions} onSuccess={handleSuccess} onError={setError} />
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Role Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lookup by email</label>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="user@example.com" value={lookupEmail} onChange={e=>setLookupEmail(e.target.value)} />
            </div>
            <button className="bg-gray-700 text-white px-3 py-2 rounded h-10 md:h-auto" onClick={async ()=>{
              try {
                setRoleBusy(true); setError(null); setSuccess(null);
                const search = httpsCallable<{ email: string }, { uid: string }>(functions, 'searchUserByEmail');
                const res = await search({ email: lookupEmail });
                const uid = res.data?.uid;
                if (!uid) throw new Error('User not found');
                setTargetUid(uid);
                setSuccess(`Found UID: ${uid}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally { setRoleBusy(false); }
            }}>Find UID</button>
            <div>
              <label className="block text-sm font-medium text-gray-700">Or set UID directly</label>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="uid_..." value={targetUid} onChange={e=>setTargetUid(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select className="mt-1 w-full border rounded px-3 py-2" value={targetRole} onChange={e=>setTargetRole(e.target.value as 'member'|'agent'|'admin')}>
                <option value="member">member</option>
                <option value="agent">agent</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Allowed regions (for agents/admins)</label>
              <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                {REGIONS.map(r => (
                  <label key={r} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={targetRegions.includes(r)} onChange={(e)=>{
                      setTargetRegions(prev=> e.target.checked ? Array.from(new Set([...prev, r])) : prev.filter(x=>x!==r));
                    }} />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button disabled={!targetUid || roleBusy} className="bg-indigo-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-2" onClick={async ()=>{
              try {
                setRoleBusy(true); setError(null); setSuccess(null);
                const setRole = httpsCallable<{ uid: string; role: 'member'|'agent'|'admin'; allowedRegions: string[] }, { message: string }>(functions, 'setUserRole');
                await setRole({ uid: targetUid, role: targetRole, allowedRegions: targetRegions });
                setSuccess('Role updated');
              } catch (e) {
                const err = e as unknown as { message?: string; code?: string };
                const msg = (err?.message || 'Failed'); const code = err?.code ? ` (${err.code})` : '';
                setError(`${msg}${code}`);
              } finally { setRoleBusy(false); }
            }}>Apply Role</button>
            <button disabled={!targetUid || roleBusy} className="bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-2" onClick={async ()=>{
              try {
                setRoleBusy(true); setError(null); setSuccess(null); setClaims(null);
                type ClaimsResp = { uid: string; claims: Record<string, unknown> };
                const fn = httpsCallable<{ uid: string }, ClaimsResp>(functions, 'getUserClaims');
                const r = await fn({ uid: targetUid });
                setClaims(r.data?.claims || {});
                setSuccess('Fetched claims');
              } catch (e) {
                const err = e as unknown as { message?: string; code?: string };
                const msg = (err?.message || 'Failed'); const code = err?.code ? ` (${err.code})` : '';
                setError(`${msg}${code}`);
              } finally { setRoleBusy(false); }
            }}>View Claims</button>
            <button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={async ()=>{
              try {
                await auth.currentUser?.getIdToken(true);
                setSuccess('Token refreshed. If role changed, sign out/in may be required.');
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
              }
            }}>Refresh my token</button>
            {claims && (
              <pre className="mt-3 p-2 bg-gray-50 border rounded text-xs overflow-auto max-h-40">{JSON.stringify(claims, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Daily Metrics</h3>
          <MetricsPanel dateKey={today} />
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Organizations</h3>
          <OrgPanel />
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Coupons</h3>
          <CouponPanel />
        </div>
      )}

      {isAdmin && (
        <BulkImportPanel onSuccess={handleSuccess} onError={setError} onToast={push} />
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Search Members</h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Email or Member No</label>
              <input className="mt-1 w-full border rounded px-3 py-2" placeholder="member@example.com or INT-2025-000001" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={searchLoading || !searchTerm.trim()} onClick={()=>search(searchTerm)}>Search</button>
            <button className="bg-gray-600 text-white px-4 py-2 rounded" onClick={()=>{ setSearchTerm(''); clear(); }}>Clear</button>
          </div>
          {searchError && <div className="text-sm text-red-600 mt-2">{searchError}</div>}
          {!searchLoading && searchResults.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Member No</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Region</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map(u => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.memberNo}</td>
                      <td className="px-3 py-2">{renderStatus(u.status, u.expiresAt)}</td>
                      <td className="px-3 py-2">{u.region}</td>
                      <td className="px-3 py-2 text-right sticky right-0 bg-white z-10">
                        {isActive(u.status, u.expiresAt) ? (
                          <span className="text-gray-500">Active</span>
                        ) : (
                          <button className="text-indigo-600" onClick={()=>handleActivateClick(u)}>Activate Membership</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {searchLoading && <div className="text-gray-600 mt-2">Searching…</div>}
          {!searchLoading && searchResults.length === 0 && searchTerm.trim() && !searchError && (
            <div className="text-gray-600 mt-2 text-sm">No results</div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Monthly Reports</h3>
          {reportLoading ? (
            <div className="text-gray-600">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="text-gray-600">No reports yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Revenue</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.month}</td>
                      <td className="px-3 py-2">{r.total ?? 0}</td>
                      <td className="px-3 py-2">{r.revenue ?? 0}</td>
                      <td className="px-3 py-2 text-right">
                        <a className="text-indigo-600" href={`/exportMonthlyReport?month=${encodeURIComponent(r.month)}`}>Download CSV</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isLocal && (
            <div className="mt-3">
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={async ()=>{
                try {
                  const fn = httpsCallable<{ month?: string }, { ok: boolean; month: string }>(functions, 'generateMonthlyReportNow');
                  const r = await fn({});
                  handleSuccess(`Report generated for ${r.data.month}`);
                } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
              }}>Generate (emulator)</button>
            </div>
          )}
          {reports.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-1">By Region (latest)</h4>
              <RegionBarChart data={reports[0]?.byRegion || {}} />
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Exports</h3>
          <div className="flex items-center gap-2 mb-2">
            <Button onClick={async ()=>{
              try {
                const fn = httpsCallable<any, { ok: boolean; id: string }>(functions, 'startMembersExport');
                const regions = expFilterRegions.length ? expFilterRegions : undefined;
                const payload: any = { filters: { regions } };
                if (expFilterStatus) payload.filters.status = expFilterStatus;
                if (expFilterDays > 0) payload.filters.expiringBefore = new Date(Date.now() + expFilterDays*24*3600*1000).toISOString();
                const cols = Object.entries(expColumns).filter(([,v])=>v).map(([k])=>k);
                payload.columns = cols;
                const r = await fn(payload);
                setCurrentExportId((r.data as any)?.id || null);
                push({ type: 'success', message: 'Export started' });
              } catch (e) {
                push({ type: 'error', message: 'Failed to start export' });
              }
            }} disabled={exportsList.some(e => e.status === 'running')}>Start Members CSV Export</Button>
            <Button variant="ghost" onClick={()=> setExportsLimit(l => l === 5 ? 20 : 5)}>{exportsLimit === 5 ? 'Show more' : 'Show less'}</Button>
          </div>
          <div className="border rounded p-3 mb-3 bg-white">
            <div className="text-sm font-medium mb-2">Export builder</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs text-gray-600">Regions</label>
                <select multiple className="w-full border rounded px-2 py-1 text-sm" onChange={(e)=>{
                  const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
                  setExpFilterRegions(opts);
                }}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Status</label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={expFilterStatus} onChange={e=>setExpFilterStatus(e.target.value)}>
                  <option value="">(any)</option>
                  <option value="active">active</option>
                  <option value="expired">expired</option>
                  <option value="none">none</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Expiring in ≤ days</label>
                <input type="number" className="w-full border rounded px-2 py-1 text-sm" value={expFilterDays} onChange={e=>setExpFilterDays(Number(e.target.value||0))} />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">Columns</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.keys(expColumns).map(k => (
                <label key={k} className="inline-flex items-center gap-2"><input type="checkbox" checked={!!expColumns[k]} onChange={(e)=> setExpColumns(s=>({ ...s, [k]: e.target.checked }))} />{k}</label>
              ))}
            </div>
          </div>
          {currentExport && (
            <div className="mb-3 p-2 bg-gray-50 border rounded">
              <div className="text-sm">Current export: <span className="font-mono">{currentExport.id}</span> — <span className="font-medium">{currentExport.status}</span></div>
              <div className="text-xs text-gray-600">Rows: {currentExport?.progress?.rows ?? currentExport.count ?? 0} • Bytes: {currentExport?.progress?.bytes ?? currentExport.size ?? 0}</div>
            </div>
          )}
          {exportsList.length === 0 ? (
            <div className="text-gray-600 text-sm">No exports yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Count</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exportsList.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">{e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000).toLocaleString() : ''}</td>
                      <td className="px-3 py-2">{statusBadge(e.status)}</td>
                      <td className="px-3 py-2">{e.count ?? '—'}</td>
                      <td className="px-3 py-2">{formatBytes(e.size)}</td>
                      <td className="px-3 py-2 flex items-center gap-2">
                        {e.url ? (
                          <>
                            <a className="text-indigo-600 underline" href={e.url} target="_blank" rel="noreferrer">Download</a>
                            <button className="text-gray-600 underline" onClick={()=>copy(e.url!, 'Link copied')}>Copy link</button>
                          </>
                        ) : (
                          <span className="text-gray-500">(no link)</span>
                        )}
                        {e.path && (
                          <>
                            <button className="text-gray-600 underline" onClick={()=>copy(`gs://${storageBucket}/${e.path}`, 'gs:// path copied')}>Copy gs://</button>
                            <a className="text-gray-600 underline" href={`https://console.cloud.google.com/storage/browser/_details/${encodeURIComponent(storageBucket)}/${encodeURIComponent(e.path)}?project=${encodeURIComponent(projectId)}`} target="_blank" rel="noreferrer">Open in GCS</a>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isAdmin && <CardKeysPanel />}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Maintenance</h3>
          <p className="text-sm text-gray-600 mb-2">One-off tasks for admins. These run against the current project.</p>
          <div className="flex gap-2">
            <button className="bg-gray-700 text-white px-3 py-2 rounded" onClick={()=>{
              setBfPage(0); setBfUpdated(0); setBfNext(null); setBfCancel(false); setShowBackfill(true);
            }}>Run full backfill…</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Repeat until nextStartAfter is null to complete backfill for all members.</p>
        </div>
      )}

      {showBackfill && (
        <BackfillDialog
          onClose={()=>{ setShowBackfill(false); }}
          running={bfRunning}
          page={bfPage}
          updated={bfUpdated}
          nextStartAfter={bfNext}
          onStart={async ()=>{
            setBfCancel(false); setBfRunning(true);
            try {
              const fn = httpsCallable<{ pageSize?: number; startAfter?: string }, { page:number; updated:number; nextStartAfter:string|null }>(functions, 'backfillNameLower');
              let next: string | null | undefined = bfNext || null;
              let pages = bfPage;
              let updated = bfUpdated;
              // Loop until finished or cancel requested
              while (!bfCancel) {
                const payload: { pageSize?: number; startAfter?: string } = { pageSize: 500 };
                if (next) payload.startAfter = next;
                const r = await fn(payload);
                const d = r.data;
                pages += 1;
                updated += d.updated;
                next = d.nextStartAfter;
                setBfPage(pages); setBfUpdated(updated); setBfNext(next ?? null);
                if (!next) break;
                // Let UI breathe
                await new Promise(res => setTimeout(res, 50));
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              setError(msg);
            } finally {
              setBfRunning(false);
            }
          }}
          onStop={()=>{ setBfCancel(true); setBfRunning(false); }}
        />
      )}

      {isAdmin && (
        <div className="mb-6 p-4 border rounded bg-white">
          <h3 className="text-lg font-semibold mb-2">Recent Audit Logs</h3>
          {auditLoading && <div className="text-gray-600">Loading…</div>}
          {auditError && <div className="text-red-600">Failed to load audit logs: {auditError.message}</div>}
          {!auditLoading && !auditError && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td className="px-3 py-2 text-gray-500" colSpan={5}>No recent entries.</td></tr>
                  ) : (
                    auditLogs.map(a => {
                      const ts = a.ts && (a.ts as unknown as { seconds?: number }).seconds
                        ? new Date(((a.ts as unknown as { seconds: number }).seconds) * 1000).toLocaleString()
                        : '—';
                      const details = a.action === 'setUserRole'
                        ? `role=${a.role || ''} regions=${(a.allowedRegions||[]).join(',')}`
                        : a.action === 'startMembership'
                        ? `year=${a.year} amount=${a.amount} ${a.currency} method=${a.method}`
                        : '';
                      return (
                        <tr key={a.id} className="border-t">
                          <td className="px-3 py-2 whitespace-nowrap">{ts}</td>
                          <td className="px-3 py-2">{a.action}</td>
                          <td className="px-3 py-2">{a.actor || '—'}</td>
                          <td className="px-3 py-2">{a.target || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{details}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {usersError && <p className="text-red-500">{usersError.message}</p>}
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      {isAdmin && (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="flex items-end justify-between p-4 border-b bg-gray-50 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Region filter</label>
            <select className="mt-1 border rounded px-3 py-2" value={regionFilter} onChange={(e)=> setRegionFilter(e.target.value)}>
              <option value="ALL">All regions</option>
              {REGIONS.map(r => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Status filter</label>
            <select className="mt-1 border rounded px-3 py-2" value={statusFilter} onChange={(e)=> setStatusFilter(e.target.value as 'ALL'|'ACTIVE'|'EXPIRED'|'INACTIVE')}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50" onClick={prevPage} disabled={!hasPrev}>Prev</button>
            <div className="text-sm text-gray-700">Page {page}</div>
            <button className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50" onClick={nextPage} disabled={!hasNext}>Next</button>
          </div>
          <label className="inline-flex items-center gap-2 text-sm ml-2">
            <input type="checkbox" checked={expiringSoon} onChange={(e)=> setExpiringSoon(e.target.checked)} /> Expiring in 30 days
          </label>
        </div>
        <table className="min-w-full leading-normal" data-testid="users-table">
          <thead>
            <tr>
              <th className="px-3 py-3 border-b-2 border-gray-200 bg-gray-100">
                <input type="checkbox" data-testid="header-select-all" aria-label="Select all" checked={allSelected} onChange={(e)=>{
                  const on = e.target.checked; const map: Record<string, boolean> = {};
                  if (on) users.forEach(u => { if (u.id) map[u.id] = true; });
                  setSelected(on ? map : {});
                }} />
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member No</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-3 py-2 border-b border-gray-200 bg-white text-sm">
                  <input type="checkbox" data-testid="row-select" checked={!!selected[user.id!]} onChange={(e)=> setSelected(prev => ({ ...prev, [user.id!]: e.target.checked }))} />
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.name}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.email}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.memberNo}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{renderStatus(user.status, user.expiresAt)}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.region}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right sticky right-0 bg-white z-10">
                  {isActive(user.status, user.expiresAt) ? (
                    <span className="text-gray-500">Active</span>
                  ) : (
                    <>
                      <button data-testid="activate-btn" onClick={() => handleActivateClick(user)} className="text-indigo-600 hover:text-indigo-900 mr-2">
                        Activate
                      </button>
                      <QuickRenew uid={user.id!} onDone={() => { refresh(); handleSuccess('Membership activated'); }} />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 border-t">
            <div className="text-sm">Selected: <span className="font-medium">{selectedIds.length}</span></div>
            <BulkRenewBar ids={selectedIds} onDone={() => { setSelected({}); refresh(); handleSuccess('Bulk renew completed'); }} />
          </div>
        )}
      </div>
      )}

      {isModalOpen && selectedUser && (
        <ActivateMembershipModal
          user={{ id: selectedUser.id!, email: selectedUser.email }}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function isActive(status?: string, expiresAt?: { seconds?: number | undefined } | null): boolean {
  const s = (status || '').toString().toLowerCase();
  if (s === 'active') return true;
  const sec = typeof expiresAt?.seconds === 'number' ? expiresAt.seconds : undefined;
  if (typeof sec === 'number' && sec * 1000 > Date.now()) return true;
  return false;
}

function renderStatus(status?: string, expiresAt?: { seconds?: number | undefined } | null) {
  const active = isActive(status, expiresAt);
  const label = active ? 'ACTIVE' : (status === 'expired' ? 'EXPIRED' : 'INACTIVE');
  const cls = active
    ? 'bg-green-100 text-green-800'
    : (status === 'expired' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800');
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

function QuickRenew({ uid, onDone }: { uid: string; onDone?: ()=>void }) {
  const year = new Date().getUTCFullYear();
  const [price, setPrice] = useState(25);
  const [busy, setBusy] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <select className="border rounded px-1 py-1 text-sm" defaultValue={String(year)} disabled={busy}>
        <option value={year}>{year}</option>
        <option value={year+1}>{year+1}</option>
      </select>
      <input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={price} onChange={(e)=> setPrice(Number(e.target.value))} disabled={busy} />
      <Button className="px-2 py-1 text-xs" disabled={busy} onClick={async ()=>{
        setBusy(true);
        try {
      const fn = httpsCallable<{ uid: string; year: number; price: number; currency: 'EUR'; paymentMethod: 'cash' }, { message: string; refPath: string }>(functions, 'startMembership');
          await fn({ uid, year, price, currency: 'EUR', paymentMethod: 'cash' });
          if (onDone) onDone();
        } catch (e) {
          console.error(e);
        } finally {
          setBusy(false);
        }
      }}>Quick renew</Button>
    </span>
  );
}

function BulkRenewBar({ ids, onDone }: { ids: string[]; onDone?: ()=>void }) {
  const year = new Date().getUTCFullYear();
  const [price, setPrice] = useState(25);
  const [busy, setBusy] = useState(false);
  const [countDone, setCountDone] = useState(0);
  return (
    <span className="inline-flex items-center gap-2">
      <label className="text-sm">Year</label>
      <select className="border rounded px-1 py-1 text-sm" defaultValue={String(year)} disabled={busy}>
        <option value={year}>{year}</option>
        <option value={year+1}>{year+1}</option>
      </select>
      <label className="text-sm">Amount</label>
      <input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={price} onChange={(e)=> setPrice(Number(e.target.value))} disabled={busy} />
      <Button data-testid="bulk-renew" className="px-2 py-1 text-xs" disabled={busy || ids.length === 0} onClick={async ()=>{
        setBusy(true); setCountDone(0);
        try {
      const fn = httpsCallable<{ uid: string; year: number; price: number; currency: 'EUR'; paymentMethod: 'cash' }, { message: string; refPath: string }>(functions, 'startMembership');
          for (const uid of ids) {
            await fn({ uid, year, price, currency: 'EUR', paymentMethod: 'cash' });
            setCountDone(c => c + 1);
          }
          if (onDone) onDone();
        } catch (e) {
          console.error(e);
        } finally {
          setBusy(false);
        }
      }}>Renew selected</Button>
      {busy && <span className="text-xs text-gray-600">{countDone}/{ids.length}</span>}
    </span>
  );
}

function RegionBarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <div className="text-gray-600 text-sm">No data.</div>;
  const max = Math.max(...entries.map(([, v]) => v || 0), 1);
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <div className="w-28 text-xs text-gray-600">{k}</div>
          <div className="h-3 bg-gray-200 rounded w-full">
            {(() => {
              const ratio = Math.max(0, Math.min(1, (v || 0) / max));
              const pct = Math.round(ratio * 100);
              const wClass = pct >= 88 ? 'w-full' : pct >= 63 ? 'w-3/4' : pct >= 38 ? 'w-1/2' : pct >= 13 ? 'w-1/4' : 'w-0';
              return <div className={`h-3 bg-indigo-500 rounded ${wClass}`} />;
            })()}
          </div>
          <div className="w-10 text-xs text-gray-700 text-right">{v || 0}</div>
        </div>
      ))}
    </div>
  );
}

function OrgPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [seats, setSeats] = useState(10);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Organization[]>([]);
  async function refresh() {
    const fn = httpsCallable<void, { items: Organization[] }>(functions, 'listOrganizations');
    const r = await fn();
    const items = (r.data.items || []).map((o) => ({
      id: String(o.id),
      name: String(o.name || ''),
      seats: Number(o.seats || 0),
      activeSeats: Number(o.activeSeats || 0),
      billingEmail: o.billingEmail ? String(o.billingEmail) : undefined,
    }));
    setItems(items);
  }
  useEffect(() => { refresh(); }, []);
  return (
    <div>
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">Name</label>
          <input id="org-name" className="mt-1 border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="org-email" className="block text-sm font-medium text-gray-700">Billing Email</label>
          <input id="org-email" className="mt-1 border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="org-seats" className="block text-sm font-medium text-gray-700">Seats</label>
          <input id="org-seats" type="number" className="mt-1 border rounded px-3 py-2 w-24" value={seats} onChange={e=>setSeats(Number(e.target.value))} />
        </div>
        <button disabled={busy || !name} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50" onClick={async ()=>{
          try { setBusy(true);
            const fn = httpsCallable<{ name: string; billingEmail?: string; seats?: number }, { ok:boolean; id:string }>(functions, 'createOrganization');
            await fn({ name, billingEmail: email, seats });
            setName(''); setEmail(''); setSeats(10);
            await refresh();
          } finally { setBusy(false); }
        }}>Create Org</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Seats</th><th className="px-3 py-2">Active</th><th className="px-3 py-2">Billing Email</th></tr>
          </thead>
          <tbody>
            {items.map(o => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.name}</td>
                <td className="px-3 py-2">{o.seats}</td>
                <td className="px-3 py-2">{o.activeSeats || 0}</td>
                <td className="px-3 py-2">{o.billingEmail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CouponPanel() {
  const [code, setCode] = useState('WELCOME');
  const [percent, setPercent] = useState(0);
  const [amount, setAmount] = useState(500);
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Coupon[]>([]);
  async function refresh() {
    const fn = httpsCallable<void, { items: Coupon[] }>(functions, 'listCoupons');
    const r = await fn();
    const items = (r.data.items || []).map((c) => ({ id: String(c.id), percentOff: Number(c.percentOff || 0), amountOff: Number(c.amountOff || 0), active: c.active !== false }));
    setItems(items);
  }
  useEffect(() => { refresh(); }, []);
  return (
    <div>
      <div className="flex gap-2 items-end mb-3">
        <div>
          <label htmlFor="coupon-code" className="block text-sm font-medium text-gray-700">Code</label>
          <input id="coupon-code" className="mt-1 border rounded px-3 py-2" value={code} onChange={e=>setCode(e.target.value)} />
        </div>
        <div>
          <label htmlFor="coupon-percent" className="block text-sm font-medium text-gray-700">Percent Off</label>
          <input id="coupon-percent" type="number" className="mt-1 border rounded px-3 py-2 w-24" value={percent} onChange={e=>setPercent(Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="coupon-amount" className="block text-sm font-medium text-gray-700">Amount Off (cents)</label>
          <input id="coupon-amount" type="number" className="mt-1 border rounded px-3 py-2 w-32" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} />Active</label>
        <button disabled={busy || !code} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50" onClick={async ()=>{
          try { setBusy(true);
            const fn = httpsCallable<{ code: string; percentOff?: number; amountOff?: number; active?: boolean }, { ok:boolean }>(functions, 'createCoupon');
            await fn({ code, percentOff: percent, amountOff: amount, active });
            await refresh();
          } finally { setBusy(false); }
        }}>Save Coupon</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600"><th className="px-3 py-2">Code</th><th className="px-3 py-2">Percent</th><th className="px-3 py-2">Amount Off</th><th className="px-3 py-2">Active</th></tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono">{c.id}</td>
                <td className="px-3 py-2">{c.percentOff || 0}</td>
                <td className="px-3 py-2">{c.amountOff || 0}</td>
                <td className="px-3 py-2">{c.active !== false ? 'yes' : 'no'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricsPanel({ dateKey }: { dateKey: string }) {
  type MetricsDoc = {
    activations_total?: number;
    activations_by_region?: Record<string, number>;
  };
  const [data, setData] = useState<MetricsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLocal = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  // Note: metrics stored at metrics/daily-YYYY-MM-DD
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const ref = doc(db, 'metrics', `daily-${dateKey}`);
        const snap = await getDoc(ref);
        setData((snap.exists() ? (snap.data() as MetricsDoc) : {}) as MetricsDoc);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [dateKey]);
  if (loading) return <div className="text-gray-600">Loading…</div>;
  if (error) return <div className="text-red-600">Failed to load metrics: {error}</div>;
  const total = data?.activations_total || 0;
  const byRegion = data?.activations_by_region || {};
  return (
    <div>
      <div className="text-sm text-gray-600">Date: {dateKey}</div>
      <div className="mt-2">Activations today: <span className="font-semibold">{total}</span></div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.keys(byRegion).length === 0 ? (
          <div className="text-sm text-gray-500">No per-region data</div>
        ) : (
          Object.entries(byRegion).map(([r, n]) => (
            <div key={r} className="text-sm"><span className="text-gray-600">{r}:</span> <span className="font-medium">{String(n)}</span></div>
          ))
        )}
      </div>
      {isLocal && <div className="mt-2 text-xs text-gray-500">Note: metrics are best-effort and update on membership activation.</div>}
    </div>
  );
}

function BackfillDialog({ onClose, running, page, updated, nextStartAfter, onStart, onStop }: { onClose: ()=>void; running: boolean; page: number; updated: number; nextStartAfter: string | null; onStart: ()=>void; onStop: ()=>void; }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Backfill nameLower</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <div>Pages processed: <span className="font-medium">{page}</span></div>
          <div>Members updated: <span className="font-medium">{updated}</span></div>
          <div>Next startAfter: <span className="font-mono break-all">{nextStartAfter ?? '(done)'}</span></div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          {!running ? (
            <button className="bg-indigo-600 text-white px-3 py-2 rounded" onClick={onStart}>Start / Resume</button>
          ) : (
            <button className="bg-gray-600 text-white px-3 py-2 rounded" onClick={onStop}>Stop</button>
          )}
          <button className="bg-gray-200 px-3 py-2 rounded" onClick={onClose}>Close</button>
        </div>
        <p className="mt-3 text-xs text-gray-500">This will iterate 500 docs per page. You can stop and resume safely; progress shows the next startAfter value.</p>
      </div>
    </div>
  );
}
function BulkImportPanel({ onSuccess, onError, onToast }: { onSuccess: (m:string)=>void; onError:(m:string)=>void; onToast: (t:{type:'success'|'error'; message:string})=>void }) {
  const [csv, setCsv] = useState('email,name,region\nexample1@example.com,Example One,PRISHTINA');
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  type ImportReport = { rows:number; created:number; updated:number; errors:Array<{ line:number; email?:string; error:string }>};
  const [report, setReport] = useState<ImportReport | null>(null);
  const importFn = httpsCallable<{csv:string; dryRun?:boolean; defaultRegion?:string}, ImportReport>(functions, 'importMembersCsv');

  async function runImport() {
    setBusy(true); setReport(null);
    try {
      const res = await importFn({ csv, dryRun });
      const data = res.data as ImportReport;
      setReport(data);
      if (!dryRun) {
        onSuccess('Import completed');
        onToast({ type: 'success', message: `Imported: ${data.created} created, ${data.updated} updated` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onError(msg);
      onToast({ type: 'error', message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Bulk Import (CSV)</h3>
      <p className="text-sm text-gray-600 mb-2">Columns: email,name,region[,phone,orgId]</p>
      <textarea className="w-full border rounded p-2 font-mono text-sm" rows={6} value={csv} onChange={e=>setCsv(e.target.value)} />
      <div className="mt-2 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)} />Dry run</label>
        <button disabled={busy} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50" onClick={runImport}>{busy ? (dryRun ? 'Checking…' : 'Importing…') : (dryRun ? 'Dry Run' : 'Import')}</button>
      </div>
      {report && (
        <div className="mt-3 text-sm">
          <div className="mb-1">Rows: {report.rows} • Created: {report.created} • Updated: {report.updated}</div>
          {report.errors && report.errors.length > 0 && (
            <div className="border rounded p-2 bg-red-50 text-red-800">
              <div className="font-medium mb-1">Errors ({report.errors.length}):</div>
              <ul className="list-disc pl-5">
                {report.errors.map((e, i) => (
                  <li key={i}>line {e.line}{e.email ? ` (${e.email})` : ''}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardKeysPanel() {
  const [activeKid, setActiveKid] = useState<string>('—');
  const [kids, setKids] = useState<string[]>([]);
  const [jti, setJti] = useState('');
  const [reason, setReason] = useState('');
  const { push } = useToast();
  useEffect(() => {
    (async () => {
      try {
        const fn = httpsCallable<void, { activeKid: string; kids: string[] }>(functions, 'getCardKeyStatusCallable');
        const r = await fn();
        setActiveKid((r.data as any)?.activeKid || '—');
        setKids(((r.data as any)?.kids || []) as string[]);
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Card Keys & Tokens</h3>
      <div className="text-sm text-gray-700 mb-2">Active key id: <span className="font-medium">{activeKid}</span></div>
      <div className="text-sm text-gray-700 mb-3">Keys present: {kids.length === 0 ? '—' : kids.map(k => (
        <span key={k} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mr-1 ${k===activeKid? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}`}>{k}</span>
      ))}</div>
      <div className="mb-3 text-xs text-gray-500">Rotation is performed by updating the Functions secret <code>CARD_JWT_ACTIVE_KID</code> and redeploying.
        <button className="ml-2 text-indigo-600 underline" onClick={async ()=>{
          const cmd = `firebase functions:secrets:set CARD_JWT_ACTIVE_KID --data=${activeKid}\nfirebase deploy --only functions`;
          try { await navigator.clipboard.writeText(cmd); push({ type: 'success', message: 'CLI copied' }); } catch { push({ type: 'error', message: 'Copy failed' }); }
        }}>Copy rotation CLI</button>
      </div>
      <div className="mt-2">
        <div className="text-sm font-medium mb-1">Revoke token by jti</div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600">jti</label>
            <input className="border rounded px-2 py-1 text-sm" placeholder="abcdef123" value={jti} onChange={e=>setJti(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600">reason</label>
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="lost device" value={reason} onChange={e=>setReason(e.target.value)} />
          </div>
          <Button onClick={async ()=>{
            try {
              const fn = httpsCallable<{ jti: string; reason?: string }, { ok: boolean }>(functions, 'revokeCardToken');
              await fn({ jti: jti.trim(), reason: reason.trim() });
              push({ type: 'success', message: 'Token revoked' });
              setJti(''); setReason('');
            } catch {
              push({ type: 'error', message: 'Failed to revoke' });
            }
          }}>Revoke</Button>
        </div>
      </div>
    </div>
  );
}
