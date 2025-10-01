import type { ReactNode } from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
      <Navbar />

      <main className="container mx-auto px-4 py-8">{children}</main>

      <footer className="container mx-auto px-4 py-8 text-xs text-gray-500">
        © {new Date().getFullYear()} Interdomestik
      </footer>
    </div>
  );
}
