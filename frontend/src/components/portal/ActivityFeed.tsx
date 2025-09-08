type Item = { id: string; type: 'announcement' | 'event' | 'member'; title: string; meta?: string };

export default function ActivityFeed({ items }: { items?: Item[] }) {
  const data: Item[] = items ?? [
    { id: '1', type: 'announcement', title: 'Welcome to the new portal ✨', meta: 'Interdomestik' },
    { id: '2', type: 'event', title: 'Regional meetup in PRISHTINA — Oct 15', meta: 'Events' },
    { id: '3', type: 'member', title: 'Member Two renewed membership for 2025', meta: 'Activity' },
  ];
  const icon = (t: Item['type']) => {
    if (t === 'event') return '📅';
    if (t === 'member') return '👤';
    return '📣';
  };
  return (
    <ul className="divide-y divide-gray-100">
      {data.map((it) => (
        <li key={it.id} className="py-2 flex items-start gap-3">
          <span className="text-lg leading-none">{icon(it.type)}</span>
          <div>
            <div className="text-sm text-gray-900">{it.title}</div>
            {it.meta && <div className="text-xs text-gray-500">{it.meta}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

