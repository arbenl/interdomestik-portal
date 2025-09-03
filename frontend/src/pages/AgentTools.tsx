import { useState } from 'react';
import useAgentOrAdmin from '../hooks/useAgentOrAdmin';
import AgentRegistrationCard from '../components/AgentRegistrationCard';

export default function AgentTools() {
  const { canRegister, isAgent, isAdmin, allowedRegions, loading } = useAgentOrAdmin();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;

  if (!canRegister) return <div className="text-center mt-10"><p>You are not authorized to view this page.</p></div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{isAgent ? 'Agent Tools' : 'Admin — Agent Tools'}</h2>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <AgentRegistrationCard allowedRegions={allowedRegions} onSuccess={setSuccess} onError={setError} />
    </div>
  );
}

