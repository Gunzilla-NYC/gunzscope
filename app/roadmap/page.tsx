'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isAdminWallet } from '@/lib/auth/dynamicAuth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ---------------------------------------------------------------------------
// Inline sub-components (static content, no need for separate files)
// ---------------------------------------------------------------------------

const CLIP_SM = 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))';

function DocBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.05] font-mono text-[10px] tracking-[2px] uppercase text-[var(--gs-lime)] mb-6"
      style={{ clipPath: CLIP_SM }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
      Architecture Document &mdash; v0.1
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[2px] uppercase text-[var(--gs-purple)]/70 mb-3">
      <span className="w-3 h-px bg-[var(--gs-purple)]" />
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-bold text-[28px] uppercase tracking-wide mb-8">
      {children}
    </h2>
  );
}

function FeatureTag({ type }: { type: 'write' | 'read' | 'hybrid' }) {
  const styles = {
    write: 'bg-[var(--gs-lime)]/[0.08] text-[var(--gs-lime)] border-[var(--gs-lime)]/20',
    read: 'bg-[var(--gs-purple)]/10 text-[var(--gs-purple)] border-[var(--gs-purple)]/20',
    hybrid: 'bg-[#FFAA00]/[0.08] text-[#FFAA00] border-[#FFAA00]/20',
  };
  return (
    <span className={`inline-block font-mono text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 border mb-3 ${styles[type]}`}>
      {type}
    </span>
  );
}

