'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { NFT } from '@/lib/types';
import { PortfolioInsight } from '@/lib/portfolio/portfolioInsights';
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
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

const chartTransition = { duration: 0.2, ease: 'easeInOut' as const };

export default function ChartInsightsRow({ nfts, gunPrice, insights }: ChartInsightsRowProps) {
  const [tab, setTab] = useState<ChartTab>('timeline');
  const [zoomLevel, setZoomLevel] = useState(1);
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const hasInsights = insights.length > 0;

  // Shift+scroll to zoom — native listener with { passive: false } so preventDefault() works
  useEffect(() => {
    const el = chartBodyRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      // deltaY > 0 = scroll down = zoom out, deltaY < 0 = scroll up = zoom in
      const direction = e.deltaY > 0 ? -1 : 1;
      setZoomLevel(prev => {
        const next = Math.round((prev + direction * ZOOM_STEP) * 100) / 100;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="border-t border-white/[0.06]">
      <div className={`grid grid-cols-1 ${hasInsights ? 'sm:grid-cols-[1fr_25%]' : ''}`}>
        {/* Left: Chart with tab header */}
        <div>
          {/* Tab header */}
          <div className="px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('timeline')}
                className={`font-mono text-label uppercase tracking-widest px-2 py-0.5 border transition-colors cursor-pointer ${
                  tab === 'timeline'
                    ? 'border-[var(--gs-purple)]/30 text-[var(--gs-purple)] bg-[var(--gs-purple)]/10'
                    : 'border-transparent text-[var(--gs-gray-4)] hover:text-[var(--gs-gray-3)]'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setTab('scatter')}
                className={`font-mono text-label uppercase tracking-widest px-2 py-0.5 border transition-colors cursor-pointer ${
                  tab === 'scatter'
                    ? 'border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/10'
                    : 'border-transparent text-[var(--gs-gray-4)] hover:text-[var(--gs-gray-3)]'
                }`}
              >
                Cost vs Value
              </button>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[#FF9F43] border border-[#FF9F43]/30 bg-[#FF9F43]/[0.08]">
              Under Active Dev
            </span>

            {/* Zoom controls */}
            <div className="ml-auto flex items-center gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)] mr-0.5">
                Zoom
              </span>
              {ZOOM_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`font-mono text-[9px] tabular-nums min-h-8 min-w-8 flex items-center justify-center px-1.5 py-0.5 border transition-colors cursor-pointer ${
                    zoomLevel === level
                      ? 'border-white/20 text-white bg-white/[0.08]'
                      : 'border-transparent text-[var(--gs-gray-3)] hover:text-[var(--gs-gray-4)] hover:bg-white/[0.03]'
                  }`}
                >
                  {level}x
                </button>
              ))}
              {/* Show exact zoom when between snap points */}
              {!ZOOM_LEVELS.includes(zoomLevel as 1 | 2 | 3) && (
                <span className="font-mono text-[9px] tabular-nums text-white/50 ml-0.5">
                  {zoomLevel.toFixed(2)}x
                </span>
              )}
            </div>
          </div>

          {/* Chart body — both charts stay mounted, crossfade via opacity */}
          <div ref={chartBodyRef} className="grid" style={{ gridTemplate: '1fr / 1fr' }}>
            <motion.div
              style={{ gridArea: '1/1' }}
              animate={{ opacity: tab === 'timeline' ? 1 : 0 }}
              transition={chartTransition}
              className={tab !== 'timeline' ? 'pointer-events-none' : ''}
            >
              <AcquisitionTimeline nfts={nfts} gunPrice={gunPrice} embedded zoomLevel={zoomLevel} />
            </motion.div>
            <motion.div
              style={{ gridArea: '1/1' }}
              animate={{ opacity: tab === 'scatter' ? 1 : 0 }}
              transition={chartTransition}
              className={tab !== 'scatter' ? 'pointer-events-none' : ''}
            >
              <PnLScatterPlot nfts={nfts} gunPrice={gunPrice} embedded zoomLevel={zoomLevel} />
            </motion.div>
          </div>
        </div>

        {/* Right: Insights */}
        {hasInsights && (
          <div
            className="border-t-[1px] border-t-white/[0.06] border-l-0 lg:border-t-0 lg:border-l-[1px] lg:border-l-white/[0.06] px-4 pt-3 pb-4"
          >
            <InsightsPanel insights={insights} />
          </div>
        )}
      </div>
    </div>
  );
}
