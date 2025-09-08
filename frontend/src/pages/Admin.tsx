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

//

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { canRegister, allowedRegions, loading: roleLoading } = useAgentOrAdmin();
  const { users, loading: usersLoading, error: usersError, refresh } = useUsers({ allowedRegions });
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
  const [searchTerm, setSearchTerm] = useState('');
  const { results: searchResults, loading: searchLoading, error: searchError, search, clear } = useMemberSearch();

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
                      <td className="px-3 py-2">{u.region}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-indigo-600" onClick={()=>handleActivateClick(u)}>Activate Membership</button>
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
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Member No</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.name}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.email}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.memberNo}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{user.region}</td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button data-testid="activate-btn" onClick={() => handleActivateClick(user)} className="text-indigo-600 hover:text-indigo-900">
                    Activate Membership
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
