'use client';

const upcomingEvents = [
  {
    id: 'summit-eu',
    title: 'Quarterly Member Summit',
    date: 'October 12, 2025',
    location: 'Madrid, ES',
    focus: 'Regional policy updates • Partner showcase',
  },
  {
    id: 'webinar-renewals',
    title: 'Retention Playbook Workshop',
    date: 'November 2, 2025',
    location: 'Virtual',
    focus: 'Renewal automations • Outreach cadences',
  },
  {
    id: 'meetup-nl',
    title: 'Benelux Member Meetup',
    date: 'November 18, 2025',
    location: 'Amsterdam, NL',
    focus: 'Cross-border billing • Member spotlights',
  },
];

const quickFilters = ['All regions', 'My regions', 'Next 30 days', 'Workshops'];

export default function PortalEvents() {
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
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              {filter}
            </button>
          ))}
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
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-indigo-200 hover:text-indigo-700"
          >
            Export calendar
          </button>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingEvents.map((event) => (
            <li
              key={event.id}
              className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                  {event.date}
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
          Dynamic event feeds will tailor programming by the member’s allowed
          regions and history. This placeholder keeps the route alive while the
          automation hooks and filters roll out in Phase 2.
        </p>
      </section>
    </>
  );
}
