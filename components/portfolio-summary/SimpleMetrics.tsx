import { EnrichmentProgress } from '@/lib/types';
import { NftPnL, AcquisitionBreakdown } from './types';
import { GunBalanceCard } from './cards/GunBalanceCard';
import { NFTHoldingsCard } from './cards/NFTHoldingsCard';
import { GunSpentCard } from './cards/GunSpentCard';
import { DataQualityCard } from './cards/DataQualityCard';

interface SimpleMetricsProps {
  isInitializing: boolean;
  gunHoldings: number;
  gunValue: number;
  nftCount: number;
  nftFloorValueUsd: number | null;
  nftPnL: NftPnL;
  nftCardSparkline: boolean;
  onToggleNftCardSparkline: () => void;
  nftSparklineValues: number[];
  nftCountHistory: (number | null)[];
  showGunOverlay: boolean;
  onToggleGunOverlay: () => void;
  hasSparklineData: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  progressPct: number | null;
  acquisitionBreakdown: AcquisitionBreakdown;
  totalGunSpent: number;
  gunPrice: number | undefined;
  walletCount?: number;
}

export function SimpleMetrics({
  isInitializing,
  gunHoldings,
  gunValue,
  nftCount,
  nftFloorValueUsd,
  nftPnL,
  nftCardSparkline,
  onToggleNftCardSparkline,
  nftSparklineValues,
  nftCountHistory,
  enrichmentProgress,
  acquisitionBreakdown,
  totalGunSpent,
  gunPrice,
  walletCount,
}: SimpleMetricsProps) {
  return (
    <div className="border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4" aria-live="polite" aria-busy={isInitializing}>
      <GunBalanceCard
        isInitializing={isInitializing}
        gunHoldings={gunHoldings}
        gunValue={gunValue}
        gunPrice={gunPrice}
      />
      <NFTHoldingsCard
        isInitializing={isInitializing}
        nftCount={nftCount}
        nftFloorValueUsd={nftFloorValueUsd}
        nftCardSparkline={nftCardSparkline}
        onToggleNftCardSparkline={onToggleNftCardSparkline}
        nftSparklineValues={nftSparklineValues}
        nftCountHistory={nftCountHistory}
        totalGunSpent={totalGunSpent}
        walletCount={walletCount}
      />
      <GunSpentCard
        isInitializing={isInitializing}
        totalGunSpent={totalGunSpent}
        gunPrice={gunPrice}
        nftPnL={nftPnL}
      />
      <DataQualityCard
        isInitializing={isInitializing}
        nftCount={nftCount}
        nftPnL={nftPnL}
        acquisitionBreakdown={acquisitionBreakdown}
        enrichmentProgress={enrichmentProgress}
      />
    </div>
  );
}
