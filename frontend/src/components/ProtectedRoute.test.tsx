import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /signin', async () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/signin" element={<div>SignIn</div>} />
          <Route path="/private" element={<ProtectedRoute><div>Private</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('SignIn')).toBeInTheDocument());
  });
});
