import React, { useState } from 'react';

const Verify: React.FC = () => {
  const [memberNo, setMemberNo] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // In a real app, you would fetch this from your config
      const functionsBaseUrl = 'http://localhost:5001/demo-interdomestik/europe-west1';
      const response = await fetch(`${functionsBaseUrl}/verifyMembership?memberNo=${memberNo}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Verify Membership</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={memberNo}
          onChange={(e) => setMemberNo(e.target.value)}
          placeholder="Enter Member No (e.g., INT-2025-123456)"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {result && (
        <div className="mt-6 p-4 border rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">Verification Result</h2>
          {result.valid ? (
            <div>
              <p className="text-green-600 font-semibold">Membership is Active</p>
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Member No:</strong> {result.memberNo}</p>
              <p><strong>Region:</strong> {result.region}</p>
            </div>
          ) : (
            <p className="text-red-600 font-semibold">Membership is not valid or not found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Verify;
