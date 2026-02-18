import { useRef, useMemo } from 'react';
import type { NFT, EnrichmentProgress } from '@/lib/types';

/**
 * Milestone-gated NFT array for charts — only updates at enrichment milestones
 * (0%, 25%, 50%, 75%, 100%) to prevent chart flicker during per-batch updates.
 * Between milestones, returns the same object ref so downstream useMemo([nfts])
 * in PnLScatterPlot / AcquisitionTimeline skips re-render.
 */
export function useChartMilestoneGating(
  allNfts: NFT[],
  isEnriching: boolean,
  enrichmentProgress: EnrichmentProgress | null,
): NFT[] {
  const lastMilestoneRef = useRef<number>(-1);
  const gatedRef = useRef<NFT[]>([]);

  return useMemo(() => {
    // When not enriching, always use latest data
    if (!isEnriching) {
      lastMilestoneRef.current = -1;
      gatedRef.current = allNfts;
      return allNfts;
    }

    // Calculate progress %
    const pct = enrichmentProgress && enrichmentProgress.total > 0
      ? (enrichmentProgress.completed / enrichmentProgress.total) * 100
      : 0;

    // Milestone check
    const milestones = [0, 25, 50, 75, 100];
    const currentMilestone = milestones.reduce((best, m) => pct >= m ? m : best, 0);

    if (currentMilestone > lastMilestoneRef.current) {
      lastMilestoneRef.current = currentMilestone;
      gatedRef.current = allNfts;
      return allNfts;
    }

    // Between milestones: return same ref → charts don't re-render
    return gatedRef.current;
  }, [allNfts, isEnriching, enrichmentProgress]);
}
