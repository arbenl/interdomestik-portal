import { useState } from 'react';
import type { Profile } from '../types';
import useAdmin from '../hooks/useAdmin';
import useAgentOrAdmin from '../hooks/useAgentOrAdmin';
import { useUsers } from '../hooks/useUsers';
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
