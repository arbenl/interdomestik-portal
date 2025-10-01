'use client';

import { FormEvent, Fragment, useState } from 'react';
import PortalShell from '@/components/layout/PortalShell';
import { useAuth } from '@/hooks/useAuth';
import useDocumentShares from '@/hooks/useDocumentShares';
import useDocumentShareActivity from '@/hooks/useDocumentShareActivity';
import { shareDocument } from '@/services/documents';
import { useToast } from '@/components/ui/useToast';
import { Button } from '@/components/ui';

function formatDate(input?: Date | null) {
  if (!input) return '—';
  return input.toLocaleString();
}

export default function PortalDocuments() {
  const { user, isAdmin, isAgent } = useAuth();
  const { shares, refetch, isFetching, error } = useDocumentShares();
  const { push } = useToast();

  const [fileName, setFileName] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [recipients, setRecipients] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const recipientList = recipients
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!fileName.trim() || !storagePath.trim() || recipientList.length === 0) {
      push({
        type: 'error',
        message:
          'Provide file name, storage path, and at least one recipient UID.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await shareDocument({
        fileName: fileName.trim(),
        storagePath: storagePath.trim(),
        note: note.trim() ? note.trim() : undefined,
        recipients: recipientList,
      });
      setFileName('');
      setStoragePath('');
      setRecipients('');
      setNote('');
      push({ type: 'success', message: 'Document shared successfully.' });
      void refetch();
    } catch (error) {
      console.error('[documents] share failed', error);
      push({
        type: 'error',
        message: 'Failed to share document. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canShare = isAdmin || isAgent;

  return (
    <PortalShell
      header={
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Document vault
          </h1>
          <p className="text-sm text-gray-500">
            Securely distribute policy updates, invoices, or identity files to
            individual members.
          </p>
        </div>
      }
    >
      {canShare ? (
        <section
          aria-labelledby="share-form"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="share-form" className="text-lg font-semibold text-gray-900">
              Share a document
            </h2>
            {isFetching ? (
              <span className="text-xs text-gray-400">Refreshing…</span>
            ) : null}
          </div>
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="flex flex-col text-sm text-gray-700">
              File name
              <input
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="e.g. Policy Overview Q4.pdf"
                required
              />
            </label>
            <label className="flex flex-col text-sm text-gray-700">
              Storage path
              <input
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={storagePath}
                onChange={(event) => setStoragePath(event.target.value)}
                placeholder="documents/policy-q4.pdf"
                required
              />
            </label>
            <label className="md:col-span-2 flex flex-col text-sm text-gray-700">
              Recipient UIDs
              <textarea
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                placeholder="Enter one or more member UIDs separated by spaces or commas"
                rows={2}
                required
              />
            </label>
            <label className="md:col-span-2 flex flex-col text-sm text-gray-700">
              Internal note (optional)
              <textarea
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Visible to staff in audit logs"
                rows={2}
              />
            </label>
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sharing…' : 'Share document'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        aria-labelledby="documents-shared"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="documents-shared"
            className="text-lg font-semibold text-gray-900"
          >
            Shared documents
          </h2>
          {shares.length ? (
            <span className="text-xs text-gray-500">
              {shares.length} item{shares.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {error ? (
          <p className="mb-3 text-sm text-red-600">
            Unable to load shared documents. Try refreshing.
          </p>
        ) : null}
        {shares.length === 0 ? (
          <p className="text-sm text-gray-500">
            No documents have been shared yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Shared by</th>
                  <th className="px-3 py-2 font-medium">Recipients</th>
                  <th className="px-3 py-2 font-medium">Last updated</th>
                  <th className="px-3 py-2 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share) => {
                  const isExpanded = expandedShareId === share.id;
                  return (
                    <Fragment key={share.id}>
                      <tr className="border-b last:border-none">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">
                            {share.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {share.storagePath}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {share.ownerUid}
                        </td>
                        <td className="px-3 py-2">
                          <ul className="space-y-1 text-gray-700">
                            {share.recipients.map((recipient) => (
                              <li
                                key={`${share.id}-${recipient.uid}`}
                                className="text-xs"
                              >
                                <span className="font-medium">
                                  {recipient.uid}
                                </span>
                                {recipient.name ? ` · ${recipient.name}` : ''}
                                {recipient.region
                                  ? ` · ${recipient.region}`
                                  : ''}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {formatDate(share.updatedAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            onClick={() =>
                              setExpandedShareId((prev) =>
                                prev === share.id ? null : share.id
                              )
                            }
                          >
                            {isExpanded ? 'Hide history' : 'View history'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td colSpan={5} className="bg-gray-50 px-3 py-3">
                            <DocumentActivityList shareId={share.id} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}

function DocumentActivityList({ shareId }: { shareId: string }) {
  const { data, isLoading, isError } = useDocumentShareActivity(shareId, true);
  const items = data?.items ?? [];

  if (isLoading) {
    return <p className="text-xs text-gray-500">Loading activity…</p>;
  }
  if (isError) {
    return <p className="text-xs text-red-600">Unable to load activity log.</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-gray-500">No activity recorded yet.</p>;
  }

  return (
    <ul className="space-y-2 text-xs text-gray-700">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-md border border-gray-200 bg-white p-2 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium capitalize">{item.action}</span>
            <span className="text-gray-500">{formatDate(item.createdAt)}</span>
          </div>
          <div className="text-gray-600">Actor: {item.actorUid}</div>
          {item.recipients.length > 0 ? (
            <div className="text-gray-600">
              Recipients: {item.recipients.join(', ')}
            </div>
          ) : null}
          {item.note ? (
            <div className="text-gray-600">Note: {item.note}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
