export function HoldingsCardStates() {
  return (
    <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="holdings-card-states">
  <div className="flex items-baseline gap-4 mb-10 observe">
    <span className="section-number">05</span>
    <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Holdings Card States</h2>
    <div className="section-line" />
  </div>

  <p className="font-body text-sm text-[var(--gs-gray-4)] mb-10 max-w-2xl">
    The 4th summary card cycles through three views: Counts, Distribution, and Data Quality.
    Shown below in both zero&#8209;data (first login) and full&#8209;data states.
  </p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {/* Column: Zero Data */}
    <div>
      <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">Zero Data (First Login)</p>
      <div className="space-y-4">
        {/* Loading */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Holdings</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">isInitializing = true</p>
        </div>

        {/* View 0: Counts — empty */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Holdings</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="space-y-1.5">
            <span className="font-mono text-xs text-[var(--gs-gray-3)]/60">No NFTs loaded</span>
            <div className="flex gap-3">
              <span className="font-mono text-xs"><span className="text-[var(--gs-lime)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Minted</span></span>
              <span className="font-mono text-xs"><span className="text-[var(--gs-purple)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Bought</span></span>
              <span className="font-mono text-xs"><span className="text-[var(--gs-gray-2)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Free</span></span>
            </div>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 0: Ghost labels + &ldquo;No NFTs loaded&rdquo;</p>
        </div>

        {/* View 1: Distribution — empty */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Distribution</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="space-y-1.5">
            <span className="font-mono text-xs text-[var(--gs-gray-3)]/60">No NFTs loaded</span>
            <div className="space-y-1">
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-lime)]/10" style={{ width: '33%' }} /></div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-purple)]/10" style={{ width: '33%' }} /></div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-gray-2)]/10" style={{ width: '33%' }} /></div>
            </div>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 1: Ghost bars + &ldquo;No NFTs loaded&rdquo;</p>
        </div>

        {/* View 2: Data Quality — empty */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Data Quality</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">With dates</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">0%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-lime)]" style={{ width: '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">With cost</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">0%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-purple)]" style={{ width: '0%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">Enriched</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">0%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-white)]/30" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 2: Data Quality — bars at 0%</p>
        </div>
      </div>
    </div>

    {/* Column: Full Data */}
    <div>
      <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-3)] mb-4">Full Data (Loaded Wallet)</p>
      <div className="space-y-4">
        {/* Loading */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Holdings</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">isInitializing = true (same as zero)</p>
        </div>

        {/* View 0: Counts — populated */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Holdings</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="font-mono text-xs">
                <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                <span className="text-[var(--gs-white)]">3</span>
                <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
              </span>
              <p className="font-mono text-micro text-[var(--gs-gray-3)]/60 ml-[14px] tabular-nums">4,500 GUN</p>
            </div>
            <div>
              <span className="font-mono text-xs">
                <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                <span className="text-[var(--gs-white)]">11</span>
                <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
              </span>
              <p className="font-mono text-micro text-[var(--gs-gray-3)]/60 ml-[14px] tabular-nums">32,100 GUN</p>
            </div>
            <span className="font-mono text-xs">
              <span className="text-[var(--gs-gray-2)] mr-1.5">&#9670;</span>
              <span className="text-[var(--gs-white)]">3</span>
              <span className="text-[var(--gs-gray-3)] ml-1">Free</span>
            </span>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 0: Counts — with GUN cost per category</p>
        </div>

        {/* View 1: Distribution — populated */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Distribution</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">
                <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                <span className="text-[var(--gs-white)]">18%</span>
                <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">
                <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                <span className="text-[var(--gs-white)]">65%</span>
                <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">
                <span className="text-[var(--gs-gray-2)] mr-1.5">&#9670;</span>
                <span className="text-[var(--gs-white)]">17%</span>
                <span className="text-[var(--gs-gray-3)] ml-1">Free</span>
              </span>
            </div>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 1: Distribution — percentage breakdown</p>
        </div>

        {/* View 2: Data Quality — populated */}
        <div className="bg-[var(--gs-dark-2)] border border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">Data Quality</p>
            <span className="inline-flex gap-[3px] ml-1.5">
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.2 }} />
              <span className="w-[4px] h-[4px] rounded-full bg-[var(--gs-gray-3)]" style={{ opacity: 0.7 }} />
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">With dates</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">82%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-lime)]" style={{ width: '82%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">With cost</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">65%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-purple)]" style={{ width: '65%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]">Enriched</span>
                <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">100%</span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-white)]/30" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
          <p className="font-mono text-micro text-[var(--gs-gray-3)]/40 mt-2">View 2: Data Quality — bars showing coverage</p>
        </div>
      </div>
    </div>
  </div>
</section>
  );
}
