import { useState } from 'react';
import useAdmin from '../hooks/useAdmin';
import useAgentOrAdmin from '../hooks/useAgentOrAdmin';
import { useUsers } from '../hooks/useUsers';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import ActivateMembershipModal from '../components/ActivateMembershipModal';
import AgentRegistrationCard from '../components/AgentRegistrationCard';

const exportMembersCsv = httpsCallable(functions, 'exportMembersCsv');

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { canRegister, isAgent, allowedRegions, loading: roleLoading } = useAgentOrAdmin();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivateClick = (user: any) => {
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
      const result = await exportMembersCsv();
      const csvContent = result.data as string;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'members.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleSuccess('CSV downloaded successfully');
    } catch (err: any) {
      setError(err.message);
    }
  }

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
                  <button onClick={() => handleActivateClick(user)} className="text-indigo-600 hover:text-indigo-900">
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
          user={selectedUser} 
          onClose={handleCloseModal} 
          onSuccess={handleSuccess} 
        />
      )}
    </div>
  );
}
