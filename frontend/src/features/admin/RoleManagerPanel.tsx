import { useState } from 'react';
import { useRoleManager } from '@/hooks/admin/useRoleManager';
import { REGIONS } from '@/constants/regions';
import { Button } from '@/components/ui';

export function RoleManagerPanel() {
  const {
    busy,
    error,
    success,
    claims,
    targetUid,
    findUser,
    applyRole,
    viewClaims,
    setTargetUid,
    refreshToken,
  } = useRoleManager();
  const [lookupEmail, setLookupEmail] = useState('');
  const [role, setRole] = useState<'member' | 'agent' | 'admin'>('member');
  const [regions, setRegions] = useState<string[]>([]);

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Role Management</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Lookup by email
          </label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="user@example.com"
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            void findUser(lookupEmail);
          }}
          disabled={busy}
        >
          Find UID
        </Button>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Or set UID directly
          </label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="uid_..."
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'member' | 'agent' | 'admin')
            }
          >
            <option value="member">member</option>
            <option value="agent">agent</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Allowed regions (for agents/admins)
          </label>
          <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
            {REGIONS.map((r) => (
              <label key={r} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={regions.includes(r)}
                  onChange={(e) => {
                    setRegions((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, r]))
                        : prev.filter((x) => x !== r)
                    );
                  }}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => {
            void applyRole({ uid: targetUid, role, allowedRegions: regions });
          }}
          disabled={!targetUid || busy}
        >
          Apply Role
        </Button>
        <Button
          onClick={() => {
            void viewClaims(targetUid);
          }}
          disabled={!targetUid || busy}
          variant="ghost"
        >
          View Claims
        </Button>
        <Button
          onClick={() => {
            void refreshToken();
          }}
          variant="ghost"
        >
          Refresh my token
        </Button>
        {claims && (
          <pre className="mt-3 p-2 bg-gray-50 border rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(claims, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
