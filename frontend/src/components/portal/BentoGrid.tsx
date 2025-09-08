import type { ReactNode } from 'react';

export function BentoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

export function BentoCard({ title, subtitle, children, span = 1 }: { title: string; subtitle?: string; children?: ReactNode; span?: 1 | 2 | 3 }) {
  const cls = span === 2 ? 'md:col-span-2' : span === 3 ? 'md:col-span-3' : '';
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${cls}`}>
      <div className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
