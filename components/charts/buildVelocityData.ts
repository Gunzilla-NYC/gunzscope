// Build velocity data derived from changelog — update when new versions ship

export interface VelocityDatum {
  date: string;        // YYYY-MM-DD
  releases: number;    // releases that day
  items: number;       // feature items that day
  cumReleases: number; // running total
  cumItems: number;    // running total
}

export const VELOCITY_DATA: VelocityDatum[] = [
  { date: '2026-01-22', releases: 1, items: 6,  cumReleases: 1,  cumItems: 6 },
  { date: '2026-02-01', releases: 1, items: 7,  cumReleases: 2,  cumItems: 13 },
  { date: '2026-02-08', releases: 1, items: 6,  cumReleases: 3,  cumItems: 19 },
  { date: '2026-02-09', releases: 1, items: 5,  cumReleases: 4,  cumItems: 24 },
  { date: '2026-02-10', releases: 1, items: 6,  cumReleases: 5,  cumItems: 30 },
  { date: '2026-02-11', releases: 1, items: 7,  cumReleases: 6,  cumItems: 37 },
  { date: '2026-02-12', releases: 1, items: 6,  cumReleases: 7,  cumItems: 43 },
  { date: '2026-02-13', releases: 1, items: 7,  cumReleases: 8,  cumItems: 50 },
  { date: '2026-02-14', releases: 2, items: 19, cumReleases: 10, cumItems: 69 },
  { date: '2026-02-15', releases: 1, items: 10, cumReleases: 11, cumItems: 79 },
  { date: '2026-02-16', releases: 3, items: 19, cumReleases: 14, cumItems: 98 },
  { date: '2026-02-17', releases: 4, items: 30, cumReleases: 18, cumItems: 128 },
  { date: '2026-02-18', releases: 3, items: 16, cumReleases: 21, cumItems: 144 },
  { date: '2026-02-19', releases: 1, items: 10, cumReleases: 22, cumItems: 154 },
  { date: '2026-02-21', releases: 4, items: 37, cumReleases: 26, cumItems: 191 },
  { date: '2026-02-22', releases: 4, items: 23, cumReleases: 30, cumItems: 214 },
  { date: '2026-02-23', releases: 1, items: 2,  cumReleases: 31, cumItems: 216 },
  { date: '2026-02-26', releases: 1, items: 8,  cumReleases: 32, cumItems: 224 },
  { date: '2026-02-27', releases: 2, items: 19, cumReleases: 34, cumItems: 243 },
  { date: '2026-02-28', releases: 3, items: 21, cumReleases: 37, cumItems: 264 },
  { date: '2026-03-01', releases: 5, items: 32, cumReleases: 42, cumItems: 296 },
  { date: '2026-03-02', releases: 3, items: 18, cumReleases: 45, cumItems: 314 },
];

// Summary constants
const last = VELOCITY_DATA[VELOCITY_DATA.length - 1];
export const TOTAL_RELEASES = last.cumReleases;
export const TOTAL_ITEMS = last.cumItems;
export const DAYS_ACTIVE = 43; // Jan 19 → Mar 2, 2026
export const AVG_PER_DAY = +(TOTAL_RELEASES / DAYS_ACTIVE).toFixed(1);
