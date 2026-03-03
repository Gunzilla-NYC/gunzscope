'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AreaClosed, LinePath, Bar, Line } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { curveStepAfter } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { chartTheme } from './theme';
import {
  VELOCITY_DATA,
  TOTAL_RELEASES,
  TOTAL_ITEMS,
  DAYS_ACTIVE,
  AVG_PER_DAY,
  DATE_RANGE,
  type VelocityDatum,
} from '@/lib/data/buildVelocity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLIP_SM = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))';

const parseDate = (d: VelocityDatum) => new Date(d.date + 'T00:00:00');
const getCum = (d: VelocityDatum) => d.cumReleases;

const margin = { top: 16, right: 12, bottom: 32, left: 36 };

const CHART_HEIGHT = 180;

function formatDateTick(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Stats Banner
// ---------------------------------------------------------------------------

interface StatDef {
  label: string;
  value: number;
  accent: boolean;
  decimal?: boolean;
}

const STATS: StatDef[] = [
  { label: 'RELEASES', value: TOTAL_RELEASES, accent: true },
  { label: 'FEATURES SHIPPED', value: TOTAL_ITEMS, accent: false },
  { label: 'DAYS ACTIVE', value: DAYS_ACTIVE, accent: false },
  { label: 'AVG / DAY', value: AVG_PER_DAY, accent: false, decimal: true },
];

function StatsBanner() {
  const releases = useCountUp(TOTAL_RELEASES, 1200);
  const features = useCountUp(TOTAL_ITEMS, 1400);
  const days = useCountUp(DAYS_ACTIVE, 800);
  const avg = useCountUp(AVG_PER_DAY * 10, 1000); // x10 for decimal precision

  const values = [releases, features, days, avg];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 mb-6">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex flex-col ${i < STATS.length - 1 ? 'md:border-r md:border-white/[0.06]' : ''} ${i > 0 ? 'md:pl-6' : ''}`}
        >
          <span className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-gray-3)] mb-1">
            {stat.label}
          </span>
          <span
            className={`font-display font-bold text-xl md:text-2xl ${
              stat.accent ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-white)]'
            }`}
          >
            {stat.decimal ? (values[i] / 10).toFixed(1) : values[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  datum: VelocityDatum;
  x: number;
  y: number;
}

function ChartTooltip({ data, chartHeight }: { data: TooltipData; chartHeight: number }) {
  const { datum, x } = data;
  const isLeft = x < 120;
  return (
    <foreignObject
      x={isLeft ? x + 8 : x - 138}
      y={8}
      width={130}
      height={chartHeight - 16}
      style={{ pointerEvents: 'none' }}
    >
      <div className="bg-[var(--gs-dark-2)] border border-white/[0.08] px-2.5 py-2 w-fit" style={{ clipPath: CLIP_SM }}>
        <p className="font-mono text-[10px] tracking-wider text-[var(--gs-white)] mb-1">
          {formatDateTick(new Date(datum.date + 'T00:00:00'))}
        </p>
        <p className="font-mono text-[9px] text-[var(--gs-lime)]">
          {datum.releases} release{datum.releases !== 1 ? 's' : ''}
        </p>
        <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">
          {datum.cumReleases} cumulative
        </p>
        <p className="font-mono text-[9px] text-[var(--gs-gray-3)]">
          {datum.items} feature{datum.items !== 1 ? 's' : ''}
        </p>
      </div>
    </foreignObject>
  );
}

// ---------------------------------------------------------------------------
// Inner Chart (receives width from ParentSize)
// ---------------------------------------------------------------------------

function VelocityChartInner({ width }: { width: number }) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const height = CHART_HEIGHT;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const dateExtent = useMemo(() => {
    const dates = VELOCITY_DATA.map(parseDate);
    // Add 1 day padding on each side
    const min = new Date(dates[0]);
    min.setDate(min.getDate() - 2);
    const max = new Date(dates[dates.length - 1]);
    max.setDate(max.getDate() + 1);
    return [min, max] as [Date, Date];
  }, []);

  const xScale = useMemo(
    () => scaleTime({ domain: dateExtent, range: [0, innerWidth] }),
    [dateExtent, innerWidth],
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, Math.ceil(TOTAL_RELEASES / 5) * 5 + 5],
        range: [innerHeight, 0],
        nice: true,
      }),
    [innerHeight],
  );

  // Bar scale for daily releases
  const maxDaily = useMemo(() => Math.max(...VELOCITY_DATA.map((d) => d.releases)), []);
  const barYScale = useMemo(
    () => scaleLinear({ domain: [0, maxDaily], range: [0, innerHeight * 0.4] }),
    [maxDaily, innerHeight],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - margin.left;

      // Snap to nearest datum
      let nearest = VELOCITY_DATA[0];
      let nearestDist = Infinity;
      for (const d of VELOCITY_DATA) {
        const dx = Math.abs(xScale(parseDate(d)) - mouseX);
        if (dx < nearestDist) {
          nearestDist = dx;
          nearest = d;
        }
      }
      if (nearestDist > 40) {
        setTooltip(null);
        return;
      }

      setTooltip({
        datum: nearest,
        x: xScale(parseDate(nearest)),
        y: yScale(getCum(nearest)),
      });
    },
    [xScale, yScale],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (innerWidth <= 0) return null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="velocity-chart"
    >
      <LinearGradient
        id="velocity-area-fill"
        from={chartTheme.colors.lime}
        to={chartTheme.colors.lime}
        fromOpacity={0.15}
        toOpacity={0}
      />

      <Group left={margin.left} top={margin.top}>
        {/* Grid */}
        <GridRows
          scale={yScale}
          width={innerWidth}
          stroke={chartTheme.colors.grid}
          numTicks={5}
        />

        {/* Daily release bars (behind area) */}
        {VELOCITY_DATA.map((d) => {
          const barH = barYScale(d.releases);
          const cx = xScale(parseDate(d));
          const barW = Math.max(innerWidth / VELOCITY_DATA.length * 0.4, 3);
          return (
            <Bar
              key={d.date}
              x={cx - barW / 2}
              y={innerHeight - barH}
              width={barW}
              height={barH}
              fill={chartTheme.colors.lime}
              fillOpacity={0.08}
            />
          );
        })}

        {/* Cumulative area */}
        <AreaClosed
          data={VELOCITY_DATA}
          x={(d) => xScale(parseDate(d))}
          y={(d) => yScale(getCum(d))}
          yScale={yScale}
          curve={curveStepAfter}
          fill="url(#velocity-area-fill)"
          className="velocity-area"
        />

        {/* Cumulative line */}
        <LinePath
          data={VELOCITY_DATA}
          x={(d) => xScale(parseDate(d))}
          y={(d) => yScale(getCum(d))}
          curve={curveStepAfter}
          stroke={chartTheme.colors.lime}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          className="velocity-line"
        />

        {/* Endpoint glow */}
        {(() => {
          const last = VELOCITY_DATA[VELOCITY_DATA.length - 1];
          const cx = xScale(parseDate(last));
          const cy = yScale(getCum(last));
          return (
            <>
              <circle cx={cx} cy={cy} r={6} fill={chartTheme.colors.lime} fillOpacity={0.15} />
              <circle cx={cx} cy={cy} r={2.5} fill={chartTheme.colors.lime} fillOpacity={0.8} />
            </>
          );
        })()}

        {/* Hover crosshair */}
        {tooltip && (
          <>
            <Line
              from={{ x: tooltip.x, y: 0 }}
              to={{ x: tooltip.x, y: innerHeight }}
              stroke={chartTheme.colors.text}
              strokeWidth={1}
              strokeDasharray="3,3"
              pointerEvents="none"
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={3.5}
              fill={chartTheme.colors.lime}
              fillOpacity={0.9}
              stroke="black"
              strokeWidth={1}
              pointerEvents="none"
            />
          </>
        )}

        {/* X Axis */}
        <AxisBottom
          scale={xScale}
          top={innerHeight}
          stroke={chartTheme.colors.grid}
          tickStroke="transparent"
          numTicks={width > 500 ? 5 : 3}
          tickLabelProps={() => ({
            fill: chartTheme.colors.text,
            fontFamily: chartTheme.fonts.mono,
            fontSize: 10,
            textAnchor: 'middle' as const,
            dy: '0.25em',
          })}
          tickFormat={(v) => formatDateTick(v as Date)}
        />

        {/* Y tick labels (no axis line, just labels on left) */}
        {yScale.ticks(5).map((tick) => (
          <text
            key={tick}
            x={-8}
            y={yScale(tick)}
            fill={chartTheme.colors.text}
            fontFamily={chartTheme.fonts.mono}
            fontSize={10}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {tick}
          </text>
        ))}

        {/* Tooltip panel */}
        {tooltip && <ChartTooltip data={tooltip} chartHeight={innerHeight} />}
      </Group>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function BuildVelocityChart() {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-gray-2)] mb-3">
        BUILD VELOCITY // {DATE_RANGE}
      </p>
      <div
        className="bg-[var(--gs-dark-2)]/50 border border-white/[0.06] p-5 md:p-7"
        style={{ clipPath: CLIP_SM }}
      >
        <StatsBanner />
        <div style={{ width: '100%', height: CHART_HEIGHT }}>
          <ParentSize>
            {({ width }) => width > 0 ? <VelocityChartInner width={width} /> : null}
          </ParentSize>
        </div>
      </div>

      {/* Reveal animation */}
      <style>{`
        .velocity-area, .velocity-line {
          animation: velocity-reveal 1.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes velocity-reveal {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0% 0 0); }
        }
      `}</style>
    </div>
  );
}
