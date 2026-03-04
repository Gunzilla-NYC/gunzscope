interface ColorSwatch {
  name: string;
  hex: string;
  color: string;
  border?: boolean;
}

export function BrandSystem({ colorSwatches }: { colorSwatches: ColorSwatch[] }) {
  return (
    <section className="relative z-10 py-24 px-6 lg:px-10 border-t border-white/[0.06]" id="brand">
  <div className="flex items-baseline gap-4 mb-10 observe">
    <span className="section-number">01</span>
    <h2 className="font-display font-bold text-3xl uppercase tracking-wide">Brand System</h2>
    <div className="section-line" />
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
    {/* Color Palette */}
    <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Color Palette</span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {colorSwatches.map((swatch) => (
          <div key={swatch.hex} className="flex flex-col gap-2">
            <div
              className="w-full h-16 rounded transition-transform hover:scale-105"
              style={{
                backgroundColor: swatch.color,
                border: swatch.border ? '1px solid rgba(255,255,255,0.1)' : undefined,
              }}
            />
            <span className="font-mono text-caption text-[var(--gs-gray-4)]">{swatch.name}</span>
            <span className="font-mono text-caption text-[var(--gs-gray-2)]">{swatch.hex}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Typography */}
    <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Typography Stack</span>
      </div>

      <div className="mb-6">
        <span className="font-mono text-caption tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Display — Chakra Petch</span>
        <span className="font-display font-bold text-4xl uppercase tracking-wide gradient-text-brand">GUNZscope</span>
      </div>

      <div className="mb-6">
        <span className="font-mono text-caption tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Body — Outfit</span>
        <p className="font-body text-base font-light leading-relaxed text-[var(--gs-gray-4)] max-w-[500px]">
          Track your Off The Grid NFT portfolio with real-time profit & loss calculations, acquisition intelligence, and cross-chain analytics.
        </p>
      </div>

      <div>
        <span className="font-mono text-caption tracking-wide uppercase text-[var(--gs-gray-3)] block mb-2">Mono — JetBrains Mono</span>
        <div className="font-mono text-sm text-[var(--gs-lime)] p-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded">
          0xe4839c...ba4ae · 154 NFTs · +$412.50 (14.5%)
        </div>
      </div>
    </div>

    {/* Rarity Badges */}
    <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Rarity Badges</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(138,138,138,0.15)] text-[var(--gs-rarity-common)] border border-[rgba(138,138,138,0.2)]">Common</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(74,158,173,0.15)] text-[var(--gs-rarity-uncommon)] border border-[rgba(74,158,173,0.2)]">Uncommon</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(74,122,255,0.15)] text-[var(--gs-rarity-rare)] border border-[rgba(74,122,255,0.2)]">Rare</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(180,74,255,0.15)] text-[var(--gs-rarity-epic)] border border-[rgba(180,74,255,0.2)]">Epic</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,140,0,0.15)] text-[var(--gs-rarity-legendary)] border border-[rgba(255,140,0,0.2)]">Legendary</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,102,0.15)] text-[var(--gs-rarity-mythic)] border border-[rgba(255,68,102,0.2)]">Mythic</span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(231,76,60,0.15)] text-[var(--gs-rarity-classified)] border border-[rgba(231,76,60,0.2)]">🔒 Classified</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(0,255,136,0.1)] text-[var(--gs-profit)] border border-[rgba(0,255,136,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
          Profit
        </span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,68,68,0.1)] text-[var(--gs-loss)] border border-[rgba(255,68,68,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
          Loss
        </span>
        <span className="font-mono text-label tracking-wide uppercase px-2.5 py-1 rounded-sm bg-[rgba(255,170,0,0.1)] text-[var(--gs-warning)] border border-[rgba(255,170,0,0.2)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
          Pending
        </span>
      </div>
    </div>

    {/* Corner Cut System */}
    <div className="relative p-10 bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden observe brand-card">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-[1px] bg-[var(--gs-purple)]" />
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">Design Signature — Corner Cut</span>
      </div>
      <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed mb-6">
        The angled corner cut (clip-path) is GUNZscope&apos;s signature shape language,
        inspired by the game&apos;s HEX loot boxes and cyberpunk aesthetics. Applied to
        buttons, cards, badges, and containers at 6–10px cuts.
      </p>
      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner-lg flex items-center justify-center">
          <span className="font-mono text-label text-[var(--gs-lime)]">12px</span>
        </div>
        <div className="w-[60px] h-[60px] bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner flex items-center justify-center">
          <span className="font-mono text-label text-[var(--gs-lime)]">8px</span>
        </div>
        <div className="w-10 h-10 bg-[var(--gs-lime-glow)] border border-[var(--gs-lime)]/30 clip-corner-sm flex items-center justify-center">
          <span className="font-mono text-micro text-[var(--gs-lime)]">6px</span>
        </div>
      </div>
    </div>
  </div>
</section>
  );
}
