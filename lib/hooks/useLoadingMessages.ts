import { useState, useMemo, useEffect } from 'react';
import { useTextScramble } from '@/hooks/useTextScramble';

/**
 * Manages the scrambled loading text shown during wallet fetch and SDK init.
 * Extracts ~65 lines of state + memos from PortfolioClient.
 */
export function useLoadingMessages() {
  // 10pm Easter egg — between 9:55 PM and 10:05 PM
  const is10pmWindow = useMemo(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins >= 21 * 60 + 55 && mins <= 22 * 60 + 5;
  }, []);

  const TEN_PM_MESSAGE = "It\u2019s 10pm. Do you know where your children are?";

  // Scramble loading messages — shuffled on mount
  const LOADING_MESSAGES = useMemo(() => {
    if (is10pmWindow) return [TEN_PM_MESSAGE];
    const pool = [
      'Dodging legendary buzzkilla with ease',
      'Counting your digital weapons\u2026',
      'Shaking down the blockchain for answers',
      'Appraising your arsenal\u2026',
      'Floor prices don\u2019t check themselves',
      'Procrastinating by checking Discord for drama...',
      'Scanning 13M blocks. Yeah, all of them.',
      'Loading NFTs faster than you loot crates',
      'Flying around legless... IYKYK',
      'Doing math so you don\u2019t have to',
      'Raiding the RPC for your data\u2026',
      'Try to get the hug emote to work...',
    ];
    return pool.sort(() => Math.random() - 0.5);
  }, [is10pmWindow]);

  const loadingScramble = useTextScramble({
    words: LOADING_MESSAGES,
    scrambleDuration: 600,
    pauseDuration: 2000,
  });

  // SDK init loading messages — stable first word avoids SSR hydration mismatch
  const SDK_INIT_POOL = useMemo(() => {
    if (is10pmWindow) return [TEN_PM_MESSAGE];
    return [
      'Hold on, the hamster powering the server tripped',
      'How many hexes did you have to open to collect all this shit',
      'Somewhere on Teardrop Island, your wallet is being looted',
      'Wallet SDK is being a little bitch rn',
      'Loading\u2026 faster than it takes to find you a match',
      'This is taking longer than a hot drop wipe',
      'Patience is a virtue. You don\u2019t have it.',
      'If you\u2019re reading this, blame the SDK',
      'Connecting wallet\u2026 or trying to, at least',
      'The blockchain doesn\u2019t give a shit about your impatience',
      'Almost there. Maybe. No promises.',
      'Screaming into the void while your wallet connects',
    ];
  }, [is10pmWindow]);

  const [sdkInitWords, setSdkInitWords] = useState(SDK_INIT_POOL);
  useEffect(() => {
    setSdkInitWords(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const sdkScramble = useTextScramble({
    words: sdkInitWords,
    scrambleDuration: 600,
    pauseDuration: 2500,
  });

  return {
    loadingText: loadingScramble.displayText,
    sdkInitText: sdkScramble.displayText,
  };
}
