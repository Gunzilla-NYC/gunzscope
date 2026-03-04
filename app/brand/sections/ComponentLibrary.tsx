export function ComponentLibrary() {
  return (
    <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="components">
  <div className="flex items-baseline gap-4 mb-10 observe">
    <span className="section-number">02</span>
    <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Component Library</h2>
    <div className="section-line" />
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
    {/* Buttons */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Button Variants</span>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <button className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] transition-all clip-corner">
          Primary
        </button>
        <button className="font-display font-semibold text-sm tracking-wider uppercase px-6 py-3 bg-transparent text-[var(--gs-white-dim)] border border-[var(--gs-gray-1)] hover:border-[var(--gs-lime)] hover:text-[var(--gs-lime)] transition-all clip-corner">
          Secondary
        </button>
        <button className="font-mono text-data tracking-wide uppercase px-4 py-2 bg-transparent text-[var(--gs-gray-3)] border border-[var(--gs-gray-1)] hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-all">
          Ghost
        </button>
        <button className="font-display font-semibold text-xs tracking-wide uppercase px-5 py-2.5 bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.3)] hover:bg-[rgba(255,68,68,0.2)] transition-all clip-corner">
          Danger
        </button>
      </div>
    </div>

    {/* Status Badges */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Status Badges</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(0,255,136,0.1)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
          +14.5%
        </span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
          -3.2%
        </span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,170,0,0.1)] text-[var(--gs-warning)] border border-[rgba(255,170,0,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
          Syncing
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(166,247,0,0.1)] text-[var(--gs-lime)] border border-[rgba(166,247,0,0.2)]">GunzChain</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(153,69,255,0.1)] text-[#9945FF] border border-[rgba(153,69,255,0.2)]">Solana</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(109,91,255,0.1)] text-[var(--gs-purple)] border border-[rgba(109,91,255,0.2)]">Weapon</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,140,0,0.1)] text-[#FF8C00] border border-[rgba(255,140,0,0.2)]">Skin</span>
      </div>
    </div>

    {/* Stat Cards */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Stat Cards</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
          <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">GUN Price</div>
          <div className="font-display text-xl font-bold text-[var(--gs-lime)]">$0.0847</div>
        </div>
        <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
          <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">24h Volume</div>
          <div className="font-display text-xl font-bold text-[var(--gs-purple)]">$1.2M</div>
        </div>
        <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
          <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">Total NFTs</div>
          <div className="font-display text-xl font-bold text-[var(--gs-white)]">154</div>
        </div>
        <div className="p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 border-l-[var(--gs-gray-1)] hover:border-l-[var(--gs-lime)] transition-all">
          <div className="font-mono text-label tracking-wider uppercase text-[var(--gs-gray-3)] mb-1">Unrealized</div>
          <div className="font-display text-xl font-bold text-[var(--gs-profit)]">+$412</div>
        </div>
      </div>
    </div>

    {/* Loading States */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Loading States</span>
      </div>
      <div className="flex gap-10 items-center">
        {/* Progress bar */}
        <div className="w-[200px] h-[3px] bg-[var(--gs-dark-4)] rounded-sm overflow-hidden">
          <div className="h-full gradient-action rounded-sm animate-loader-pulse" />
        </div>

        {/* Spinner */}
        <div className="w-8 h-8 border-2 border-[var(--gs-gray-1)] border-t-[var(--gs-lime)] rounded-full animate-spin" />

        {/* Dots */}
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>

    {/* P&L Loading / Analysis Indicator */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">P&amp;L Analysis Indicator</span>
      </div>
      <div className="space-y-6">
        {/* Stage cycling */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Stage Messages</span>
          <div className="space-y-3">
            {['Fetching acquisition data...', 'Querying historical prices...', 'Calculating cost basis...', 'Computing P&L...'].map((stage, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-[var(--gs-lime)]/50 ${i === 0 ? 'animate-ping' : ''}`} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
                </span>
                <span className={`text-label font-mono ${i === 0 ? 'text-[var(--gs-gray-3)]' : 'text-[var(--gs-gray-2)]'}`}>
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Enriching with progress */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Enriching (Determinate)</span>
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gs-lime)]/50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
              </span>
              <span className="text-label text-[var(--gs-gray-3)] font-mono">
                Analyzing 89 of 154 NFTs...
              </span>
            </div>
            <div className="w-[120px] h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]"
                style={{ width: '58%' }}
              />
            </div>
          </div>
        </div>
        {/* Complete */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Complete</span>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
            </span>
            <span className="text-label text-[var(--gs-gray-3)] font-mono">
              Analysis complete
            </span>
            <span className="text-label text-[var(--gs-gray-2)] font-mono">
              (33s)
            </span>
          </div>
        </div>
        {/* With long elapsed */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Long Running (Elapsed)</span>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gs-lime)]/50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
            </span>
            <span className="text-label text-[var(--gs-gray-3)] font-mono">
              Computing P&amp;L...
            </span>
            <span className="text-label text-[var(--gs-gray-2)] font-mono">
              (45s)
            </span>
          </div>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/ui/PnLLoadingIndicator.tsx</code>
        <br />
        Pulsing dot animates during active enrichment. Elapsed time shown after 10s. Determinate progress bar appears when real NFT enrichment progress is available.
      </p>
    </div>

    {/* Sparkline Chart */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Sparkline Chart</span>
      </div>
      <div className="space-y-6">
        {/* Positive trend */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Positive Trend</span>
          <div className="flex items-center gap-4">
            <svg width={120} height={36} viewBox="0 0 120 36">
              <defs>
                <linearGradient id="sparkline-demo-pos" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#beffd2" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#beffd2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 4 28 L 20 24 L 36 26 L 52 18 L 68 20 L 84 12 L 100 14 L 116 6" fill="none" stroke="#beffd2" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 4 28 L 20 24 L 36 26 L 52 18 L 68 20 L 84 12 L 100 14 L 116 6 L 116 32 L 4 32 Z" fill="url(#sparkline-demo-pos)" />
              <circle cx={116} cy={6} r={4} fill="#beffd2" opacity={0.3} />
              <circle cx={116} cy={6} r={2.5} fill="#beffd2" />
            </svg>
            <span className="font-mono text-caption text-[var(--gs-gray-3)]">Color: #beffd2</span>
          </div>
        </div>
        {/* Negative trend */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Negative Trend</span>
          <div className="flex items-center gap-4">
            <svg width={120} height={36} viewBox="0 0 120 36">
              <defs>
                <linearGradient id="sparkline-demo-neg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 4 8 L 20 10 L 36 14 L 52 12 L 68 20 L 84 22 L 100 26 L 116 28" fill="none" stroke="#ff6b6b" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 4 8 L 20 10 L 36 14 L 52 12 L 68 20 L 84 22 L 100 26 L 116 28 L 116 32 L 4 32 Z" fill="url(#sparkline-demo-neg)" />
              <circle cx={116} cy={28} r={4} fill="#ff6b6b" opacity={0.3} />
              <circle cx={116} cy={28} r={2.5} fill="#ff6b6b" />
            </svg>
            <span className="font-mono text-caption text-[var(--gs-gray-3)]">Color: #ff6b6b</span>
          </div>
        </div>
        {/* Neutral/flat */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Neutral / No Data</span>
          <div className="flex items-center gap-4">
            <svg width={120} height={36} className="opacity-30">
              <line x1={4} y1={18} x2={116} y2={18} stroke="#64ffff" strokeWidth={1} strokeDasharray="4 4" />
            </svg>
            <span className="font-mono text-caption text-[var(--gs-gray-3)]">Dashed · #64ffff</span>
          </div>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/ui/Sparkline.tsx</code>
        <br />
        SVG sparkline with gradient fill, trend-based coloring, and current value dot with glow. Used in PortfolioGlanceCard for 24h portfolio value history.
      </p>
    </div>

    {/* Coverage Badge */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Coverage Badge</span>
      </div>
      <div className="space-y-4">
        {/* High */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
            <span className="text-caption font-mono text-[var(--gs-profit)]">High (100%)</span>
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">&ge;80% coverage</span>
        </div>
        {/* Partial */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-[#f5a623]/10 border-[#f5a623]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
            <span className="text-caption font-mono text-[#f5a623]">Partial (65%)</span>
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">&ge;50% coverage</span>
        </div>
        {/* Limited */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
            <span className="text-caption font-mono text-[var(--gs-loss)]">Limited (20%)</span>
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">&lt;50% coverage</span>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/ui/CoverageBadge.tsx</code>
        <br />
        Shows P&amp;L data coverage fraction. Color-coded: green (high), yellow (partial), red (limited). Hidden at 0%.
      </p>
    </div>

    {/* Confidence Indicator */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Confidence Indicator</span>
      </div>
      <div className="space-y-3">
        {/* Section: Active — blink speed scales with proximity to next tier */}
        <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-1">Active (blink speed scales near thresholds)</span>
        {/* Low 10% — slow blink (far from 50%) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF4444', animation: 'confidence-blink 2.92s ease-in-out infinite' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Low (10%) &mdash; slow pulse <span className="text-[var(--gs-gray-2)]">2.92s</span></span>
        </div>
        {/* Low 45% — fast blink (close to 50%) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FA7534', animation: 'confidence-blink 0.89s ease-in-out infinite' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Low (45%) &mdash; rapid pulse <span className="text-[var(--gs-gray-2)]">0.89s</span></span>
        </div>
        {/* Medium 55% — slow blink (just entered, far from 80%) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f5a623' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f5a623', animation: 'confidence-blink 3.02s ease-in-out infinite' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Medium (55%) &mdash; slow pulse <span className="text-[var(--gs-gray-2)]">3.02s</span></span>
        </div>
        {/* Medium 78% — fast blink (close to 80%) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7BD056' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7BD056', animation: 'confidence-blink 0.79s ease-in-out infinite' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Medium (78%) &mdash; rapid pulse <span className="text-[var(--gs-gray-2)]">0.79s</span></span>
        </div>
        {/* High 85% — slow blink (far from 100%) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88', animation: 'confidence-blink 2.78s ease-in-out infinite' }} />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">High (85%) &mdash; slow pulse <span className="text-[var(--gs-gray-2)]">2.78s</span></span>
        </div>
        {/* High 97% — fast blink (almost complete) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88', animation: 'confidence-blink 1.04s ease-in-out infinite' }} />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">High (97%) &mdash; rapid pulse <span className="text-[var(--gs-gray-2)]">1.04s</span></span>
        </div>

        {/* Section: Settled (scan complete, incomplete data) */}
        <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mt-5 mb-1">Settled (scan done, this is final)</span>
        {/* Low settled — dot 1 at 35% opacity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF4444', opacity: 0.35 }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Low settled (25%) &mdash; dot 1 faded</span>
        </div>
        {/* Low settled near threshold — red→amber blend at 35% opacity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(250,117,52)', opacity: 0.35 }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Low settled (45%) &mdash; red&rarr;amber blend, faded</span>
        </div>
        {/* Medium settled — dot 2 at 35% opacity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f5a623' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f5a623', opacity: 0.35 }} />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Medium settled (60%) &mdash; dot 2 faded</span>
        </div>
        {/* High settled — dot 3 at 50% opacity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88', opacity: 0.35 }} />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">High settled (90%) &mdash; dot 3 faded</span>
        </div>

        {/* Section: Complete */}
        <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mt-5 mb-1">Complete</span>
        {/* 100% — all solid, no blink */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00FF88' }} />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">Complete (100%) &mdash; all solid green</span>
        </div>
        {/* None */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">None (0%) &mdash; hidden in production</span>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/ui/ConfidenceIndicator.tsx</code>
        <br />
        Percentage-driven 3-dot indicator. While scanning, the <strong>last filled dot blinks</strong>. Once settled, it stops blinking and fades to <strong>50% opacity</strong> to signal &ldquo;this is as good as it gets.&rdquo; At 100%, all dots go solid green.
      </p>
    </div>

    {/* Performance Metrics */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Performance Metrics</span>
      </div>
      <div className="space-y-6">
        {/* With data */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">With Data</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">24h:</span>
              <span className="text-[13px] font-medium text-[#beffd2]">+$12.40</span>
              <span className="text-data text-[#beffd2]">(+3.21%)</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">7d:</span>
              <span className="text-[13px] font-medium text-[#ff6b6b]">-$28.60</span>
              <span className="text-data text-[#ff6b6b]">(-6.85%)</span>
            </div>
          </div>
        </div>
        {/* Calculating */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Calculating</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">24h:</span>
              <span className="text-[13px] font-medium text-[var(--gs-gray-2)] italic">Calculating{'\u2026'}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">7d:</span>
              <span className="text-[13px] font-medium text-[var(--gs-gray-2)] italic">Calculating{'\u2026'}</span>
            </div>
          </div>
        </div>
        {/* Flat */}
        <div>
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-3">Flat / Zero</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">24h:</span>
              <span className="text-[13px] font-medium text-[var(--gs-gray-3)]">+$0.00</span>
              <span className="text-data text-[var(--gs-gray-3)]">(+0.00%)</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-body-sm text-[var(--gs-gray-3)]">7d:</span>
              <span className="text-[13px] font-medium text-[var(--gs-gray-3)]">+$0.00</span>
              <span className="text-data text-[var(--gs-gray-3)]">(+0.00%)</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/header/PortfolioGlanceCard.tsx</code>
        <br />
        24h and 7d change metrics from portfolio history snapshots. Green for positive, red for negative, gray for flat. Italic &ldquo;Calculating&rdquo; when insufficient history data.
      </p>
    </div>

    {/* Insights Panel */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Insights Panel</span>
      </div>
      <div className="space-y-1.5">
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
          Insights
        </p>
        {/* Best performer */}
        <div className="w-full flex items-center justify-between px-2.5 py-2 bg-white/[0.03] rounded">
          <span className="text-data text-white/70 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-[var(--gs-profit)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Best performer</span>
            <span className="text-white/40 truncate max-w-[120px]">&middot; HEXDRINKER</span>
          </span>
          <span className="text-data font-mono font-medium text-[var(--gs-profit)]">
            +142.5%
          </span>
        </div>
        {/* Below cost */}
        <div className="w-full flex items-center justify-between px-2.5 py-2 bg-white/[0.03] rounded">
          <span className="text-data text-white/70 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-[var(--gs-loss)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Below cost basis</span>
          </span>
          <span className="text-data font-mono font-medium text-[var(--gs-loss)]">
            3 items
          </span>
        </div>
        {/* Loading state */}
        <div className="mt-4">
          <span className="font-mono text-label uppercase tracking-wider text-[var(--gs-gray-4)] block mb-2">Loading</span>
          <div className="space-y-2">
            <div className="h-7 bg-white/5 rounded animate-pulse" />
            <div className="h-7 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/ui/InsightsPanel.tsx</code>
        <br />
        Auto-generated insights from portfolio analysis. Rows stagger-animate in. Shows best performer (green arrow) and items below cost (red arrow).
      </p>
    </div>

    {/* Status / Helper Lines */}
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-10 observe">
      <div className="flex items-center gap-2 mb-6 component-label">
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Status &amp; Helper Lines</span>
      </div>
      <div className="space-y-4">
        {/* Collecting history */}
        <div className="flex items-center gap-1.5 text-body-sm text-[var(--gs-gray-2)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Collecting history data{'\u2026'}</span>
        </div>
        {/* Performance tooltip */}
        <div className="flex items-center gap-1.5">
          <span className="text-data tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium">
            Performance
          </span>
          <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-2 bg-black/95 border border-white/20 rounded-lg px-3 py-2 text-data text-white/70">
            Change metrics appear after enough history is collected.
          </div>
        </div>
        {/* Enrichment complete line */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-gray-3)]" />
          <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
            All transferred
          </span>
        </div>
        {/* Enriching in-progress */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
          <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
            Analyzing
          </span>
        </div>
      </div>
      <p className="text-data text-[var(--gs-gray-2)] mt-6 leading-relaxed">
        Source: <code className="text-[var(--gs-gray-3)]">components/header/PortfolioGlanceCard.tsx</code>
        <br />
        Tertiary status lines used throughout the portfolio section. Clock icon for history collection, info tooltip for calculating state, dot indicators for enrichment status.
      </p>
    </div>
  </div>
</section>
  );
}
