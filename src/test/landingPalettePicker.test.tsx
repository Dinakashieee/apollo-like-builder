import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPalettePicker } from '@/components/LandingPalettePicker';

afterEach(cleanup);
describe('landing palette paid access', () => {
  it('does not apply custom colors for free users', () => {
    const onChange = vi.fn();
    render(<LandingPalettePicker accent={null} allowed={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Ocean & Teal palette' }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('applies all palette colors together for paid users', () => {
    const onChange = vi.fn();
    render(<LandingPalettePicker accent={null} allowed onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Ocean & Teal palette' }));
    expect(onChange).toHaveBeenCalledWith('#2d8a9e', { background: '#f5fafa', text: '#0c2340', surface: '#1a4a6e' });
  });
});