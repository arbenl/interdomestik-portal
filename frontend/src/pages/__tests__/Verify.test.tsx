import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Verify from '../Verify';

describe('Verify page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  it('auto-verifies memberNo from URL and renders active', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, valid: true, memberNo: 'INT-2025-000001' }) } as any));
    window.history.pushState({}, '', '/verify?memberNo=INT-2025-000001');
    render(<Verify />);
    expect(await screen.findByText(/Membership is Active/i)).toBeInTheDocument();
  });
  it('auto-verifies token from URL and renders not valid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, valid: false }) } as any));
    window.history.pushState({}, '', '/verify?token=t_test');
    render(<Verify />);
    expect(await screen.findByText(/not valid/i)).toBeInTheDocument();
  });
});

