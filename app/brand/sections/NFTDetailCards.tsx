export function NFTDetailCards() {
  return (
    <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="nft-detail-cards">
  <div className="flex items-baseline gap-4 mb-10 observe">
    <span className="section-number">03</span>
    <h2 className="font-display font-bold text-3xl uppercase tracking-wide">NFT Detail Cards</h2>
    <div className="section-line" />
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

    {/* ============================================================ */}
    {/* QUICK STATS — All States */}
    {/* ============================================================ */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-8 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Quick Stats</span>
      </div>
      <div className="space-y-6">
        {/* Profit */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Profit</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$1.56</div>
              <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">450.00 GUN</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$2.40</div>
              <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">692.00 GUN</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-profit)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
              <div className="font-display text-sm font-semibold tabular-nums text-[var(--gs-profit)]">+$0.84</div>
              <div className="font-mono text-caption tabular-nums mt-0.5 text-[var(--gs-profit)]">+53.8%</div>
            </div>
          </div>
        </div>
        {/* Loss */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loss</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$3.20</div>
              <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">920.00 GUN</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">$1.80</div>
              <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">518.00 GUN</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-loss)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
              <div className="font-display text-sm font-semibold tabular-nums text-[var(--gs-loss)]">-$1.40</div>
              <div className="font-mono text-caption tabular-nums mt-0.5 text-[var(--gs-loss)]">-43.8%</div>
            </div>
          </div>
        </div>
        {/* No Data */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Data</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Cost Basis</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">{'\u2014'}</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-purple)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Market Value</div>
              <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">{'\u2014'}</div>
            </div>
            <div className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3" style={{ borderLeftColor: 'var(--gs-gray-1)' }}>
              <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">Unrealized</div>
              <div className="font-display text-sm font-semibold tabular-nums text-white/60">{'\u2014'}</div>
            </div>
          </div>
        </div>
        {/* Loading */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-3 animate-pulse">
                <div className="h-2 w-12 bg-white/10 rounded mb-2" />
                <div className="h-5 w-16 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ============================================================ */}
    {/* YOUR POSITION — All States */}
    {/* ============================================================ */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-8 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Your Position</span>
      </div>
      <div className="space-y-6">
        {/* Decoded (Profit) */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Decoded (Profit)</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
              <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Decoded</span>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[26px] font-bold text-white tabular-nums">$1.56</p>
              <p className="text-[13px] text-white/70">Cost basis: 450.00 GUN</p>
              <p className="text-[13px] text-white/60">At acquisition: $1.56</p>
              <p className="text-[13px] text-[var(--gs-lime)]">+$0.84 (+53.8%)</p>
              <p className="text-data text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/60">Source</span>
                  <span className="text-[13px] font-medium text-[var(--gs-lime)]">HEX Decoder</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/60">Acquired</span>
                  <span className="text-[13px] font-medium text-white/90 tabular-nums">Jan 15, 2025</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/60">Transaction</span>
                  <span className="text-[13px] font-medium text-[var(--gs-lime)] inline-flex items-center gap-1">
                    View
                    <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Acquired (Loss) */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Acquired (Loss)</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
              <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Acquired</span>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[26px] font-bold text-white tabular-nums">$1.80</p>
              <p className="text-[13px] text-white/70">Cost basis: 920.00 GUN</p>
              <p className="text-[13px] text-white/60">At acquisition: $3.20</p>
              <p className="text-[13px] text-[var(--gs-loss)]">-$1.40 (-43.8%)</p>
              <p className="text-data text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/60">Source</span>
                  <span className="text-[13px] font-medium text-blue-400">OpenSea</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/60">Acquired</span>
                  <span className="text-[13px] font-medium text-white/90 tabular-nums">Dec 22, 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Transferred */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Transferred</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
              <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">Transferred</span>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[26px] font-bold text-white tabular-nums">{'\u2014'}</p>
              <p className="text-[13px] text-white/70">Cost basis: 0.00 GUN</p>
              <p className="text-data text-white/60 mt-2 leading-relaxed">Based on your acquisition cost (GUN) valued at today&apos;s GUN price.</p>
            </div>
          </div>
        </div>
        {/* Loading */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Your Position</p>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-28 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer" />
              <div className="h-4 w-36 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.1s]" />
              <div className="h-4 w-32 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ============================================================ */}
    {/* MARKET REFERENCE — All States */}
    {/* ============================================================ */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-8 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Market Reference</span>
      </div>
      <div className="space-y-6">
        {/* Up */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Up</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
              <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">
                <span className="text-caption">{'\u2197'}</span> Up
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $2.40 USD</p>
              <p className="text-[13px] font-medium text-white/85">{'\u2248'} 692.00 GUN</p>
              <p className="text-xs text-[var(--gs-lime)]">Unrealized: +53.8%</p>
              <p className="text-data text-white/60 mt-2 inline-flex items-center gap-1">
                Data Quality: <span className="capitalize">Strong</span>
                <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </p>
            </div>
          </div>
        </div>
        {/* Down */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Down</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
              <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20">
                <span className="text-caption">{'\u2198'}</span> Down
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $1.80 USD</p>
              <p className="text-[13px] font-medium text-white/85">{'\u2248'} 518.00 GUN</p>
              <p className="text-xs text-[var(--gs-loss)]">Unrealized: -43.7%</p>
              <p className="text-data text-white/60 mt-2 inline-flex items-center gap-1">
                Data Quality: <span className="capitalize">Fair</span>
                <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </p>
            </div>
          </div>
        </div>
        {/* Flat */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Flat</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
              <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-white/5 text-white/70 border border-white/10">
                <span className="text-caption">{'\u2013'}</span> Flat
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $1.58 USD</p>
              <p className="text-[13px] font-medium text-white/85">{'\u2248'} 455.00 GUN</p>
              <p className="text-xs text-white/70">Unrealized: +1.3%</p>
            </div>
          </div>
        </div>
        {/* No Cost Basis */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Cost Basis</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
              <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                <span className="text-caption">{'\u2022'}</span> No cost basis
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-display text-[22px] font-semibold text-white tabular-nums">{'\u2248'} $2.40 USD</p>
              <p className="text-[13px] font-medium text-white/85">{'\u2248'} 692.00 GUN</p>
            </div>
          </div>
        </div>
        {/* No Market Ref */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">No Market Reference</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
              <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
                <span className="text-caption">{'\u2022'}</span> No market reference
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-white/85">No active listings found</p>
              <p className="text-xs text-white/60">This is an illiquid market; reference values may be unavailable.</p>
            </div>
          </div>
        </div>
        {/* Loading */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">Market Reference</p>
            </div>
            <div className="space-y-2">
              <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ============================================================ */}
    {/* STATUS PILLS — All Variants */}
    {/* ============================================================ */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-8 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Status &amp; Position Pills</span>
      </div>
      <div className="space-y-6">
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Acquisition Status</span>
          <div className="flex flex-wrap gap-2">
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Decoded</span>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]">Acquired</span>
            <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">Transferred</span>
          </div>
        </div>
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Position State</span>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20">
              <span className="text-caption">{'\u2197'}</span> Up
            </div>
            <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20">
              <span className="text-caption">{'\u2198'}</span> Down
            </div>
            <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-white/5 text-white/70 border border-white/10">
              <span className="text-caption">{'\u2013'}</span> Flat
            </div>
            <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
              <span className="text-caption">{'\u2022'}</span> No cost basis
            </div>
            <div className="h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 bg-transparent text-white/60 border border-white/10">
              <span className="text-caption">{'\u2022'}</span> No market reference
            </div>
          </div>
        </div>
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Venue Colors</span>
          <div className="flex flex-wrap gap-3">
            <span className="text-[13px] font-medium text-[var(--gs-lime)]">HEX Decoder</span>
            <span className="text-[13px] font-medium text-blue-400">OpenSea</span>
            <span className="text-[13px] font-medium text-[var(--gs-purple)]">OTG Marketplace</span>
            <span className="text-[13px] font-medium text-white/90">Unknown</span>
          </div>
        </div>
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Left Border Accents</span>
          <div className="flex gap-2">
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-gray-1)' }} title="Cost Basis / Neutral" />
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-purple)' }} title="Market Value" />
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-profit)' }} title="Profit" />
            <div className="w-1 h-10 rounded-full" style={{ backgroundColor: 'var(--gs-loss)' }} title="Loss" />
          </div>
          <div className="flex gap-2 mt-1">
            <span className="font-mono text-label text-[var(--gs-gray-3)] w-1 text-center">N</span>
            <span className="font-mono text-label text-[var(--gs-gray-3)] w-1 text-center">M</span>
            <span className="font-mono text-label text-[var(--gs-gray-3)] w-1 text-center">P</span>
            <span className="font-mono text-label text-[var(--gs-gray-3)] w-1 text-center">L</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
  );
}
