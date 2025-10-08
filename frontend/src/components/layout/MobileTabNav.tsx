import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './PortalShell';

interface MobileTabNavProps {
  items: PortalNavItem[];
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function MobileTabNav({ items }: MobileTabNavProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Portal navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-gray-200 bg-white px-2 py-2 shadow-lg lg:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={Boolean(item.end)}
          className={({ isActive }) =>
            classNames(
              'flex w-full max-w-[96px] flex-col items-center rounded-2xl px-2 py-1 text-[11px] font-medium leading-tight text-gray-500 transition-colors',
              isActive && 'bg-indigo-100 text-indigo-700 shadow'
            )
          }
        >
          {({ isActive }) => {
            const Icon = item.icon;
            return (
              <>
                <Icon
                  className={classNames(
                    'mb-1 h-5 w-5 transition-colors',
                    isActive && 'text-indigo-700'
                  )}
                />
                <span>{item.label}</span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileTabNav;
