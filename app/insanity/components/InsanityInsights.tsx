'use client';

import InsightsPanel from '@/components/ui/InsightsPanel';
import type { PortfolioInsight } from '@/lib/portfolio/portfolioInsights';

interface InsanityInsightsProps {
  insights: PortfolioInsight[];
  isInitializing: boolean;
}

export function InsanityInsights({ insights, isInitializing }: InsanityInsightsProps) {
  if (insights.length === 0 || isInitializing) return null;

  return (
    <div className="border-t border-white/[0.06] px-6 py-3">
      <InsightsPanel insights={insights} />
    </div>
  );
}
