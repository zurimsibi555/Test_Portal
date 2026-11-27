/**
 * Shared examination schedule helper.
 * Supports `alwaysOpen` tests (open immediately for testing/live access)
 * as well as scheduled start times with a configurable entry window.
 */
export const DEFAULT_EXAM_START_ISO = '2026-11-28T13:00:00+05:30';
export const DEFAULT_ENTRY_WINDOW_MINUTES = 30; // 1:00 PM to 1:30 PM IST

export function getExamScheduleStatus(test, nowMs = Date.now()) {
  const startIso = test?.scheduledStartTime || DEFAULT_EXAM_START_ISO;
  const windowMinutes = Number(test?.entryWindowMinutes ?? DEFAULT_ENTRY_WINDOW_MINUTES);
  const startMs = Date.parse(startIso);
  const endMs = startMs + windowMinutes * 60 * 1000;

  if (test?.alwaysOpen) {
    return {
      status: 'LIVE',
      alwaysOpen: true,
      startIso,
      startMs,
      endMs,
      windowMinutes,
      msUntilStart: 0,
      msUntilExpiry: Math.max(0, endMs - nowMs),
    };
  }

  let status = 'LIVE';
  if (nowMs < startMs) {
    status = 'UPCOMING';
  } else if (nowMs > endMs) {
    status = 'EXPIRED';
  }

  return {
    status, // 'UPCOMING' | 'LIVE' | 'EXPIRED'
    alwaysOpen: false,
    startIso,
    startMs,
    endMs,
    windowMinutes,
    msUntilStart: Math.max(0, startMs - nowMs),
    msUntilExpiry: Math.max(0, endMs - nowMs),
  };
}

export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}
