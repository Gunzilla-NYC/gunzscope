import { useEffect, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';

/**
 * Global auto-login: ensures /api/me is called once when the user authenticates,
 * creating their profile in the database regardless of which page they're on.
 *
 * Validates the wallet against the whitelist BEFORE calling /api/me to prevent
 * ghost profiles. If not whitelisted, logs the user out immediately.
 */
export function useAutoLogin(
  isAuthenticated: boolean,
  walletAddress: string | undefined,
  onNotWhitelisted: () => void,
) {
  const calledRef = useRef(false);
  const lastUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      calledRef.current = false;
      lastUserRef.current = null;
      return;
    }

    const tryLogin = (attempt: number) => {
      const token = getAuthToken();
      if (!token) {
        if (attempt < 5) {
          setTimeout(() => tryLogin(attempt + 1), 500);
        }
        return;
      }

      if (calledRef.current && lastUserRef.current === token.slice(0, 20)) return;
      calledRef.current = true;
      lastUserRef.current = token.slice(0, 20);

      // Validate whitelist before creating profile
      const identifier = walletAddress?.toLowerCase();
      if (!identifier) {
        calledRef.current = false;
        return;
      }

      fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: identifier }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) {
            onNotWhitelisted();
            return;
          }
          // Whitelisted — create/update profile
          return fetch('/api/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        })
        .catch(() => {
          calledRef.current = false;
        });
    };

    tryLogin(0);
  }, [isAuthenticated, walletAddress, onNotWhitelisted]);
}
