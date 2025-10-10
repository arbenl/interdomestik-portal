import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaqAccordion } from '../FaqAccordion';

describe('FaqAccordion', () => {
  it('should render questions and toggle answers on click', () => {
    render(<FaqAccordion />);

    const question = screen.getByText(/how do i renew my membership/i);
    expect(question).toBeInTheDocument();

    expect(
      screen.queryByText(/you can renew your membership/i)
    ).not.toBeInTheDocument();

    fireEvent.click(question);
    expect(
      screen.getByText(/you can renew your membership/i)
    ).toBeInTheDocument();

    fireEvent.click(question);
    expect(
      screen.queryByText(/you can renew your membership/i)
    ).not.toBeInTheDocument();
  });
});

