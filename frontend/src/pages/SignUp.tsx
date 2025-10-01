import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import RegionSelect from '../components/RegionSelect';
import { Button } from '@/components/ui';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/useToast';
import { ProfileInput } from '../validation/profile';
import { useHttpsCallable } from '../hooks/useHttpsCallable';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {
    callFunction: upsertProfile,
    error: upsertError,
    loading,
  } = useHttpsCallable('upsertProfile');
  const { push } = useToast();

  useEffect(() => {
    if (upsertError) {
      const msg = upsertError.message || 'Sign up failed';
      setError(msg);
      push({ type: 'error', message: msg });
    }
  }, [upsertError, push]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Basic client-side validation for profile fields
    const profileParsed = ProfileInput.safeParse({ name, region, phone });
    if (!profileParsed.success) {
      const first = profileParsed.error.issues[0];
      setError(first?.message || 'Please fill the form correctly');
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Update displayName for nicer UI
      if (cred.user && name) {
        await updateProfile(cred.user, { displayName: name });
      }
      // Create profile via callable (server will set server-only fields)
      await upsertProfile({ name, phone, region });
      push({ type: 'success', message: 'Account created' });
      void navigate('/profile');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign up failed';
      setError(msg);
      push({ type: 'error', message: msg });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold mb-2">Join Interdomestik</h1>
        <p className="text-gray-600">
          Create your account to access your digital membership card, history,
          and more.
        </p>
      </div>
      <div className="max-w-md w-full mx-auto md:ml-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Create an account</h2>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Region
            </label>
            <RegionSelect
              value={region}
              onChange={setRegion}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <Input
            label="Phone (optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  );
}
