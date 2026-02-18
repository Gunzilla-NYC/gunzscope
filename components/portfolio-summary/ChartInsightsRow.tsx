'use client';

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { NFT } from '@/lib/types';
import { PortfolioInsight } from '@/lib/portfolio/portfolioInsights';
import { ChartZoomHandle } from '@/components/charts/useChartZoom';
import InsightsPanel from '@/components/ui/InsightsPanel';

const PnLScatterPlot = dynamic(() => import('@/components/charts/PnLScatterPlot'), { ssr: false });
const AcquisitionTimeline = dynamic(() => import('@/components/charts/AcquisitionTimeline'), { ssr: false });

interface ChartInsightsRowProps {
  nfts: NFT[];
  gunPrice?: number;
  insights: PortfolioInsight[];
}

type ChartTab = 'scatter' | 'timeline';

const ZOOM_LEVELS = [1, 2, 3] as const;

const chartTransition = { duration: 0.2, ease: 'easeInOut' as const };

export default function ChartInsightsRow({ nfts, gunPrice, insights }: ChartInsightsRowProps) {
  const [tab, setTab] = useState<ChartTab>('timeline');
  const [displayZoom, setDisplayZoom] = useState(1);
  const hasInsights = insights.length > 0;

  const timelineZoomRef = useRef<ChartZoomHandle | null>(null);
  const scatterZoomRef = useRef<ChartZoomHandle | null>(null);

  const activeZoomRef = tab === 'timeline' ? timelineZoomRef : scatterZoomRef;

  const handleZoomPreset = useCallback((level: number) => {
    activeZoomRef.current?.zoomTo(level);
  }, [activeZoomRef]);

  const handleZoomChange = useCallback((scale: number) => {
    setDisplayZoom(Math.round(scale * 100) / 100);
  }, []);

  const TABS: { id: ChartTab; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'scatter', label: 'Cost vs Value' },
  ];

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setTab(prev => prev === 'timeline' ? 'scatter' : 'timeline');
      // Focus the newly active tab
      const parent = (e.target as HTMLElement).parentElement;
      requestAnimationFrame(() => {
        const next = parent?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
        next?.focus();
      });
    }
  }, []);

  return (
    <div className="border-t border-white/[0.06]">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_25%]">
        {/* Left: Chart with tab header — min-w-0 prevents grid column expansion */}
        <div className="min-w-0">
          {/* Tab header */}
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1" role="tablist" aria-label="Chart view">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`chart-panel-${id}`}
                  id={`chart-tab-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  onKeyDown={handleTabKeyDown}
                  className={`font-mono text-label uppercase tracking-widest px-2 py-0.5 border transition-colors cursor-pointer ${
                    tab === id
                      ? id === 'timeline'
                        ? 'border-[var(--gs-purple)]/30 text-[var(--gs-purple)] bg-[var(--gs-purple)]/10'
                        : 'border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/10'
                      : 'border-transparent text-[var(--gs-gray-4)] hover:text-[var(--gs-gray-3)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Zoom controls */}
            <div className="ml-auto flex items-center gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)] mr-0.5">
                Zoom
              </span>
              {ZOOM_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => handleZoomPreset(level)}
                  className={`font-mono text-[9px] tabular-nums min-h-8 min-w-8 flex items-center justify-center px-1.5 py-0.5 border transition-colors cursor-pointer ${
                    Math.abs(displayZoom - level) < 0.05
                      ? 'border-white/20 text-white bg-white/[0.08]'
                      : 'border-transparent text-[var(--gs-gray-3)] hover:text-[var(--gs-gray-4)] hover:bg-white/[0.03]'
                  }`}
                >
                  {level}x
                </button>
              ))}
              {/* Show exact zoom when between snap points */}
              {!ZOOM_LEVELS.some(l => Math.abs(displayZoom - l) < 0.05) && displayZoom > 1 && (
                <span className="font-mono text-[9px] tabular-nums text-white/50 ml-0.5">
                  {displayZoom.toFixed(2)}x
                </span>
              )}
            </div>
          </div>

          {/* Chart body — both charts stay mounted, crossfade via opacity.
              overflow-hidden + minmax(0,1fr) prevent content from expanding the grid
              and break the ParentSize feedback loop between stacked charts. */}
          <div className="relative grid overflow-hidden" style={{ gridTemplate: '1fr / minmax(0, 1fr)' }}>
            {/* Zoom hint watermark */}
            <span className="absolute bottom-2 right-3 z-10 pointer-events-none font-mono text-[8px] uppercase tracking-widest text-white/[0.12] select-none">
              Shift + Scroll to zoom
            </span>
            <motion.div
              id="chart-panel-timeline"
              role="tabpanel"
              aria-labelledby="chart-tab-timeline"
              style={{ gridArea: '1/1' }}
              animate={{ opacity: tab === 'timeline' ? 1 : 0 }}
              transition={chartTransition}
              className={`min-w-0 ${tab !== 'timeline' ? 'pointer-events-none' : ''}`}
            >
              <AcquisitionTimeline
                nfts={nfts}
                gunPrice={gunPrice}
                embedded
                zoomRef={timelineZoomRef}
                onZoomChange={tab === 'timeline' ? handleZoomChange : undefined}
              />
            </motion.div>
            <motion.div
              id="chart-panel-scatter"
              role="tabpanel"
              aria-labelledby="chart-tab-scatter"
              style={{ gridArea: '1/1' }}
              animate={{ opacity: tab === 'scatter' ? 1 : 0 }}
              transition={chartTransition}
              className={`min-w-0 ${tab !== 'scatter' ? 'pointer-events-none' : ''}`}
            >
              <PnLScatterPlot
                nfts={nfts}
                gunPrice={gunPrice}
                embedded
                zoomRef={scatterZoomRef}
                onZoomChange={tab === 'scatter' ? handleZoomChange : undefined}
              />
            </motion.div>
          </div>
        </div>

        {/* Right: Insights — always rendered to prevent layout shift when insights load */}
        <div
          className="hidden sm:block border-l-[1px] border-l-white/[0.06] px-4 pt-3 pb-4"
        >
          {hasInsights && <InsightsPanel insights={insights} />}
        </div>
      </div>
    </div>
  );
}
