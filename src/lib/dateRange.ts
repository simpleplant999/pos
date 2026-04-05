/** Local calendar date as YYYY-MM-DD */
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

/** Start of local day for YYYY-MM-DD */
export function startOfLocalDayMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** End of local day for YYYY-MM-DD */
export function endOfLocalDayMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function normalizeRange(
  startYmd: string,
  endYmd: string,
): { start: string; end: string; startMs: number; endMs: number } {
  let start = startYmd;
  let end = endYmd;
  const s0 = startOfLocalDayMs(start);
  const e0 = endOfLocalDayMs(end);
  if (!Number.isNaN(s0) && !Number.isNaN(e0) && s0 > e0) {
    [start, end] = [end, start];
  }
  return {
    start,
    end,
    startMs: startOfLocalDayMs(start),
    endMs: endOfLocalDayMs(end),
  };
}

export function timestampInRange(at: number, startMs: number, endMs: number): boolean {
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
  return at >= startMs && at <= endMs;
}
