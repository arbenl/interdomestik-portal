import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import { Button } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '../components/ui/useToast';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    const projectId = auth?.app?.options?.projectId;
    if (projectId) {
      console.log('Firebase Project ID:', projectId);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      push({ type: 'success', message: 'Signed in successfully' });
      void navigate('/profile');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign in failed';
      setError(msg);
      push({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-600">
          Sign in to access your digital membership card and profile.
        </p>
      </div>
      <div className="max-w-md w-full mx-auto md:ml-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Sign In</h2>
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
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
