import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SenderSettingsCard } from "@/components/SenderSettingsCard";

const mocks = vi.hoisted(() => ({ select: vi.fn(), upsert: vi.fn(), toast: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: () => ({ current: { id: "workspace-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const builder = {
    select: (columns: string) => {
      if (table === "email_sender_settings") mocks.select(columns);
      return builder;
    },
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: { id: "sender-1", mode: "custom", from_name: "Saved Sender", from_email: "sender@example.com", reply_to: "replies@example.com", verified: false }, error: null }),
    upsert: (payload: unknown) => { mocks.upsert(payload); return builder; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return builder;
} } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("loads and saves editable sender fields without requesting the hidden verification code", async () => {
  render(<SenderSettingsCard />);
  const input = await screen.findByDisplayValue("Saved Sender");
  fireEvent.change(input, { target: { value: "Updated Sender" } });
  fireEvent.click(screen.getByRole("button", { name: "Save details" }));
  await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith({ workspace_id: "workspace-1", mode: "custom", from_name: "Updated Sender", from_email: "sender@example.com", reply_to: "replies@example.com" }));
  expect(mocks.select.mock.calls).toEqual([
    ["id, mode, from_name, from_email, reply_to, verified"],
    ["id, mode, from_name, from_email, reply_to, verified"],
  ]);
});