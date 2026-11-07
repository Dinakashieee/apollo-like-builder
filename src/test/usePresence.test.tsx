import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePresence } from "@/hooks/usePresence";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1", email: "person@example.com" },
  current: { id: "workspace-1" },
  profile: vi.fn(), channel: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ current: mocks.current }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  channel: mocks.channel, removeChannel: mocks.remove,
} }));

function setup() {
  mocks.current = { id: "workspace-1" };
  mocks.profile.mockResolvedValue({ data: { full_name: "Person" } });
  const channels: { sync?: () => void; status?: (status: string) => Promise<void>; on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; track: ReturnType<typeof vi.fn>; presenceState: ReturnType<typeof vi.fn> }[] = [];
  mocks.channel.mockImplementation(() => {
    const channel = {
      sync: undefined as (() => void) | undefined,
      status: undefined as ((status: string) => Promise<void>) | undefined,
      on: vi.fn(), subscribe: vi.fn(), track: vi.fn().mockResolvedValue("ok"),
      presenceState: vi.fn().mockReturnValue({ peer: [{ user_id: "peer", online_at: "today" }, { user_id: "peer", online_at: "today" }] }),
    };
    channel.on.mockImplementation((_type, _filter, cb) => { channel.sync = cb; return channel; });
    channel.subscribe.mockImplementation(cb => { channel.status = cb; return channel; });
    channels.push(channel);
    return channel;
  });
  return channels;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("workspace presence lifecycle", () => {
  it("removes the subscribed channel on unmount and allows a fresh mount", async () => {
    const channels = setup();
    const first = renderHook(() => usePresence());
    await waitFor(() => expect(channels).toHaveLength(1));
    await act(async () => { await channels[0].status?.("SUBSCRIBED"); channels[0].sync?.(); });
    expect(first.result.current.count).toBe(1);
    expect(channels[0].track).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1" }));
    first.unmount();
    expect(mocks.remove).toHaveBeenCalledWith(channels[0]);
    renderHook(() => usePresence());
    await waitFor(() => expect(channels).toHaveLength(2));
  });
  it("ignores reference-only rerenders but replaces channels when the workspace changes", async () => {
    const channels = setup();
    const hook = renderHook(() => usePresence());
    await waitFor(() => expect(channels).toHaveLength(1));
    mocks.current = { id: "workspace-1" };
    mocks.user = { ...mocks.user };
    hook.rerender();
    expect(channels).toHaveLength(1);
    mocks.current = { id: "workspace-2" };
    hook.rerender();
    await waitFor(() => expect(channels).toHaveLength(2));
    expect(mocks.remove).toHaveBeenCalledWith(channels[0]);
    expect(mocks.channel).toHaveBeenLastCalledWith("presence:ws:workspace-2", expect.anything());
    act(() => channels[0].sync?.());
    expect(hook.result.current.count).toBe(0);
    act(() => channels[1].sync?.());
    expect(hook.result.current.count).toBe(1);
  });
  it("does not create a channel if profile fetching finishes after unmount", async () => {
    setup();
    let resolve: ((value: unknown) => void) | undefined;
    mocks.profile.mockReturnValue(new Promise(r => { resolve = r; }));
    const hook = renderHook(() => usePresence());
    hook.unmount();
    await act(async () => resolve?.({ data: null }));
    expect(mocks.channel).not.toHaveBeenCalled();
  });
});