import React from 'react';
import { useAuth } from '../context/auth';
import { useMembershipHistory } from '../hooks/useMembershipHistory';
import type { Membership } from '@/types';

const MembershipPage: React.FC = () => {
  const { user } = useAuth();
  const { data: history, isLoading, error } = useMembershipHistory(user?.uid);

  if (isLoading) {
    return <div>Loading membership history...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading history: {error.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Membership History</h1>
      {history?.length === 0 ? (
        <p>You have no membership history.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Year</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Start Date</th>
                <th className="py-3 px-4 text-left">End Date</th>
                <th className="py-3 px-4 text-left">Price</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {history?.map((item: Membership) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-4">{item.year}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{item.startedAt ? new Date(item.startedAt.seconds * 1000).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-4">{item.expiresAt ? new Date(item.expiresAt.seconds * 1000).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-4">{item.price} {item.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MembershipPage;
