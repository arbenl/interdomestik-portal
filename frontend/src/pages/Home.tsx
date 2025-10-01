import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="text-center py-16">
      <h1 className="text-4xl font-bold tracking-tight">
        Interdomestik Member Portal
      </h1>
      <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
        Manage your profile and membership in a simple, secure portal. Sign in
        to see your digital card, renew membership, and verify your status.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to="/portal"
          className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Open Portal
        </Link>
        <Link
          to="/verify"
          className="px-5 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
        >
          Verify Membership
        </Link>
      </div>
    </section>
  );
}
