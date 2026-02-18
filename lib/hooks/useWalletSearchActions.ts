import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Wallet search dropdown action handlers — Add to Watchlist / Add to Portfolio.
 * Manages loading states and toast feedback.
 */
export function useWalletSearchActions(
  addTrackedAddress: (address: string) => Promise<unknown>,
  addPortfolioAddress: (address: string) => Promise<unknown>,
) {
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);

  const handleAddToWatchlist = useCallback(async (address: string) => {
    setIsAddingWatchlist(true);
    try {
      const result = await addTrackedAddress(address);
      if (result) {
        toast.success('Added to watchlist');
        return true;
      } else {
        toast.error('Failed to add to watchlist');
        return false;
      }
    } catch {
      toast.error('Failed to add to watchlist');
      return false;
    } finally {
      setIsAddingWatchlist(false);
    }
  }, [addTrackedAddress]);

  const handleAddToPortfolio = useCallback(async (address: string) => {
    setIsAddingPortfolio(true);
    try {
      const result = await addPortfolioAddress(address);
      if (result) {
        toast.success('Added to portfolio');
        return true;
      } else {
        toast.error('Failed to add to portfolio');
        return false;
      }
    } catch {
      toast.error('Failed to add to portfolio');
      return false;
    } finally {
      setIsAddingPortfolio(false);
    }
  }, [addPortfolioAddress]);

  return {
    isAddingWatchlist,
    isAddingPortfolio,
    handleAddToWatchlist,
    handleAddToPortfolio,
  };
}
