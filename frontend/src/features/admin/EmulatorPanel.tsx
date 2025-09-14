import { useEmulator } from '@/hooks/admin/useEmulator';
import { Button } from '@/components/ui';

export function EmulatorPanel({ refreshUsers }: { refreshUsers: () => void }) {
  const { loading, error, success, seedEmulator, clearEmulator } = useEmulator();

  return (
    <div className="mb-6 p-4 border rounded bg-yellow-50">
      <p className="font-medium mb-2">Emulator Utilities (local only)</p>
      <div className="flex gap-3">
        <Button onClick={() => { void seedEmulator(); }} disabled={loading}>Seed Data</Button>
        <Button onClick={() => { void clearEmulator(); }} disabled={loading}>Clear Data</Button>
        <Button onClick={refreshUsers} variant="ghost">Refresh list</Button>
      </div>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {success && <p className="text-green-500 mt-2">{success}</p>}
    </div>
  );
}
