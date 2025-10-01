import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test-utils';
import RegionSelect from './RegionSelect';
import { describe, it, expect, vi } from 'vitest';

describe('RegionSelect', () => {
  it('renders and calls onChange when a region is selected', async () => {
    const handleChange = vi.fn();
    renderWithProviders(<RegionSelect value="" onChange={handleChange} />);

    const select = screen.getByLabelText('Region');
    expect(select).toBeInTheDocument();

    await userEvent.selectOptions(select, 'PRISHTINA');
    expect(handleChange).toHaveBeenCalledWith('PRISHTINA');
  });
});
