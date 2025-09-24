import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import AgentRegistrationCard from '@/components/AgentRegistrationCard';
import type { Profile } from '@/types';

export default function AgentTools() {
  const { isAdmin, isAgent, allowedRegions, loading } = useAuth();
  const canRegister = isAdmin || isAgent;
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const agentRegions = isAgent ? allowedRegions : [];
  const { data, isLoading, refetch } = useUsers({
    allowedRegions: agentRegions,
    limit: 20,
    region: 'ALL',
    status: 'ALL',
    expiringDays: null,
    enabled: isAgent
  });
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrgId, setEditOrgId] = useState('');

  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;

  if (!canRegister) return <div className="text-center mt-10"><p>You are not authorized to view this page.</p></div>;

  const users = data?.pages.flatMap(page => page.users) || [];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{isAgent ? 'Agent Tools' : 'Admin — Agent Tools'}</h2>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <AgentRegistrationCard allowedRegions={allowedRegions} onSuccess={setSuccess} onError={setError} />

      {isAgent && (
        <div className="mt-8 border rounded bg-white">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">My Members</h3>
            <button className="text-sm text-indigo-600" onClick={() => void refetch()}>Refresh</button>
          </div>
          {isLoading ? (
            <div className="p-4 text-gray-600">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-gray-600">No members yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Member No</th>
                    <th className="px-3 py-2">Region</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Org ID</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: Profile) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">
                        {editRow === u.id ? (
                          <input
                            data-cy="agent-edit-name"
                            value={editName}
                            onChange={e=>setEditName(e.target.value)}
                            className="border rounded px-2 py-1 w-40"
                            disabled={false}
                            readOnly={false}
                          />
                        ) : (u.name || '—')}
                      </td>
                      <td className="px-3 py-2">{u.email || '—'}</td>
                      <td className="px-3 py-2">{u.memberNo || '—'}</td>
                      <td className="px-3 py-2">{u.region || '—'}</td>
                      <td className="px-3 py-2">
                        {editRow === u.id ? (
                          <input
                            data-cy="agent-edit-phone"
                            value={editPhone}
                            onChange={e=>setEditPhone(e.target.value)}
                            className="border rounded px-2 py-1 w-36"
                            disabled={false}
                            readOnly={false}
                          />
                        ) : (u.phone || '—')}
                      </td>
                      <td className="px-3 py-2">
                        {editRow === u.id ? (
                          <input
                            data-cy="agent-edit-orgid"
                            value={editOrgId}
                            onChange={e=>setEditOrgId(e.target.value)}
                            className="border rounded px-2 py-1 w-28"
                            disabled={false}
                            readOnly={false}
                          />
                        ) : (u.orgId || '—')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editRow === u.id ? (
                          <>
                            <button className="text-green-700 mr-2" onClick={() => { void (async ()=>{
                              try {
                                if (!u.id) return;
                                await updateDoc(doc(firestore, 'members', u.id), { name: editName, phone: editPhone, orgId: editOrgId });
                                setEditRow(null);
                                setSuccess('Member updated');
                                void refetch();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
                              }
                            })(); }}>Save</button>
                            <button className="text-gray-600" onClick={()=> setEditRow(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="text-indigo-600" onClick={()=>{ setEditRow(u.id!); setEditName(u.name || ''); setEditPhone(u.phone || ''); setEditOrgId(u.orgId || ''); }}>Edit</button>
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
    </div>
  );
}
