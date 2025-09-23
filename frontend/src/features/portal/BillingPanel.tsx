import { Link } from 'react-router-dom';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/hooks/useAuth';
import type { Invoice } from '@/types';

export function BillingPanel() {
  const { user } = useAuth();
  const { data: invoices, isLoading, error } = useInvoices(user?.uid);

  if (isLoading) {
    return <div>Loading invoices...</div>;
  }

  if (error) {
    return <div>Error loading invoices: {error.message}</div>;
  }

  return (
    <div>
      <h3>Billing</h3>
      <ul>
        {invoices?.map((invoice: Invoice) => (
          <li key={invoice.id}>{invoice.status} - {invoice.amount}</li>
        ))}
      </ul>
      <Link to="/billing">Manage Subscription</Link>
    </div>
  );
}
