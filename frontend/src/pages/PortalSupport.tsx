'use client';

const supportShortcuts = [
  {
    id: 'renewal-checklist',
    title: 'Renewal checklist',
    description:
      'Step-by-step guidance for renewals, eligibility, and communications.',
    cta: 'Open checklist',
  },
  {
    id: 'secure-docs',
    title: 'Share secure documents',
    description:
      'Upload and control access to agreements, invoices, and identity docs.',
    cta: 'Launch document vault',
  },
  {
    id: 'contact-agent',
    title: 'Contact an agent',
    description:
      'Ping your assigned agent or schedule a callback for regional support.',
    cta: 'Request callback',
  },
];

const helpChannels = [
  { label: 'Email', value: 'support@interdomestik.example' },
  { label: 'Phone', value: '+34 91 123 4567 (09:00–18:00 CET)' },
  { label: 'Slack', value: '#member-success (admins only)' },
];

export default function PortalSupport() {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Support hub</h1>
        <p className="text-sm text-gray-500">
          Self-service tasks today, proactive alerts and MFA enforcement next.
        </p>
      </div>
      <section aria-labelledby="support-shortcuts" className="space-y-4">
        <h2
          id="support-shortcuts"
          className="text-lg font-semibold text-gray-900"
        >
          Quick actions
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supportShortcuts.map((shortcut) => (
            <li
              key={shortcut.id}
              className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {shortcut.title}
                </h3>
                <p className="text-sm text-gray-600">{shortcut.description}</p>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center justify-center rounded-md border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                {shortcut.cta}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="support-channels" className="space-y-3">
        <h2
          id="support-channels"
          className="text-lg font-semibold text-gray-900"
        >
          Contact channels
        </h2>
        <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-3">
          {helpChannels.map((channel) => (
            <div key={channel.label} className="space-y-1 text-sm">
              <p className="font-medium text-gray-700">{channel.label}</p>
              <p className="text-gray-600">{channel.value}</p>
            </div>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="support-roadmap"
        className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600"
      >
        <h2
          id="support-roadmap"
          className="text-base font-semibold text-gray-800"
        >
          Coming soon
        </h2>
        <p className="mt-2">
          Secure document sharing, MFA status management, and audit trails will
          light up here as part of the Modern Portal rollout. Use this
          placeholder to validate navigation, layout, and mobile responsiveness
          while the services are finalized.
        </p>
      </section>
    </>
  );
}
