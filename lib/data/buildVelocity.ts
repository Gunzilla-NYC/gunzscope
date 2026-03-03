/**
 * Build velocity data — auto-derived from the UPDATES array.
 *
 * No manual maintenance needed: adding an entry to UPDATES automatically
 * updates the chart on the next build.
 */

import { UPDATES } from './updates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VelocityDatum {
  date: string;        // YYYY-MM-DD
  releases: number;    // releases that day
  items: number;       // feature items that day
  cumReleases: number; // running total
  cumItems: number;    // running total
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(month: string, day: number, year: number): string {
  return `${year}-${MONTHS[month]}-${pad(day)}`;
}

/**
 * Parse a date string from UPDATES into YYYY-MM-DD.
 * Handles:
 *   "Mar 2, 2026"             → 2026-03-02
 *   "Jan 19–22, 2026"         → 2026-01-22  (use last day)
 *   "Feb 5–8, 2026"           → 2026-02-08
 *   "Jan 31 – Feb 1, 2026"    → 2026-02-01  (use last month+day)
 */
function parseUpdateDate(raw: string): string {
  // Normalize dashes: en-dash (\u2013) and em-dash (\u2014) → hyphen
  const s = raw.replace(/[\u2013\u2014]/g, '-');

  // Cross-month range: "Jan 31 - Feb 1, 2026"
  const crossMonth = s.match(/([A-Z][a-z]+)\s+\d+\s*-\s*([A-Z][a-z]+)\s+(\d+),?\s*(\d{4})/);
  if (crossMonth) {
    return toISO(crossMonth[2], parseInt(crossMonth[3]), parseInt(crossMonth[4]));
  }

  // Same-month range: "Jan 19-22, 2026"
  const sameMonth = s.match(/([A-Z][a-z]+)\s+\d+-(\d+),?\s*(\d{4})/);
  if (sameMonth) {
    return toISO(sameMonth[1], parseInt(sameMonth[2]), parseInt(sameMonth[3]));
  }

  // Simple date: "Mar 2, 2026"
  const simple = s.match(/([A-Z][a-z]+)\s+(\d+),?\s*(\d{4})/);
  if (simple) {
    return toISO(simple[1], parseInt(simple[2]), parseInt(simple[3]));
  }

  throw new Error(`Cannot parse update date: "${raw}"`);
}

// ---------------------------------------------------------------------------
// Derive velocity data
// ---------------------------------------------------------------------------

function deriveVelocityData(): VelocityDatum[] {
  // Group by date
  const byDate = new Map<string, { releases: number; items: number }>();

  for (const entry of UPDATES) {
    const date = parseUpdateDate(entry.date);
    const existing = byDate.get(date) || { releases: 0, items: 0 };
    existing.releases += 1;
    existing.items += entry.items.length;
    byDate.set(date, existing);
  }

  // Sort chronologically and compute cumulative sums
  const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));

  let cumReleases = 0;
  let cumItems = 0;

  return sorted.map(([date, { releases, items }]) => {
    cumReleases += releases;
    cumItems += items;
    return { date, releases, items, cumReleases, cumItems };
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const VELOCITY_DATA = deriveVelocityData();

const first = VELOCITY_DATA[0];
const last = VELOCITY_DATA[VELOCITY_DATA.length - 1];

export const TOTAL_RELEASES = last.cumReleases;
export const TOTAL_ITEMS = last.cumItems;

// Days active = first release date → last release date (inclusive)
const firstDate = new Date(first.date + 'T00:00:00');
const lastDate = new Date(last.date + 'T00:00:00');
export const DAYS_ACTIVE = Math.round((lastDate.getTime() - firstDate.getTime()) / 86_400_000) + 1;

export const AVG_PER_DAY = +(TOTAL_RELEASES / DAYS_ACTIVE).toFixed(1);

// Formatted date range for chart title: "JAN 19 — MAR 2, 2026"
function formatRangeDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${month} ${d.getDate()}`;
}

const year = lastDate.getFullYear();
export const DATE_RANGE = `${formatRangeDate(first.date)} \u2014 ${formatRangeDate(last.date)}, ${year}`;
