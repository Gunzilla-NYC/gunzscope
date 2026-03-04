export function WaitlistFlow() {
  return (
    <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="waitlist-flow">
  <div className="flex items-baseline gap-4 mb-10 observe">
    <span className="section-number">06</span>
    <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Waitlist Flow</h2>
    <div className="section-line" />
  </div>

  <p className="font-body text-sm text-[var(--gs-gray-4)] mb-10 max-w-2xl">
    Non&#8209;whitelisted wallets join a viral waitlist. They get a referral link immediately.
    After 3 successful referrals (wallet connections), they auto&#8209;promote to full access.
  </p>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

    {/* ── Step 1: Gate Redirect ──────────────────────────────────── */}
    <div className="observe">
      <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">
        Step 1 &mdash; Gate Redirect
      </p>
      <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[var(--gs-dark-3)] border border-white/[0.06] px-4 py-2 mb-3">
            <span className="font-mono text-[10px] text-[var(--gs-gray-4)]">0xf943...c72f</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gs-loss)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gs-loss)]">Not Whitelisted</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[var(--gs-gray-3)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="7 17 17 7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
          <span className="font-mono text-[9px] uppercase tracking-widest">Redirect to /waitlist</span>
        </div>
        <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-4 text-center">
          Wallet stays connected &mdash; no disconnect
        </p>
      </div>
    </div>

    {/* ── Step 2: Waitlist Page ──────────────────────────────────── */}
    <div className="observe">
      <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">
        Step 2 &mdash; Waitlist Page
      </p>
      <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5">
        {/* Position */}
        <div className="text-center mb-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mb-2">Your Position</p>
          <div className="inline-flex items-center gap-2 bg-[var(--gs-dark-3)] border border-white/[0.06] px-4 py-2 clip-corner-sm">
            <span className="font-display font-bold text-xl text-[var(--gs-lime)]">#12</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">in queue</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Progress</span>
            <span className="font-mono text-[10px] font-semibold text-[var(--gs-white)]">1/3</span>
          </div>
          <div className="flex gap-1">
            <div className="h-2 flex-1 bg-[var(--gs-lime)]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
            <div className="h-2 flex-1 bg-[var(--gs-dark-3)] border border-white/[0.06]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
            <div className="h-2 flex-1 bg-[var(--gs-dark-3)] border border-white/[0.06]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
          </div>
        </div>

        {/* Referral link */}
        <div className="flex gap-1.5 mb-3">
          <div className="flex-1 bg-[var(--gs-dark-3)] border border-white/[0.06] px-2 py-1.5 font-mono text-[9px] text-[var(--gs-gray-4)] truncate">
            gunzscope.xyz/r/0xf943
          </div>
          <div className="px-3 py-1.5 bg-[var(--gs-lime)] text-[var(--gs-black)] font-display font-semibold text-[9px] uppercase tracking-wider clip-corner-sm">
            Copy
          </div>
        </div>

        <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2 text-center">
          Auto&#8209;handle created on join &middot; 30s polling
        </p>
      </div>
    </div>

    {/* ── Step 3: Auto-Promotion ────────────────────────────────── */}
    <div className="observe">
      <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">
        Step 3 &mdash; Auto&#8209;Promotion
      </p>
      <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5">
        {/* Celebration state */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3 border-2 border-[var(--gs-lime)] flex items-center justify-center clip-corner-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gs-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="font-display font-bold text-lg uppercase text-[var(--gs-lime)] mb-1">Access Granted</p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Redirecting to portfolio...</p>
        </div>

        {/* Progress full */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">Progress</span>
            <span className="font-mono text-[10px] font-semibold text-[var(--gs-lime)]">3/3</span>
          </div>
          <div className="flex gap-1">
            <div className="h-2 flex-1 bg-[var(--gs-lime)]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
            <div className="h-2 flex-1 bg-[var(--gs-lime)]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
            <div className="h-2 flex-1 bg-[var(--gs-lime)]" style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }} />
          </div>
        </div>

        <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2 text-center">
          Threshold met &rarr; WhitelistEntry created atomically
        </p>
      </div>
    </div>
  </div>

  {/* ── Data Flow Diagram ────────────────────────────────────────── */}
  <div className="mt-12 observe">
    <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">
      Data Flow
    </p>
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 font-mono text-[10px] leading-relaxed text-[var(--gs-gray-4)] overflow-x-auto">
      <pre className="whitespace-pre">{`Wallet connects
  └─ POST /api/access/validate
 ├─ isWhitelisted? ── YES ──▶ redirect /portfolio
 └─ NO
      ├─ joinWaitlist() ── creates WaitlistEntry + Referrer (auto-handle)
      └─ return { waitlisted: true, position, slug, referralLink }
           └─ redirect /waitlist (wallet stays connected)

Referred visitor connects via /r/{slug}
  └─ POST /api/referral/track { event: 'wallet_connected' }
 └─ recordWalletConnected()
      ├─ Guards: self-referral, first-touch, already-whitelisted
      ├─ Update ReferralEvent → 'wallet_connected'
      └─ incrementReferralAndCheckPromotion(referrerId)
           ├─ WaitlistEntry.referralCount += 1
           └─ count >= threshold?
                ├─ YES ──▶ promoteFromWaitlist() [tx: WaitlistEntry + WhitelistEntry]
                └─ NO  ──▶ wait for next referral

Waitlist page polls GET /api/waitlist/status every 30s
  └─ promoted? ──▶ celebration overlay ──▶ redirect /portfolio`}</pre>
    </div>
  </div>

  {/* ── Anti-Gaming Guards ───────────────────────────────────────── */}
  <div className="mt-8 observe">
    <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">
      Anti&#8209;Gaming Guards
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: 'Self&#8209;Referral', desc: 'Referrer cannot refer their own wallet address' },
        { label: 'First&#8209;Touch', desc: 'A wallet can only be referred once, by the first referrer' },
        { label: 'Whitelisted Block', desc: 'Already&#8209;whitelisted wallets cannot be referred' },
        { label: 'IP Dedup', desc: 'Same IP + same referrer within 24h = 1 click' },
      ].map((guard) => (
        <div key={guard.label} className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-3">
          <p className="font-mono text-[10px] font-semibold text-[var(--gs-warning)] mb-1" dangerouslySetInnerHTML={{ __html: guard.label }} />
          <p className="font-body text-[11px] text-[var(--gs-gray-4)] leading-relaxed" dangerouslySetInnerHTML={{ __html: guard.desc }} />
        </div>
      ))}
    </div>
  </div>
</section>
  );
}