function ArchNode({ variant, children, dim }: { variant: 'gunz' | 'scope' | 'external' | 'avax'; children: React.ReactNode; dim?: boolean }) {
  const styles = {
    gunz: 'bg-[var(--gs-lime)]/[0.06] border-[var(--gs-lime)]/20 text-[var(--gs-lime)]',
    scope: 'bg-[var(--gs-purple)]/[0.06] border-[var(--gs-purple)]/20 text-[var(--gs-purple)]',
    external: 'bg-white/[0.03] border-white/[0.08] text-[var(--gs-gray-4)]',
    avax: 'bg-[#FF4444]/[0.04] border-[#FF4444]/12 text-[#E84142]',
  };
  return (
    <div
      className={`px-5 py-3 font-mono text-[11px] border ${styles[variant]} ${dim ? 'opacity-50' : ''}`}
      style={{ clipPath: CLIP_SM }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RoadmapPage() {
  const router = useRouter();
  const { primaryWallet, sdkHasLoaded } = useDynamicContext();
  const isAdmin = isAdminWallet(primaryWallet?.address);

  useEffect(() => {
    if (sdkHasLoaded && !isAdmin) router.replace('/');
  }, [sdkHasLoaded, isAdmin, router]);

  if (!sdkHasLoaded || !isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--gs-black)]">
        <div className="w-5 h-5 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)]">
      <div className="grid-bg" />
      <Navbar />

      <main className="flex-1 max-w-[1200px] mx-auto px-5 md:px-10 py-16 w-full relative z-[1]">

        {/* ================================================================
            HEADER
        ================================================================ */}
        <header className="pb-14 border-b border-white/[0.06]">
          <DocBadge />
          <h1 className="font-display font-bold text-[clamp(36px,5vw,56px)] uppercase tracking-tight leading-none mb-4">
            <span className="text-[var(--gs-purple)]">On&#8209;Chain</span> Strategy<br />
            <span className="text-[var(--gs-lime)]">&amp; Architecture</span>
          </h1>
          <p className="text-lg font-light text-[var(--gs-gray-4)] max-w-[700px]">
            A comprehensive blueprint for integrating blockchain read{' '}
            <strong className="text-[var(--gs-white)] font-medium">and write</strong> operations
            into GUNZscope &mdash; covering portfolio attestations, weapon lab certifications, reputation systems,
            OTC trading, and curated loadout publishing across the{' '}
            <strong className="text-[var(--gs-white)] font-medium">GUNZ ecosystem</strong>.
          </p>
        </header>

        {/* ================================================================
            CRITICAL CONSTRAINT BANNER
        ================================================================ */}
        <div className="my-10 px-8 py-6 bg-[#FF4444]/[0.04] border border-[#FF4444]/15 border-l-[3px] border-l-[var(--gs-loss)] flex gap-4 items-start">
          <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">&#9888;</span>
          <div>
            <div className="font-display text-sm font-semibold uppercase tracking-[1px] text-[var(--gs-loss)] mb-1.5">
              Critical Constraint &mdash; Permissioned Deployment
            </div>
            <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed">
              GunzChain (<code className="font-mono text-xs bg-white/[0.06] px-1.5 py-0.5 rounded text-[var(--gs-white)]">chain_id: 43419</code>) is a{' '}
              <strong className="text-[var(--gs-white)]">permissioned network</strong>.
              Smart contract deployment requires explicit approval from Gunzilla Games. This means we cannot freely deploy
              attestation contracts, soulbound tokens, or any custom logic directly on GunzChain without partnership.
              This constraint shapes our entire multi&#8209;chain strategy &mdash; we use GunzChain for{' '}
              <strong className="text-[var(--gs-white)]">reading</strong> game state, and a permissionless chain for{' '}
              <strong className="text-[var(--gs-white)]">writing</strong> GUNZscope&#8209;native data.
            </p>
          </div>
        </div>

        {/* ================================================================
            CHAIN INTELLIGENCE
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>Chain Intelligence</SectionLabel>
          <SectionHeading>GunzChain Landscape</SectionHeading>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {['Property', 'Detail', 'Implication for GUNZscope'].map(h => (
                    <th key={h} className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-3)] px-5 py-3 border-b border-[var(--gs-gray-1)] bg-[var(--gs-dark-2)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ['Chain ID', '43419', 'Not indexed by Blockscout hosted \u2014 must query gunzscan.io API or RPC directly'],
                  ['Consensus', 'Snowman++ (Avalanche)', 'Sub\u2011second finality, ~1\u20112s blocks. Near\u2011instant confirmation for read ops'],
                  ['EVM Compatible', ['Yes \u2014 Full Solidity support', 'yes'], 'Standard ERC\u2011721 NFTs, standard RPC calls, ethers.js compatible'],
                  ['Contract Deploy', ['Permissioned Only', 'no'], 'Cannot deploy custom contracts without Gunzilla approval'],
                  ['Native Currency', 'GUN (not ERC\u201120)', 'Use eth_getBalance for GUN balance, not token contract calls'],
                  ['NFT Standard', 'ERC\u2011721', 'Standard ownerOf, tokenURI, balanceOf queries work'],
                  ['Explorer', 'gunzscan.io (Blockscout)', 'Blockscout v2 API available at gunzscan.io/api/v2/*'],
                  ['Bridge', 'AVAX C\u2011Chain + Solana', 'Cross\u2011chain portfolio tracking requires monitoring bridge contracts'],
                  ['Scale', '14M+ wallets, 440M+ txns', 'Mature chain with substantial on\u2011chain history to index'],
                  ['RPC Endpoint', 'rpc.gunzchain.io/ext/bc/2M47T\u2026/rpc', 'Public node available \u2014 may need IP whitelisting for production'],
                ] as [string, string | [string, string], string][]).map(([prop, detail, impl]) => {
                  const detailText = Array.isArray(detail) ? detail[0] : detail;
                  const detailColor = Array.isArray(detail)
                    ? detail[1] === 'yes' ? 'text-[var(--gs-profit)]'
                      : detail[1] === 'no' ? 'text-[var(--gs-loss)]'
                      : ''
                    : '';
                  return (
                    <tr key={prop}>
                      <td className="font-display font-semibold text-[13px] uppercase tracking-wide text-[var(--gs-white)] px-5 py-3.5 border-b border-white/[0.06] bg-[var(--gs-dark-1)]">
                        {prop}
                      </td>
                      <td className={`font-mono text-xs px-5 py-3.5 border-b border-white/[0.06] bg-[var(--gs-dark-1)] ${detailColor || 'text-[var(--gs-gray-4)]'}`}>
                        {detailText}
                      </td>
                      <td className="font-mono text-xs text-[var(--gs-gray-4)] px-5 py-3.5 border-b border-white/[0.06] bg-[var(--gs-dark-1)]">
                        {impl}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================================================================
            DEPLOYMENT STRATEGY
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>Deployment Strategy</SectionLabel>
          <SectionHeading>Where Do We Write?</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-white/[0.04] mb-10">
            {/* Recommended: Hybrid */}
            <div className="p-8 bg-[var(--gs-dark-1)] border-t-2 border-t-[var(--gs-lime)] relative hover:bg-[var(--gs-dark-2)] transition-colors">
              <span className="absolute top-3 right-4 font-mono text-[8px] tracking-[1.5px] text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.08] px-2 py-0.5 border border-[var(--gs-lime)]/20">
                RECOMMENDED
              </span>
              <h3 className="font-display font-semibold text-base uppercase tracking-[1px] mb-3">
                Hybrid: Read GUNZ &rarr; Write AVAX C&#8209;Chain
              </h3>
              <p className="text-sm text-[var(--gs-gray-3)] leading-relaxed mb-4">
                Deploy GUNZscope&rsquo;s custom contracts (attestations, reputation, OTC) on Avalanche C&#8209;Chain.
                Read NFT/wallet data from GunzChain. Both chains share the Avalanche ecosystem &mdash;
                natural alignment for users already bridging between them.
              </p>
              <div className="font-mono text-[11px] leading-loose">
                <span className="text-[var(--gs-profit)]">+</span> Permissionless deployment on C&#8209;Chain<br />
                <span className="text-[var(--gs-profit)]">+</span> Same ecosystem, shared tooling<br />
                <span className="text-[var(--gs-profit)]">+</span> Low gas costs<br />
                <span className="text-[var(--gs-profit)]">+</span> No Gunzilla approval needed to ship v1
              </div>
            </div>

            {/* Full GunzChain */}
            <div className="p-8 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] transition-colors">
              <h3 className="font-display font-semibold text-base uppercase tracking-[1px] mb-3">
                Full GunzChain (Requires Partnership)
              </h3>
              <p className="text-sm text-[var(--gs-gray-3)] leading-relaxed mb-4">
                Apply to Gunzilla for contract deployment permission. Deploy everything natively on GunzChain
                where the NFTs and GUN tokens already live. Best UX but requires business relationship.
              </p>
              <div className="font-mono text-[11px] leading-loose">
                <span className="text-[var(--gs-profit)]">+</span> Everything on one chain<br />
                <span className="text-[var(--gs-profit)]">+</span> No bridging complexity<br />
                <span className="text-[var(--gs-profit)]">+</span> Closest to user&rsquo;s existing wallet<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Requires Gunzilla approval<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Timeline uncertainty<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> May restrict contract functionality
              </div>
            </div>

            {/* Base L2 */}
            <div className="p-8 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] transition-colors">
              <h3 className="font-display font-semibold text-base uppercase tracking-[1px] mb-3">
                Base L2 (Maximum Ecosystem)
              </h3>
              <p className="text-sm text-[var(--gs-gray-3)] leading-relaxed mb-4">
                Deploy on Base for maximum DeFi composability and user base. Good if GUNZscope
                evolves into a broader NFT analytics platform beyond just OTG.
              </p>
              <div className="font-mono text-[11px] leading-loose">
                <span className="text-[var(--gs-profit)]">+</span> Huge ecosystem<br />
                <span className="text-[var(--gs-profit)]">+</span> DeFi composability<br />
                <span className="text-[var(--gs-profit)]">+</span> Cheap gas (L2)<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Different ecosystem from GUNZ<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Bridge overhead for GUN holders<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Less thematic alignment
              </div>
            </div>

            {/* Off-Chain */}
            <div className="p-8 bg-[var(--gs-dark-1)] hover:bg-[var(--gs-dark-2)] transition-colors">
              <h3 className="font-display font-semibold text-base uppercase tracking-[1px] mb-3">
                Off&#8209;Chain + Signed Proofs
              </h3>
              <p className="text-sm text-[var(--gs-gray-3)] leading-relaxed mb-4">
                Keep all GUNZscope data off&#8209;chain but sign proofs with a wallet key that anyone can verify.
                Ship fastest, migrate to on&#8209;chain later. Good for MVP.
              </p>
              <div className="font-mono text-[11px] leading-loose">
                <span className="text-[var(--gs-profit)]">+</span> Ship immediately<br />
                <span className="text-[var(--gs-profit)]">+</span> Zero gas costs<br />
                <span className="text-[var(--gs-profit)]">+</span> Verifiable via signatures<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Not truly on&#8209;chain<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> Requires trust in GUNZscope&rsquo;s server<br />
                <span className="text-[var(--gs-loss)]">&minus;</span> No composability
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SIX ON-CHAIN CONCEPTS
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>Feature Architecture</SectionLabel>
          <SectionHeading>Six On&#8209;Chain Concepts</SectionHeading>

          <div className="flex flex-col gap-0.5 mb-14">
            {([
              {
                num: '01', tag: 'write' as const, name: 'On\u2011Chain Attestations & Provenance',
                desc: 'GUNZscope signs and publishes verifiable portfolio attestations \u2014 "this wallet held X NFTs valued at Y GUN as of block Z." Creates a provable track record that third parties (tournaments, lenders, guilds) can independently verify without trusting GUNZscope\u2019s frontend.',
                details: [
                  'Deploy Attestation Registry contract on AVAX C\u2011Chain',
                  'Schema: wallet, portfolio_hash, total_value, nft_count, gun_balance, block_ref, timestamp',
                  'GUNZscope backend reads GunzChain state \u2192 computes merkle root \u2192 writes attestation',
                  'Users can trigger attestation from dashboard ("Certify My Portfolio")',
                  'Consider EAS (Ethereum Attestation Service) integration on AVAX',
                  'Revenue: charge small GUN/AVAX fee per attestation',
                ],
              },
              {
                num: '02', tag: 'write' as const, name: 'Portfolio Snapshots & Leaderboards',
                desc: 'Periodic on\u2011chain snapshots of wallet portfolios that power provable leaderboards. Not self\u2011reported \u2014 derived from chain state. Track portfolio growth over time with immutable history. Weekly/monthly snapshots create competitive seasons.',
                details: [
                  'Snapshot contract stores: wallet \u2192 epoch \u2192 value_hash',
                  'GUNZscope oracle reads GunzChain, computes values, submits batch snapshots',
                  'Leaderboard derived from snapshot deltas (% growth, absolute value)',
                  'Could use Chainlink or custom oracle pattern on AVAX C\u2011Chain',
                  'Season system: "Season 1" snapshot start/end blocks',
                  'Revenue: premium leaderboard features, season entry fees',
                ],
              },
              {
                num: '03', tag: 'hybrid' as const, name: 'Weapon Lab Certifications',
                desc: 'When the Weapon Lab confirms a skin/attachment is compatible with a specific weapon, that compatibility check gets published as an on\u2011chain certification. Creates a decentralized registry of verified weapon configurations that the community can build on.',
                details: [
                  'READ: Parse weapon/skin model codes from GunzChain NFT metadata',
                  'COMPUTE: Run compatibility algorithm (model code matching)',
                  'WRITE: Publish certification to registry contract on AVAX',
                  'Schema: weapon_token_id, attachment_token_id, compatibility_score, certified_by',
                  'Classified weapons auto\u2011flagged as "immutable" \u2014 no certifications issued',
                  'Community can query: "what skins work with my Vulture?"',
                ],
              },
              {
                num: '04', tag: 'write' as const, name: 'Reputation & Soulbound Badges',
                desc: 'Non\u2011transferable (soulbound) tokens that mark milestones and build on\u2011chain reputation. "First 100 Users," "10K Portfolio," "Complete Weapon Set," "Season 1 Champion." Identity that travels with the wallet across the GUNZ ecosystem.',
                details: [
                  'ERC\u20115192 (Soulbound) or ERC\u20114671 (Non\u2011Tradable) token contract',
                  'Milestones auto\u2011detected from on\u2011chain state changes',
                  'Badge metadata includes proof: "held 100+ NFTs at block #X"',
                  'Tiered system: Bronze \u2192 Silver \u2192 Gold \u2192 Diamond',
                  'Future: use as access control for premium features',
                  'Deploy on AVAX C\u2011Chain, readable by any dApp in ecosystem',
                ],
              },
              {
                num: '05', tag: 'write' as const, name: 'Trade Intents & OTC Layer',
                desc: 'Users publish on\u2011chain trade intents \u2014 "looking to swap my Epic Vulture for a Legendary Kestrel" or "WTB any Rare Reflex Sight under 500 GUN." Creates a decentralized OTC orderbook that lives outside any single marketplace. Discovery layer, not execution.',
                details: [
                  'Intent Registry contract: maker, want_type, offer_type, conditions, expiry',
                  'Intents are lightweight \u2014 just signals, not escrow',
                  'Matching engine off\u2011chain, settlement on GUNZ marketplace',
                  'Could evolve into full escrow if Gunzilla approves deployment',
                  'Revenue: featured listings, intent analytics for market intelligence',
                  'Composable: other dApps can read and surface intents',
                ],
              },
              {
                num: '06', tag: 'hybrid' as const, name: 'Curated Loadout Publishing',
                desc: 'Players publish their weapon loadouts as on\u2011chain data structures \u2014 verified configurations that others can reference, clone, or bid on. Think "Steam workshop" but provable and on\u2011chain. Builds social layer around weapon optimization.',
                details: [
                  'Loadout = array of token_ids (weapon + attachments + skin)',
                  'Published loadout verifies ownership at publish time',
                  'Community can upvote/fork loadouts (on\u2011chain social signals)',
                  'Cross\u2011reference with Weapon Lab certifications for validity',
                  '"Meta report" derived from most\u2011published loadout patterns',
                  'Revenue: premium loadout showcases, featured builder profiles',
                ],
              },
            ]).map(f => (
              <div key={f.num} className="grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr_1fr] gap-0.5 bg-white/[0.03]">
                {/* Number */}
                <div className="bg-[var(--gs-dark-2)] flex items-center justify-center font-display font-bold text-[28px] text-[var(--gs-lime)] border-r-2 border-r-[var(--gs-lime)]">
                  {f.num}
                </div>

                {/* Main */}
                <div className="p-8 bg-[var(--gs-dark-1)]">
                  <FeatureTag type={f.tag} />
                  <h3 className="font-display font-bold text-xl uppercase tracking-wide mb-2">{f.name}</h3>
                  <p className="text-sm text-[var(--gs-gray-3)] leading-relaxed">{f.desc}</p>
                </div>

                {/* Detail (hidden on mobile) */}
                <div className="hidden md:block p-8 bg-[var(--gs-dark-2)]">
                  <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] mb-3">
                    Implementation Path
                  </div>
                  <ul className="flex flex-col">
                    {f.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 font-mono text-[11px] text-[var(--gs-gray-4)] py-1.5 border-b border-white/[0.03]">
                        <span className="text-[var(--gs-purple)]/60 shrink-0">&rarr;</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================
            ARCHITECTURE DIAGRAM
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>System Design</SectionLabel>
          <SectionHeading>Architecture Overview</SectionHeading>

          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 md:p-10 my-10 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/40 to-transparent" />

            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[2px] uppercase text-[var(--gs-gray-3)] mb-8">
              <span className="text-[var(--gs-purple)]">//</span>
              Data Flow &mdash; Multi&#8209;Chain Architecture
            </div>

            <div className="flex flex-col gap-4">
              {/* User Layer */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] md:text-right md:pt-3.5">
                  User Layer
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ArchNode variant="scope">GUNZscope Dashboard</ArchNode>
                  <ArchNode variant="scope">Wallet Connect</ArchNode>
                  <ArchNode variant="scope">Portfolio View</ArchNode>
                  <ArchNode variant="scope">Weapon Lab</ArchNode>
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center md:ml-[140px]">
                <div className="w-px h-6 bg-gradient-to-b from-[var(--gs-lime)]/30 to-[var(--gs-purple)]/30" />
              </div>

              {/* Backend */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] md:text-right md:pt-3.5">
                  Backend
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ArchNode variant="scope">GUNZscope Oracle</ArchNode>
                  <ArchNode variant="scope">Portfolio Indexer</ArchNode>
                  <ArchNode variant="scope">Weapon Engine</ArchNode>
                  <ArchNode variant="scope">Attestation Signer</ArchNode>
                </div>
              </div>

              <div className="flex justify-center md:ml-[140px]">
                <div className="w-px h-6 bg-gradient-to-b from-[var(--gs-lime)]/30 to-[var(--gs-purple)]/30" />
              </div>

              {/* Read Layer */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] md:text-right md:pt-3.5">
                  Read Layer
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ArchNode variant="gunz">GunzChain (43419)</ArchNode>
                  <ArchNode variant="gunz">gunzscan.io API</ArchNode>
                  <ArchNode variant="gunz">GunzChain RPC</ArchNode>
                  <ArchNode variant="external">CoinGecko (GUN Price)</ArchNode>
                </div>
              </div>

              <div className="flex justify-center md:ml-[140px]">
                <div className="w-px h-6 bg-gradient-to-b from-[var(--gs-lime)]/30 to-[var(--gs-purple)]/30" />
              </div>

              {/* Write Layer */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] md:text-right md:pt-3.5">
                  Write Layer
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ArchNode variant="avax">AVAX C&#8209;Chain (43114)</ArchNode>
                  <ArchNode variant="scope">Attestation Registry</ArchNode>
                  <ArchNode variant="scope">Reputation (SBT)</ArchNode>
                  <ArchNode variant="scope">Intent Registry</ArchNode>
                  <ArchNode variant="scope">Loadout Registry</ArchNode>
                </div>
              </div>

              <div className="flex justify-center md:ml-[140px]">
                <div className="w-px h-6 bg-gradient-to-b from-[var(--gs-lime)]/30 to-[var(--gs-purple)]/30" />
              </div>

              {/* Future */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] md:text-right md:pt-3.5">
                  Future
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ArchNode variant="gunz" dim>Native GunzChain Deployment (Partnership)</ArchNode>
                  <ArchNode variant="external" dim>Solana (SPL NFTs)</ArchNode>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            PHASED ROLLOUT
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>Execution Plan</SectionLabel>
          <SectionHeading>Phased Rollout</SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-white/[0.04] my-10">
            {/* Phase 1 — Current */}
            <div className="p-8 bg-[var(--gs-dark-1)] border-t-2 border-t-[var(--gs-lime)]">
              <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-lime)] mb-2">
                Phase 1 &mdash; Foundation
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide mb-4">
                Read + First Write
              </h3>
              <ul className="flex flex-col gap-2">
                {([
                  { text: 'GunzChain RPC integration', done: true },
                  { text: 'gunzscan.io API indexing', done: true },
                  { text: 'Portfolio read (GUN + NFTs)', done: false },
                  { text: 'NFT metadata parsing', done: false },
                  { text: 'Deploy Attestation Registry on AVAX C\u2011Chain', done: false },
                  { text: '\u201cCertify My Portfolio\u201d button in dashboard', done: false },
                ]).map((item, i) => (
                  <li key={i} className="text-[13px] text-[var(--gs-gray-3)] pl-4 relative">
                    <span
                      className={`absolute left-0 top-[7px] w-1.5 h-1.5 border ${
                        item.done
                          ? 'bg-[var(--gs-lime)] border-[var(--gs-lime)]'
                          : 'border-[var(--gs-gray-2)] bg-transparent'
                      }`}
                      style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                    />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="p-8 bg-[var(--gs-dark-1)]">
              <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] mb-2">
                Phase 2 &mdash; Social Layer
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide mb-4">
                Reputation + Loadouts
              </h3>
              <ul className="flex flex-col gap-2">
                {[
                  'Soulbound badge contract deployment',
                  'Milestone auto\u2011detection system',
                  'Weapon Lab certification registry',
                  'Loadout publishing system',
                  'Portfolio snapshot oracle (weekly)',
                  'Leaderboard v1 (provable rankings)',
                ].map((text, i) => (
                  <li key={i} className="text-[13px] text-[var(--gs-gray-3)] pl-4 relative">
                    <span
                      className="absolute left-0 top-[7px] w-1.5 h-1.5 border border-[var(--gs-gray-2)]"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="p-8 bg-[var(--gs-dark-1)]">
              <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] mb-2">
                Phase 3 &mdash; Marketplace
              </div>
              <h3 className="font-display font-semibold text-base uppercase tracking-wide mb-4">
                OTC + Partnership
              </h3>
              <ul className="flex flex-col gap-2">
                {[
                  'Trade intent registry',
                  'Intent matching engine',
                  'Apply for GunzChain deployment permission',
                  'Migrate contracts to GunzChain (if approved)',
                  'Season system launch',
                  'Full composability with GUNZ marketplace',
                ].map((text, i) => (
                  <li key={i} className="text-[13px] text-[var(--gs-gray-3)] pl-4 relative">
                    <span
                      className="absolute left-0 top-[7px] w-1.5 h-1.5 border border-[var(--gs-gray-2)]"
                      style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================================
            BUILD GAMES 2026 ANGLE
        ================================================================ */}
        <section className="py-14 border-b border-white/[0.06]">
          <SectionLabel>Strategic Insight</SectionLabel>
          <SectionHeading>The Build Games 2026 Angle</SectionHeading>

          <div className="px-8 py-6 bg-[var(--gs-lime)]/[0.02] border border-[var(--gs-lime)]/15 border-l-[3px] border-l-[var(--gs-lime)] flex gap-4 items-start">
            <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">&#9670;</span>
            <div>
              <div className="font-display text-sm font-semibold uppercase tracking-[1px] text-[var(--gs-lime)] mb-1.5">
                Avalanche Build Games 2026 &mdash; Competitive Advantage
              </div>
              <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed">
                By building on <strong className="text-[var(--gs-white)]">AVAX C&#8209;Chain</strong> for the write layer, GUNZscope
                becomes a multi&#8209;chain Avalanche&#8209;native project that reads from GunzChain (an Avalanche L1) and writes to
                C&#8209;Chain. This is <em>exactly</em> the kind of cross&#8209;L1 composability that Avalanche is pushing &mdash; and it&rsquo;s
                a compelling narrative for the Build Games competition. The hybrid architecture isn&rsquo;t just a workaround for
                the permissioned constraint &mdash; it&rsquo;s a{' '}
                <strong className="text-[var(--gs-white)]">feature</strong> that demonstrates
                Avalanche&rsquo;s multi&#8209;chain thesis in action.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            DOCUMENT FOOTER
        ================================================================ */}
        <div className="pt-10 flex flex-col sm:flex-row justify-between font-mono text-[10px] text-[var(--gs-gray-2)] tracking-[1px]">
          <span>GUNZscope Architecture v0.1 &mdash; February 2026</span>
          <span className="mt-2 sm:mt-0">Classified // Internal Use</span>
        </div>

      </main>
      <Footer />
    </div>
  );
}
