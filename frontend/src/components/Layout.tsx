import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import DiagCss from './DiagCss';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {import.meta && import.meta.env && (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '5000' ? <DiagCss /> : null}
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <footer className="border-t text-xs text-gray-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3">© {new Date().getFullYear()} Interdomestik</div>
      </footer>
    </div>
  );
}
