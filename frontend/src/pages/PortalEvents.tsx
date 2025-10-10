'use client';

import { useMemo, useState } from 'react';
import usePortalEvents from '@/hooks/usePortalEvents';
import { useAuth } from '@/hooks/useAuth';

const FILTERS = ['All regions', 'My regions', 'Next 30 days', 'Workshops'] as const;
type FilterOption = (typeof FILTERS)[number];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function withinNextThirtyDays(date: Date | null): boolean {
  if (!date) return false;
  const now = Date.now();
  const time = date.getTime();
  if (Number.isNaN(time)) return false;
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  return time >= now && time - now <= windowMs;
}

export default function PortalEvents() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All regions');
  const { allowedRegions } = useAuth();
  const allowedRegionSet = useMemo(() => {
    if (!allowedRegions || allowedRegions.length === 0) return new Set<string>();
    return new Set(allowedRegions.map((region) => region.toUpperCase()));
  }, [allowedRegions]);
  const { events, isEnabled, isLoading, isError } = usePortalEvents();

  const filteredEvents = useMemo(() => {
    switch (activeFilter) {
      case 'My regions': {
        if (allowedRegionSet.size === 0) return events;
        return events.filter((event) =>
          event.regions.some((region) =>
            allowedRegionSet.has(region.toUpperCase())
          )
        );
      }
      case 'Next 30 days':
        return events.filter((event) => withinNextThirtyDays(event.date));
      case 'Workshops':
        return events.filter((event) => event.tags.includes('workshop'));
      case 'All regions':
      default:
        return events;
    }
  }, [activeFilter, events, allowedRegionSet]);

  const showExportButton = isEnabled && filteredEvents.length > 0;

  return (
    <>
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Upcoming events
          </h1>
          <p className="text-sm text-gray-500">
            Plan outreach with region-aware programming and onboarding sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <button
                key={filter}
                type="button"
                className={classNames(
                  'rounded-full border px-3 py-1 transition',
                  isActive
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow'
                    : 'border-indigo-100 bg-white text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50'
                )}
                aria-pressed={isActive}
                onClick={() => {
                  setActiveFilter(filter);
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>
      <section aria-labelledby="events-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="events-heading"
            className="text-lg font-semibold text-gray-900"
          >
            Featured programs
          </h2>
          {showExportButton ? (
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Export calendar
            </button>
          ) : (
            <span className="text-xs uppercase tracking-wide text-gray-400">
              Preview mode
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            Loading events…
          </div>
        ) : null}
        {isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load events. Please refresh the page.
          </div>
        ) : null}
        {!isLoading && !isError ? (
          filteredEvents.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                      {formatDate(event.date)}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500">{event.location}</p>
                    <p className="text-sm text-gray-600">{event.focus}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                      Registration open
                    </span>
                    <button
                      type="button"
                      className="text-indigo-600 transition hover:text-indigo-700"
                    >
                      View details
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No events match this filter yet. Try a different view or check back
              later.
            </div>
          )
        ) : null}
      </section>
      <section
        aria-labelledby="events-updates"
        className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600"
      >
        <h2
          id="events-updates"
          className="text-base font-semibold text-gray-800"
        >
          What’s coming next
        </h2>
        <p className="mt-2">
          {isEnabled
            ? 'Dynamic event feeds tailor programming by allowed regions and history. Additional workshop filters roll out throughout Phase 2.'
            : 'Dynamic event feeds will tailor programming by the member’s allowed regions and history. This placeholder keeps the route alive while the automation hooks and filters roll out in Phase 2.'}
        </p>
      </section>
    </>
  );
}
