import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingImageCreator } from '@/components/LandingImageCreator';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

describe('landing image creation for free users', () => {
  it('lets a workspace user create and select an image without a paid entitlement', async () => {
    invoke.mockResolvedValue({ data: { url: 'https://example.com/image.jpg' }, error: null });
    const onCreated = vi.fn();
    render(<LandingImageCreator workspaceId="workspace-free" onCreated={onCreated} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create image with OpenAI' }));
    fireEvent.change(screen.getByLabelText('Image description'), { target: { value: 'A product sensor on a bright workbench' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate image' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('landing-image', { body: { workspace_id: 'workspace-free', prompt: 'A product sensor on a bright workbench', size: '1536x1024' } }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use image' }));
    expect(onCreated).toHaveBeenCalledWith('https://example.com/image.jpg');
  });
});