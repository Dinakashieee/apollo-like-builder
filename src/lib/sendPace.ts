import { supabase } from "@/integrations/supabase/client";

// Healthy send-pace guardrails. 50 emails/day is the recommended ceiling for
// best email health (inbox placement) from a young sending domain.
export const DAILY_HEALTHY_LIMIT = 50;
export const BURST_LIMIT = 25;
export const BURST_WINDOW_MIN = 15;
export const BREAK_MIN = 10;

export const PACE_EVENT = "engageiq:send-pace";
export const PACE_STATE_KEY = "email_pace_v1";

export type PaceState = {
  date: string;
  sent: number;
  /** Local send timestamps (ms) for burst detection */
  times: number[];
  pausedUntil: number | null;
  lastNudgeAt: number | null;
};

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function loadPace(): PaceState {
  try {
    const raw = localStorage.getItem(PACE_STATE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as PaceState;
      if (p.date === todayStr()) {
        return { times: [], pausedUntil: null, lastNudgeAt: null, ...p };
      }
    }
  } catch {}
  return { date: todayStr(), sent: 0, times: [], pausedUntil: null, lastNudgeAt: null };
}

export function savePace(p: PaceState) {
  try {
    localStorage.setItem(PACE_STATE_KEY, JSON.stringify(p));
  } catch {}
}

/** Record a locally-initiated send (e.g. "Send now" in the app). */
export function recordLocalSend(n = 1): PaceState {
  const p = loadPace();
  const now = Date.now();
  const times = [...p.times, ...Array.from({ length: n }, () => now)];
  const next: PaceState = { ...p, sent: p.sent + n, times };
  savePace(next);
  return next;
}

/** How many local sends happened within the burst window. */
export function localRecent(p: PaceState): number {
  const cutoff = Date.now() - BURST_WINDOW_MIN * 60_000;
  return p.times.filter((t) => t >= cutoff).length;
}

/** Real sends today for a workspace, counted from the database. */
export async function fetchTodaySends(
  workspaceId: string,
): Promise<{ total: number; recent: number } | null> {
  try {
    const { data, error } = await supabase.rpc("workspace_sends_today", {
      _workspace_id: workspaceId,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return { total: row.total ?? 0, recent: row.recent ?? 0 };
  } catch {
    return null;
  }
}

export type PaceAdvice = { tone: "good" | "warn" | "bad"; title: string; body: string };

export function paceAdvice(sent: number, recent: number, pausedUntil: number | null): PaceAdvice {
  const now = Date.now();
  if (pausedUntil && pausedUntil > now) {
    const min = Math.ceil((pausedUntil - now) / 60_000);
    return {
      tone: "warn",
      title: `Take a ${min}-minute break`,
      body: "You're on a cool-down. Inboxes love consistent, human-paced sending.",
    };
  }
  if (sent >= DAILY_HEALTHY_LIMIT) {
    return {
      tone: "bad",
      title: "Daily healthy limit reached",
      body: `You've sent ${sent} emails today. 50 a day is the healthiest ceiling — stop here and resume tomorrow for the best inbox placement.`,
    };
  }
  if (recent >= BURST_LIMIT) {
    return {
      tone: "warn",
      title: "Slow down",
      body: `${recent} sends in the last ${BURST_WINDOW_MIN} minutes is a burst. Take ${BREAK_MIN} minutes off to stay below spam triggers.`,
    };
  }
  if (sent >= DAILY_HEALTHY_LIMIT * 0.8) {
    return {
      tone: "warn",
      title: "Approaching the daily sweet spot",
      body: `${DAILY_HEALTHY_LIMIT - sent} healthy sends left today. Pace the rest — small batches spread across the day get the best reply rate.`,
    };
  }
  return {
    tone: "good",
    title: "You're pacing well",
    body: "Keep batches small and spread sends across the day — 50 emails a day is the healthiest ceiling for your inbox rate.",
  };
}

/**
 * Show the send-pace popup when the user is sending too much. Dispatched as a
 * window event so the popup (mounted once in the app layout) can react from
 * any screen. Throttled so the user is nudged, not nagged.
 */
export function nudgeSendPace(sent: number, recent: number) {
  const atCap = sent >= DAILY_HEALTHY_LIMIT;
  const warn = recent >= BURST_LIMIT || sent >= DAILY_HEALTHY_LIMIT * 0.8;
  if (!atCap && !warn) return;

  const p = loadPace();
  const now = Date.now();
  const throttleMs = atCap ? 10 * 60_000 : 30 * 60_000;
  if (p.lastNudgeAt && now - p.lastNudgeAt < throttleMs) return;

  savePace({ ...p, lastNudgeAt: now });
  window.dispatchEvent(new CustomEvent(PACE_EVENT, { detail: { sent, recent } }));
}

/** Convenience: nudge based on the local counter after an in-app send. */
export function nudgeFromLocalPace() {
  const p = loadPace();
  nudgeSendPace(Math.max(p.sent, 0), localRecent(p));
}
