import { useState } from 'react';
import { useMemberSearch } from '@/hooks/useMemberSearch';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function MemberSearchPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const { mutate: search, data: members, isPending, error } = useMemberSearch();

  const handleSearch = () => {
    if (searchTerm) {
      search(searchTerm);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Member Search</h3>
      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search by name, email, or member #"
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isPending}>
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error && <p className="text-red-500">Error: {error.message}</p>}

      {members && (
        <div>
          <h4 className="font-medium">{members.length} result(s) found</h4>
          <ul className="mt-2 space-y-2">
            {members.map((member) => (
              <li key={member.id} className="p-2 border rounded">
                <p className="font-bold">{member.fullName}</p>
                <p className="text-sm text-gray-600">{member.email}</p>
                <p className="text-sm text-gray-600">Member No: {member.memberNo || 'N/A'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
