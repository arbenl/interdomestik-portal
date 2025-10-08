import { Link, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import useMfaPreference from '@/hooks/useMfaPreference';
import DesktopRailNav from './DesktopRailNav';
import MobileTabNav from './MobileTabNav';

type IconProps = { className?: string };

export type PortalNavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: (props: IconProps) => ReactNode;
};

const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { to: '/portal', label: 'Overview', icon: OverviewIcon, end: true },
  { to: '/portal/profile', label: 'Profile', icon: ProfileIcon },
  { to: '/portal/membership', label: 'Membership', icon: MembershipIcon },
  { to: '/portal/billing', label: 'Billing', icon: BillingIcon },
  { to: '/portal/documents', label: 'Documents', icon: DocumentsIcon },
  { to: '/portal/events', label: 'Events', icon: EventsIcon },
  { to: '/portal/support', label: 'Support', icon: SupportIcon },
];

interface PortalShellProps {
  header?: ReactNode;
  children?: ReactNode;
}

export function PortalShell({ header, children }: PortalShellProps) {
  const { isAdmin, isAgent, mfaEnabled } = useAuth();
  const { setMfaPreference, updating } = useMfaPreference();
  const showMfaPrompt = (isAdmin || isAgent) && !mfaEnabled;
  const content = children ?? <Outlet />;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl gap-6 px-4 pb-24 pt-4 lg:pb-8 lg:pt-6">
      <DesktopRailNav items={PORTAL_NAV_ITEMS} />
      <main className="flex-1 space-y-4">
        {showMfaPrompt ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900">
                Protect exports with multi-factor authentication
              </p>
              <p className="text-xs text-amber-800">
                Staff accounts need MFA before exporting billing data or
                sensitive reports. Confirm your enrollment to remove this
                reminder.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                to="/portal/support"
                className="inline-flex items-center justify-center rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
              >
                Review MFA checklist
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => {
                  void setMfaPreference(true);
                }}
                disabled={updating}
              >
                {updating ? 'Updating…' : 'Mark MFA enabled'}
              </button>
            </div>
          </div>
        ) : null}
        {header ? <div className="space-y-2">{header}</div> : null}
        {content}
      </main>
      <MobileTabNav items={PORTAL_NAV_ITEMS} />
    </div>
  );
}

export default PortalShell;

function OverviewIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 11.25 12 4l8.25 7.25M6 10.5v8.25A1.25 1.25 0 0 0 7.25 20h3.5v-5h2.5v5h3.5A1.25 1.25 0 0 0 18 18.75V10.5"
      />
    </svg>
  );
}

function ProfileIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7.5 8.25a7.5 7.5 0 0 1 15 0"
      />
    </svg>
  );
}

function MembershipIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <rect x={3.5} y={5.75} width={17} height={12.5} rx={2} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 10h4m-4 3h6.5"
      />
    </svg>
  );
}

function BillingIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 4.75h10.5a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V6.25a1.5 1.5 0 0 1 1.5-1.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.75 8.75h6.5M8.75 12h6.5M8.75 15.25h3.5"
      />
    </svg>
  );
}

function DocumentsIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3.75h6.25L19.5 9v11.25A1.25 1.25 0 0 1 18.25 21H8A1.25 1.25 0 0 1 6.75 19.75V5A1.25 1.25 0 0 1 8 3.75Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4v4.5H18" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.5h6M9 15.5h4"
      />
    </svg>
  );
}

function EventsIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <rect x={4} y={5.5} width={16} height={14} rx={2} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3.5v3m8-3v3M4 9.5h16"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 13.5h2.5v2.5H9.5Z"
      />
    </svg>
  );
}

function SupportIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <circle cx={12} cy={12} r={8} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.5 1.5M12 16h.01"
      />
    </svg>
  );
}
