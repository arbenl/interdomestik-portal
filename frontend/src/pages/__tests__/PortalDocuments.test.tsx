import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import PortalDocuments from '../PortalDocuments';
import { useAuth } from '@/hooks/useAuth';
import useDocumentShares from '@/hooks/useDocumentShares';
import { shareDocument } from '@/services/documents';
import useDocumentShareActivity from '@/hooks/useDocumentShareActivity';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useDocumentShares');
vi.mock('@/hooks/useDocumentShareActivity');
vi.mock('@/hooks/useMfaPreference', () => ({
  __esModule: true,
  default: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
  useMfaPreference: () => ({ mfaEnabled: true, setMfaPreference: vi.fn(), updating: false }),
}));
vi.mock('@/services/documents');
const pushMock = vi.fn();
vi.mock('@/components/ui/useToast', () => ({ useToast: () => ({ push: pushMock }) }));

const refetchMock = vi.fn();

describe('PortalDocuments page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock.mockReset();
    pushMock.mockReset();
    vi.mocked(useDocumentShareActivity).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
    } as any);
  });

  it('renders share form for admins and lists documents', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-1', email: 'admin@example.com' } as any,
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    vi.mocked(useDocumentShares).mockReturnValue({
      shares: [
        {
          id: 'share-1',
          ownerUid: 'admin-1',
          fileName: 'statement.pdf',
          storagePath: 'documents/statement.pdf',
          allowedUids: ['admin-1', 'member-1'],
          recipients: [{ uid: 'member-1', name: 'Member One', region: 'PRISHTINA' }],
          createdAt: new Date('2025-09-24T12:00:00Z'),
          updatedAt: new Date('2025-09-25T09:00:00Z'),
          ownerRole: 'admin',
          note: null,
        },
      ],
      refetch: refetchMock,
      isFetching: false,
      error: null,
      isError: false,
      isLoading: false,
    } as any);

    renderWithProviders(<PortalDocuments />);
    expect(screen.getByText(/Document vault/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/File name/i)).toBeInTheDocument();
    expect(screen.getByText('statement.pdf')).toBeInTheDocument();
    expect(screen.getByText(/member-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View history/i })).toBeInTheDocument();
  });

  it('submits share requests and shows success toast', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-1' } as any,
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    vi.mocked(useDocumentShares).mockReturnValue({
      shares: [],
      refetch: refetchMock,
      isFetching: false,
      error: null,
      isError: false,
      isLoading: false,
    } as any);
    vi.mocked(useDocumentShareActivity).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(shareDocument).mockResolvedValue({ ok: true, id: 'share-123', recipients: ['member-1'] });

    renderWithProviders(<PortalDocuments />);

    fireEvent.change(screen.getByLabelText(/File name/i), { target: { value: 'policy.pdf' } });
    fireEvent.change(screen.getByLabelText(/Storage path/i), { target: { value: 'documents/policy.pdf' } });
    fireEvent.change(screen.getByLabelText(/Recipient UIDs/i), { target: { value: 'member-1 member-2' } });
    fireEvent.submit(screen.getByRole('button', { name: /Share document/i }).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(shareDocument).toHaveBeenCalledWith({
        fileName: 'policy.pdf',
        storagePath: 'documents/policy.pdf',
        note: undefined,
        recipients: ['member-1', 'member-2'],
      });
      expect(pushMock).toHaveBeenCalledWith({ type: 'success', message: 'Document shared successfully.' });
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  it('hides share form for members', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'member-1' } as any,
      isAdmin: false,
      isAgent: false,
      allowedRegions: [],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    vi.mocked(useDocumentShares).mockReturnValue({
      shares: [],
      refetch: refetchMock,
      isFetching: false,
      error: null,
      isError: false,
      isLoading: false,
    } as any);
    vi.mocked(useDocumentShareActivity).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<PortalDocuments />);
    expect(screen.queryByText(/Share a document/i)).not.toBeInTheDocument();
  });

  it('expands a share and displays activity log', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-1' } as any,
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    vi.mocked(useDocumentShares).mockReturnValue({
      shares: [
        {
          id: 'share-1',
          ownerUid: 'admin-1',
          fileName: 'policy.pdf',
          storagePath: 'documents/policy.pdf',
          allowedUids: ['admin-1', 'member-1'],
          recipients: [{ uid: 'member-1', name: 'Member One', region: 'PRISHTINA' }],
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerRole: 'admin',
          note: null,
        },
      ],
      refetch: refetchMock,
      isFetching: false,
      error: null,
      isError: false,
      isLoading: false,
    } as any);
    vi.mocked(useDocumentShareActivity).mockReturnValue({
      data: { items: [
        { id: 'act-1', action: 'created', actorUid: 'admin-1', recipients: ['member-1'], note: 'Initial share', createdAt: new Date('2025-09-25T10:00:00Z') },
      ] },
      isLoading: false,
      isError: false,
    } as any);

    renderWithProviders(<PortalDocuments />);
    const toggle = screen.getByRole('button', { name: /View history/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/Initial share/)).toBeInTheDocument();
      expect(screen.getByText(/Actor: admin-1/)).toBeInTheDocument();
    });
  });
});
