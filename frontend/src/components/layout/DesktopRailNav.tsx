import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './PortalShell';

interface DesktopRailNavProps {
  items: PortalNavItem[];
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function DesktopRailNav({ items }: DesktopRailNavProps) {
  if (!items.length) return null;

  return (
    <aside className="hidden w-56 flex-shrink-0 lg:flex lg:flex-col lg:gap-1">
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Portal
      </h2>
      <nav aria-label="Portal sections" className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={Boolean(item.end)}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700',
                isActive && 'bg-indigo-600 text-white shadow'
              )
            }
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <Icon
                    className={classNames(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive && 'text-white'
                    )}
                  />
                  <span>{item.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default DesktopRailNav;
