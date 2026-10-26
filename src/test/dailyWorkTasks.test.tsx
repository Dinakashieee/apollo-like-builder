import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyWorkTaskList } from '@/components/DailyWorkTaskList';

const { setDone } = vi.hoisted(() => ({ setDone: vi.fn() }));
vi.mock('@/hooks/useDailyWorkTasks', () => ({ useDailyWorkTasks: () => ({
  data: [
    { id: 'task-1', update_id: 'today', note: 'Call prospects', status: 'pending' },
    { id: 'task-2', update_id: 'yesterday', note: 'Send proposal', status: 'done' },
  ], isLoading: false, isError: false, setDone,
}) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('personal daily tasks', () => {
  it('only offers tasks from updates in the selected dashboard period', () => {
    render(<DailyWorkTaskList updateIds={['today']} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByRole('checkbox', { name: 'Complete task: Send proposal' })).toBeNull();
  });
  it('saves a selected task completion without changing another task', async () => {
    setDone.mockResolvedValue(undefined);
    render(<DailyWorkTaskList />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete task: Call prospects' }));
    await waitFor(() => expect(setDone).toHaveBeenCalledWith('task-1', true));
    expect(setDone).toHaveBeenCalledTimes(1);
  });
  it('allows a completed task to be reopened', async () => {
    setDone.mockResolvedValue(undefined);
    render(<DailyWorkTaskList />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Complete task: Send proposal' }));
    await waitFor(() => expect(setDone).toHaveBeenCalledWith('task-2', false));
  });
});