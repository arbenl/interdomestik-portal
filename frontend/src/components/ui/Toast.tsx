import { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastContext, type Toast } from './toastContext';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    setItems((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);
  useEffect(() => {
    const i = setInterval(() => {
      setItems((prev) => prev.slice(1));
    }, 3500);
    return () => clearInterval(i);
  }, []);
  const contextValue = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'rounded-md px-3 py-2 shadow text-sm text-white ' +
              (t.type === 'success'
                ? 'bg-green-600'
                : t.type === 'error'
                  ? 'bg-red-600'
                  : 'bg-gray-800')
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
