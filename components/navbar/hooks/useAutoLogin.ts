import { useEffect, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';

/**
 * Global auto-login: ensures /api/me is called once when the user authenticates,
 * creating their profile in the database regardless of which page they're on.
 * Retries briefly if the auth token isn't ready yet (Dynamic SDK timing).
 */
export function useAutoLogin(isAuthenticated: boolean) {
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
        // Token not ready yet — retry up to 5 times with 500ms delay
        if (attempt < 5) {
          setTimeout(() => tryLogin(attempt + 1), 500);
        }
        return;
      }

      // Deduplicate: skip if we already called for this token
      if (calledRef.current && lastUserRef.current === token.slice(0, 20)) return;
      calledRef.current = true;
      lastUserRef.current = token.slice(0, 20);

      fetch('/api/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {
        // Silent fail — profile creation will retry on next page that uses useUserProfile
        calledRef.current = false;
      });
    };

    tryLogin(0);
  }, [isAuthenticated]);
}
