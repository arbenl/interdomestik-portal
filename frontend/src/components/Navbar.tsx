import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { signOut as fbSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { queryClient } from '../queryClient';
import {
  getMemberProfile,
  getMembershipHistory,
  getInvoices,
} from '../services/member';
import { getUsers } from '../services/admin';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const greeting = user?.displayName || user?.email || null;
  const initials = (() => {
    const name = user?.displayName || user?.email || '';
    const parts = name.replace(/@.*/, '').trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || name[0]?.toUpperCase() || 'U';
  })();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const prefetchPortalData = () => {
    if (user) {
      void queryClient.prefetchQuery({
        queryKey: ['memberProfile', user.uid],
        queryFn: () => getMemberProfile(user.uid),
      });
      void queryClient.prefetchQuery({
        queryKey: ['membershipHistory', user.uid],
        queryFn: () => getMembershipHistory(user.uid),
      });
    }
  };

  const prefetchAdminData = () => {
    void queryClient.prefetchInfiniteQuery({
      queryKey: ['users', { region: 'ALL', status: 'ALL', expiringDays: null }],
      queryFn: ({ pageParam }) =>
        getUsers({
          allowedRegions: [],
          region: 'ALL',
          status: 'ALL',
          expiringDays: null,
          pageParam,
          limitNum: 25,
        }),
      getNextPageParam: () => null,
      initialPageParam: null,
    });
  };

  const prefetchBillingData = () => {
    if (user) {
      void queryClient.prefetchQuery({
        queryKey: ['invoices', user.uid],
        queryFn: () => getInvoices(user.uid),
      });
    }
  };

  return (
    <nav className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <ul className="flex gap-4 text-sm list-none m-0 p-0">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li onMouseEnter={prefetchPortalData}>
          <Link to="/portal">Portal</Link>
        </li>
        <li>
          <Link to="/signin">Sign In</Link>
        </li>
        <li>
          <Link to="/signup">Sign Up</Link>
        </li>
        <li onMouseEnter={prefetchPortalData}>
          <Link to="/profile">Profile</Link>
        </li>
        <li>
          <Link to="/agent">Agent</Link>
        </li>
        <li onMouseEnter={prefetchAdminData}>
          <Link to="/admin">Admin</Link>
        </li>
        <li onMouseEnter={prefetchBillingData}>
          <Link to="/billing">Billing</Link>
        </li>
      </ul>
      {greeting && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-600"
          >
            <span className="hidden sm:inline">Hi, {greeting}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
              {initials}
            </div>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white shadow-md z-10">
              <Link
                to="/portal"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                Portal
              </Link>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                Profile
              </Link>
              <Link
                to="/membership"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                History
              </Link>
              <button
                type="button"
                onClick={() => {
                  void fbSignOut(auth).finally(() => {
                    setOpen(false);
                    void navigate('/signin');
                  });
                }}
                className="w-full text-left block px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
