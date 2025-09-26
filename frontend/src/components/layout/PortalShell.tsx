import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import useMfaPreference from '@/hooks/useMfaPreference';

type IconProps = { className?: string };
type PortalNavLink = {
  to: string;
  label: string;
  icon: (props: IconProps) => ReactNode;
  end?: boolean;
};

const portalLinks: PortalNavLink[] = [
  { to: '/portal', label: 'Overview', icon: OverviewIcon, end: true },
  { to: '/portal/profile', label: 'Profile', icon: ProfileIcon },
  { to: '/portal/membership', label: 'Membership', icon: MembershipIcon },
  { to: '/portal/billing', label: 'Billing', icon: BillingIcon },
  { to: '/portal/documents', label: 'Documents', icon: DocumentsIcon },
  { to: '/portal/events', label: 'Events', icon: EventsIcon },
  { to: '/portal/support', label: 'Support', icon: SupportIcon },
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface PortalShellProps {
  header?: ReactNode;
  children: ReactNode;
}

export function PortalShell({ header, children }: PortalShellProps) {
  const { isAdmin, isAgent, mfaEnabled } = useAuth();
  const { setMfaPreference, updating } = useMfaPreference();
  const showMfaPrompt = (isAdmin || isAgent) && !mfaEnabled;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl gap-6 px-4 pb-24 pt-4 lg:pb-8 lg:pt-6">
      <aside className="hidden w-56 flex-shrink-0 lg:flex lg:flex-col lg:gap-1">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Portal</h2>
        <nav aria-label="Portal sections" className="mt-2 flex flex-col gap-1">
          {portalLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={Boolean(link.end)}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700',
                  isActive && 'bg-indigo-600 text-white shadow'
                )
              }
            >
              {({ isActive }) => {
                const Icon = link.icon;
                return (
                  <>
                    <Icon className={classNames('h-5 w-5 shrink-0 transition-colors', isActive && 'text-white')} />
                    <span>{link.label}</span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 space-y-4">
        {showMfaPrompt ? (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900">Protect exports with multi-factor authentication</p>
              <p className="text-xs text-amber-800">
                Staff accounts need MFA before exporting billing data or sensitive reports. Confirm your enrollment to remove this reminder.
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
                onClick={() => { void setMfaPreference(true); }}
                disabled={updating}
              >
                {updating ? 'Updating…' : 'Mark MFA enabled'}
              </button>
            </div>
          </div>
        ) : null}
        {header ? <div className="space-y-2">{header}</div> : null}
        {children}
      </main>
      <nav
        aria-label="Portal navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-gray-200 bg-white px-2 py-2 shadow-lg lg:hidden"
      >
        {portalLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={Boolean(link.end)}
            className={({ isActive }) =>
              classNames(
                'flex w-full max-w-[96px] flex-col items-center rounded-2xl px-2 py-1 text-[11px] font-medium leading-tight text-gray-500 transition-colors',
                isActive && 'bg-indigo-100 text-indigo-700 shadow'
              )
            }
          >
            {({ isActive }) => {
              const Icon = link.icon;
              return (
                <>
                  <Icon className={classNames('mb-1 h-5 w-5 transition-colors', isActive && 'text-indigo-700')} />
                  <span>{link.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 10h4m-4 3h6.5" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 8.75h6.5M8.75 12h6.5M8.75 15.25h3.5" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5h6M9 15.5h4" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3.5v3m8-3v3M4 9.5h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 13.5h2.5v2.5H9.5Z" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5M12 16h.01" />
    </svg>
  );
}
