'use client';

import { toast } from 'sonner';

export function UXTestingTools() {
  const resets: { label: string; description: string; color: string; clear: () => void }[] = [
    {
      label: 'First\u2011Time Visitor',
      description: 'Nukes everything \u2014 onboarding, welcome, search gate, cache, history',
      color: 'var(--gs-loss)',
      clear: () => {
        localStorage.removeItem('gs-uxr-welcome-dismissed');
        localStorage.removeItem('gs-onboarding');
        localStorage.removeItem('gs_wallet_hint_dismissed');
        sessionStorage.removeItem('gs_search_count');
        sessionStorage.removeItem('gs_searched_addrs');
        sessionStorage.removeItem('gs_last_search');
        localStorage.removeItem('gunzscope:portfolio:history');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('gunzscope:')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      },
    },
    {
      label: 'New Account',
      description: 'Re\u2011triggers welcome popup, onboarding checklist & wallet hint',
      color: 'var(--gs-purple)',
      clear: () => {
        localStorage.removeItem('gs-uxr-welcome-dismissed');
        localStorage.removeItem('gs-onboarding');
        localStorage.removeItem('gs_wallet_hint_dismissed');
      },
    },
    {
      label: 'Returning User',
      description: 'Clears NFT cache & portfolio history only \u2014 keeps onboarding state',
      color: 'var(--gs-lime)',
      clear: () => {
        localStorage.removeItem('gunzscope:portfolio:history');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('gunzscope:')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      },
    },
  ];

  return (
    <div className="space-y-3">
      {resets.map(({ label, description, color, clear }) => (
        <div key={label} className="flex items-center justify-between">
          <div>
            <p className="font-mono text-data text-[var(--gs-gray-4)]">{label}</p>
            <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => {
              clear();
              toast.success(`Reset to ${label.toLowerCase()}. Reloading\u2026`);
              setTimeout(() => window.location.reload(), 800);
            }}
            className="shrink-0 px-4 py-2 font-mono text-caption uppercase tracking-wider border transition-colors cursor-pointer"
            style={{
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              color,
            }}
          >
            Reset
          </button>
        </div>
      ))}
    </div>
  );
}
