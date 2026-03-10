'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import BuildVelocityChart from '@/components/charts/BuildVelocityChart';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CLIP_SM = 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))';

interface Problem {
  main: string;
  sub?: string[];
}

interface Forces {
  push: string;
  pull: string;
  anxiety: string;
  habit: string;
}

interface Hires {
  big: string;
  little: string;
}

interface Phase {
  id: string;
  label: string;
  title: string;
  active: boolean;
  items: string[];
  jtbd?: string;
  dimensions?: { functional: string; emotional: string; social: string };
  forces?: Forces;
  hires?: Hires;
  competition?: string[];
  problems?: Problem[];
  validation?: { confirmed?: string[]; research?: string[] };
  outcomes?: string[];
  unlocks?: string;
  gtm?: { built?: string[]; inflight?: string[]; planned: string[] };
}

const PHASES: Phase[] = [
  {
    id: 'now',
    label: 'Phase 1 \u2014 MVP',
    title: 'Portfolio Intelligence & Proof',
    active: true,
    jtbd: 'See what all my items are worth in one place.',
    dimensions: {
      functional: 'Aggregate holdings across platforms and acquisition methods, establish cost basis per item, and show current value with cross\u2011market comparable sales data',
      emotional: 'Feel clarity and control over a portfolio that was previously invisible \u2014 replace guesswork with real numbers',
      social: 'Know what your items are worth so you don\u2019t have to ask in Discord \u2014 and have a real way to share pricing when others ask',
    },
    forces: {
      push: 'No tool exists for OTG players to combine console and PC accounts into a single view and understand what their items are worth \u2014 solving for cross\u2011platform interoperability and clarity',
      pull: 'One dashboard that aggregates every item regardless of how it was acquired, establishes acquisition price in the base currency, and shows current value with market\u2011wide comparable sales',
      anxiety: 'Most players have never connected a wallet before \u2014 the primary barrier is safety and trust, not feature gaps',
      habit: 'Players settle for rough estimates and Discord price checks because fragmentation makes this feel normal \u2014 passive unconscious adoption of a broken process where answers require multiple hops and are outdated by the time they arrive',
    },
    hires: {
      big: 'Connect wallet and see portfolio value for the first time \u2014 the "aha" moment when scattered items across platforms become a single, real number',
      little: 'Players constantly earn new items \u2014 portfolio value is a perpetually moving target that is never fully understood. The problem re\u2011creates itself every session, making the tool a recurring need, not a one\u2011time check',
    },
    competition: [
      'Manually checking each marketplace|for each item (Xbox, PlayStation, Epic, Steam markets are all decoupled)',
      'Asking Discord community|for price estimates (social workaround)',
      'Spreadsheets|tracking purchases and estimated values across platforms',
      'Generic NFT portfolio trackers|that don\u2019t support GunzChain or understand gaming item acquisition',
    ],
    items: [
      'Multi\u2011chain portfolio tracker',
      'Real\u2011time pricing + valuation waterfall',
      'Cost basis + P&L analytics',
      'Cross\u2011market comparable sales + price delta',
      'Portfolio attestations (AVAX C\u2011Chain)',
      'Permanent historical proof on Autonomys mainnet',
    ],
    problems: [
      {
        main: 'No tool exists that lets a player connect their wallet and see what their items are worth',
        sub: [
          'True across all of gaming, not just OTG \u2014 this is a category\u2011level gap',
          'Items acquired through in\u2011game purchase, events, HEX loot boxes, and marketplace buys are all invisible until manually checked',
        ],
      },
      {
        main: 'Players operate across multiple accounts on decoupled platforms (Xbox, PlayStation, Epic, Steam) with wildly different pricing',
        sub: [
          'No tool consolidates data across these markets or shows price deltas for the same item',
          'A single player\u2019s portfolio is fragmented across platforms with no unified view',
        ],
      },
      {
        main: 'Zero cost basis or P&L tracking \u2014 no tool establishes acquisition price and tracks value in the base currency',
        sub: [
          'No record of what you paid for an item regardless of acquisition method',
          'GUN token price fluctuations make USD\u2011denominated P&L even harder to reason about',
        ],
      },
      {
        main: 'No comparable sales data across markets \u2014 listings have no context for whether a price is fair',
      },
    ],
    validation: {
      confirmed: [
        'OTG Discord community member publicly requested an inventory value tool on mainnet',
        'Gunzilla team member responded by tagging the builder (cryptohaki) to make it happen',
        'No competing tool existed at the time of request \u2014 confirmed by community and team',
      ],
      research: [
        'Problem is universal across gaming \u2014 OTG is the entry point, not the ceiling',
        'Validating demand for on\u2011chain permissionless tournaments as a downstream use case',
      ],
    },
    outcomes: [
      'Minimize the time to determine total portfolio value across all holdings',
      'Minimize the uncertainty in what was paid for any given item',
      'Increase the number of items with cross\u2011market comparable pricing',
      'Minimize the effort to understand P&L in both GUN and USD',
      'Establish a baseline attestation that can expand into full player identity and legacy',
    ],
    unlocks: 'Portfolio intelligence solves the immediate user need, and on\u2011chain attestations establish proof of holdings \u2014 together they form the foundation for expanded player legacy, identity, and verifiable reputation across the ecosystem.',
    gtm: {
      built: [
        'Whitelist\u2011gated early access with exclusivity\u2011driven word\u2011of\u2011mouth',
        'Referral system: each invite earns priority access, driving organic growth',
        'SEO: ranking for "Off The Grid portfolio tracker" and "GUN token P&L"',
      ],
      inflight: [
        'Target OTG Discord power users and top holders as initial seed cohort',
      ],
      planned: [
        'Content strategy: wallet P&L reveal threads on X to drive curiosity',
        'Partnership with OTG content creators for launch coverage',
      ],
    },
  },
  {
    id: 'q2',
    label: 'Phase 2 \u2014 Q2 2026',
    title: 'On\u2011Chain Identity & Tournaments',
    active: false,
    jtbd: 'Build my legacy and compete with it.',
    dimensions: {
      functional: 'Expand portfolio attestations into a full player identity \u2014 gate tournament entry with on\u2011chain verification and permanently attest results',
      emotional: 'Feel like your gaming history is yours and it matters \u2014 not locked in a platform\u2019s database or lost when a Discord server dies',
      social: 'Be known for what you\u2019ve actually done, not what you claim \u2014 verified results speak louder than screenshots',
    },
    forces: {
      push: 'No way to prove gaming achievements across platforms \u2014 tournaments rely on trust\u2011based systems and player reputation is non\u2011portable',
      pull: 'On\u2011chain identity that compounds with every match, tournament, and achievement \u2014 portable and verifiable everywhere',
      anxiety: 'Will enough players adopt on\u2011chain identity for it to matter? Will tournament organizers actually require it?',
      habit: 'Players accept that tournament results live in Discord announcements and screenshots \u2014 no expectation of permanence',
    },
    hires: {
      big: 'Enter first identity\u2011gated tournament \u2014 the moment on\u2011chain proof becomes a competitive advantage, not just a portfolio feature',
      little: 'Every tournament result and achievement adds to the legacy \u2014 the identity becomes more valuable the more you play',
    },
    competition: [
      'Discord or Google Survey\u2011based tournament organizing|(manual brackets, no verification)',
      'Self\u2011reported achievements|and screenshot\u2011based proof of results',
      'In\u2011game ranked mode|(not a true ranking of who is the best)',
      'Generic tournament platforms|(Battlefy, Challengermode \u2014 no on\u2011chain identity layer)',
    ],
    items: [
      'On\u2011chain player identity + verification',
      'Permissionless tournament system',
      'On\u2011chain attestation of tournament results',
      'Player legacy expansion (history, achievements)',
      'Identity\u2011gated entry (no proof, no compete)',
    ],
    problems: [
      { main: 'No transparency in matchmaking \u2014 ranked mode balance is a universal complaint' },
      { main: 'No verifiable skill baseline \u2014 no way to prove what level you actually play at' },
      { main: 'Smurfs and alt accounts thrive because there is no identity verification' },
      { main: 'Tournaments are not permissionless \u2014 entry is gatekept by organizers, not earned through proof' },
    ],
    validation: {
      confirmed: [
        'Active community interest in competitive tournaments with real prizes',
        'Ranked mode frustration is the most consistent complaint across OTG Discord',
        'FAT.Toe and other community members actively evangelizing GUNZscope to players',
      ],
      research: [
        'Validating willingness to adopt on\u2011chain identity as a tournament prerequisite',
        'Testing prize pool structures that drive both participation and retention',
      ],
    },
    outcomes: [
      'Establish greater utility for on\u2011chain identity by making it required for tournament entry',
      'Expand attestation granularity beyond portfolio snapshots into match results, achievements, and player history',
      'Create a verifiable reputation layer that compounds over time \u2014 the more you play, the richer your identity',
    ],
    unlocks: 'Verified player identity and tournament infrastructure create the trust layer for Phase 3 \u2014 where identity\u2011backed reputation enables market participation, trade credibility, and ecosystem\u2011wide interoperability.',
    gtm: {
      planned: [
        'Tournaments with prizes and awards as acquisition + retention engine',
        'GI Advertising Network partnership \u2014 in\u2011game ad placements driving tournament awareness',
        'Tournament results as shareable content \u2014 verified on\u2011chain results drive organic reach',
      ],
    },
  },
  {
    id: 'q3',
    label: 'Phase 3 \u2014 Q3 2026',
    title: 'Trusted Market Interface',
    active: false,
    items: [
      'Peer\u2011to\u2011peer offers powered by verified identity',
      'On\u2011chain escrow \u2014 trustless trades, no middleman',
      'Trade intent registry + matching ("who wants this item?")',
      'Comparable sales intelligence + fair pricing',
      'Price prediction models from enrichment data',
      'Trust + intelligence layer on top of existing marketplaces',
      'Revenue: marketplace fees + escrow transaction fees',
    ],
  },
  {
    id: 'q4',
    label: 'Phase 4 \u2014 Q4 2026',
    title: 'Ecosystem Expansion',
    active: false,
    items: [
      'Cross\u2011game portfolio support (beyond OTG)',
      'Tournament system expansion to other games',
      'Guild management + treasury tracking',
      'Mobile\u2011optimized progressive web app',
      'GunzChain native deployment (partnership)',
      'Cross\u2011game identity portability \u2014 one identity, every game',
    ],
  },
  {
    id: '2027',
    label: 'Phase 5 \u2014 2027',
    title: 'Infrastructure Layer',
    active: false,
    items: [
      'White\u2011label SDK for game studios',
      'Decentralized oracle network for game data',
      'API access for third\u2011party integrations',
      'Multi\u2011game analytics (any EVM gaming chain)',
      'On\u2011chain credit scoring for gaming assets',
      'DeFi composability (collateralized lending against gaming assets)',
      'Revenue: SDK licensing + API tiers + oracle data fees',
    ],
  },
  {
    id: 'endgame',
    label: 'Endgame',
    title: 'The Player Layer',
    active: false,
    items: [
      'Permissionless identity infrastructure, fully abstracted',
      'Cross\u2011game interoperable player identity + reputation',
      'Portable utility layer \u2014 achievements, tournaments, legacy across every game',
      'Web2 and Web3 agnostic \u2014 chain, platform, none of it matters to the player',
      'Open protocol for studios to plug into',
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DocBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.05] font-mono text-[10px] tracking-[2px] uppercase text-[var(--gs-lime)] mb-6"
      style={{ clipPath: CLIP_SM }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
      Strategic Roadmap &mdash; 2026
    </div>
  );
}

type PhaseTab = 'research' | 'strategy' | 'outcomes';

function PhaseNode({ phase, index, expanded, onToggle }: { phase: Phase; index: number; expanded: boolean; onToggle: () => void }) {
  const [activeTab, setActiveTab] = useState<PhaseTab>('research');
  const hasContent = !!(phase.jtbd || phase.problems || phase.outcomes);

  return (
    <div className="relative grid grid-cols-[40px_1fr] md:grid-cols-[60px_1fr] gap-4 md:gap-6">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 shrink-0 border-2 ${
            phase.active
              ? 'bg-[var(--gs-lime)] border-[var(--gs-lime)] shadow-[0_0_12px_var(--gs-lime)]'
              : 'bg-transparent border-[var(--gs-gray-2)]'
          }`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
        />
        {index < PHASES.length - 1 && (
          <div
            className={`w-px flex-1 mt-2 ${
              phase.active
                ? 'bg-gradient-to-b from-[var(--gs-lime)]/40 to-[var(--gs-gray-1)]'
                : 'bg-[var(--gs-gray-1)]'
            }`}
          />
        )}
      </div>

      <div className={`pb-10 md:pb-14 ${index === PHASES.length - 1 ? 'pb-0 md:pb-0' : ''}`}>
        <div
          className={`font-mono text-[9px] tracking-[2px] uppercase mb-1.5 ${
            phase.active ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-2)]'
          }`}
        >
          {phase.label}
        </div>
        <h3
          className={`font-display font-bold text-lg md:text-xl uppercase tracking-wide mb-4 ${
            phase.active ? 'text-[var(--gs-white)]' : 'text-[var(--gs-gray-4)]'
          }`}
        >
          {phase.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {phase.items.map((item, i) => (
            <span
              key={i}
              className={`inline-block font-mono text-[10px] md:text-[11px] px-2.5 py-1 border ${
                phase.active
                  ? 'border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] text-[var(--gs-gray-4)]'
                  : 'border-white/[0.06] bg-white/[0.02] text-[var(--gs-gray-3)]'
              }`}
              style={{ clipPath: CLIP_SM }}
            >
              {item}
            </span>
          ))}
        </div>

        {/* Tab buttons — only show when phase has JTBD content */}
        {hasContent && (
          <>
            <div className="flex gap-1 mt-4">
              {([
                ['research', 'Research'],
                ['strategy', 'Strategy'],
                ['outcomes', 'Outcomes'],
              ] as const).map(([key, tabLabel]) => {
                const isActive = expanded && activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isActive) {
                        onToggle();
                      } else {
                        setActiveTab(key as PhaseTab);
                        if (!expanded) onToggle();
                      }
                    }}
                    className={`px-3 py-1.5 font-mono text-[10px] tracking-[1.5px] uppercase transition-all ${
                      isActive
                        ? 'bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30'
                        : phase.active
                          ? 'border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:border-[var(--gs-lime)]/30'
                          : 'bg-white/[0.02] text-[var(--gs-gray-2)] border border-white/[0.06] hover:text-[var(--gs-gray-4)] hover:border-white/[0.12]'
                    }`}
                    style={{ clipPath: CLIP_SM }}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Expandable panel */}
            <div
              className={`grid transition-all duration-300 ease-out ${
                expanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}
            >
              <div className="overflow-hidden space-y-3">

                {/* Tab: Research */}
                {activeTab === 'research' && phase.dimensions && phase.forces && phase.hires && phase.competition && (
                  <div className="space-y-3">
                    {/* Job Statement + Three Dimensions */}
                    <div className="p-4 border border-white/[0.08] bg-white/[0.02]" style={{ clipPath: CLIP_SM }}>
                      <div className="font-mono text-[8px] tracking-[2px] uppercase text-[var(--gs-gray-2)] mb-2">Main Job</div>
                      <div className="mb-3 pl-3 border-l-2 border-[var(--gs-lime)]/40">
                        <p className="text-[12px] leading-relaxed text-[var(--gs-gray-4)] italic">
                          &ldquo;{phase.jtbd}&rdquo;
                        </p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-2">
                        {([
                          ['Functional', phase.dimensions.functional, 'var(--gs-lime)'],
                          ['Emotional', phase.dimensions.emotional, 'var(--gs-purple)'],
                          ['Social', phase.dimensions.social, '#4A7AFF'],
                        ] as const).map(([dimLabel, text, color]) => (
                          <div key={dimLabel} className="p-2.5 bg-black/20 border border-white/[0.04]">
                            <div className="font-mono text-[8px] tracking-[1.5px] uppercase mb-1" style={{ color }}>{dimLabel}</div>
                            <p className="text-[10px] leading-relaxed text-[var(--gs-gray-3)]">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Forces of Progress */}
                    <div className="grid md:grid-cols-4 gap-2">
                      {([
                        ['Push', phase.forces.push, 'var(--gs-loss)', '\u2191'],
                        ['Pull', phase.forces.pull, 'var(--gs-lime)', '\u2193'],
                        ['Anxiety', phase.forces.anxiety, 'var(--gs-warning)', '\u26A0'],
                        ['Habit', phase.forces.habit, 'var(--gs-gray-3)', '\u21BB'],
                      ] as const).map(([forceLabel, text, color, icon]) => (
                        <div key={forceLabel} className="p-3 border border-white/[0.06] bg-white/[0.02]" style={{ clipPath: CLIP_SM }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px]" style={{ color }}>{icon}</span>
                            <span className="font-mono text-[8px] tracking-[1.5px] uppercase" style={{ color }}>{forceLabel}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-[var(--gs-gray-3)]">{text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Why They Try / Why They Stay + Competition */}
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="p-3 border border-[var(--gs-lime)]/15 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                        <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-lime)] mb-1.5">Why They Try</div>
                        <p className="text-[10px] leading-relaxed text-[var(--gs-gray-4)]">{phase.hires.big}</p>
                      </div>
                      <div className="p-3 border border-[var(--gs-purple)]/15 bg-[var(--gs-purple)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                        <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-purple)] mb-1.5">Why They Stay</div>
                        <p className="text-[10px] leading-relaxed text-[var(--gs-gray-4)]">{phase.hires.little}</p>
                      </div>
                      <div className="p-3 border border-white/[0.08] bg-white/[0.02]" style={{ clipPath: CLIP_SM }}>
                        <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] mb-1.5">Non&#8209;Obvious Competition</div>
                        <ul className="space-y-1">
                          {phase.competition.map((c, i) => {
                            const parts = c.split('|');
                            return (
                              <li key={i} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--gs-gray-3)]">
                                <span className="shrink-0 mt-0.5 opacity-40">&rsaquo;</span>
                                <span><span className="text-[var(--gs-gray-4)] font-semibold">{parts[0]}</span>{parts[1] ? ` ${parts[1]}` : ''}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Strategy */}
                {activeTab === 'strategy' && phase.problems && phase.gtm && (
                  <div className="space-y-3">
                    <div className={`grid gap-3 ${phase.validation ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      {/* Pain Points */}
                      <div className="p-4 border border-[var(--gs-loss)]/15 bg-[var(--gs-loss)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-loss)]" />
                          <span className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-loss)]">Pain Points</span>
                        </div>
                        <ul className="space-y-2.5">
                          {phase.problems.map((p, i) => (
                            <li key={i}>
                              <div className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                                <span className="text-[var(--gs-loss)]/60 shrink-0 mt-0.5">&mdash;</span>
                                {p.main}
                              </div>
                              {p.sub && (
                                <ul className="mt-1.5 ml-5 space-y-1">
                                  {p.sub.map((s, j) => (
                                    <li key={j} className="flex gap-1.5 text-[10px] leading-relaxed text-[var(--gs-gray-3)]">
                                      <span className="shrink-0 mt-0.5 opacity-40">&rsaquo;</span>
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Validation */}
                      {phase.validation && (
                        <div className="p-4 border border-[var(--gs-lime)]/15 bg-[var(--gs-lime)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]" />
                            <span className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-lime)]">Validation</span>
                          </div>
                          {phase.validation.confirmed && (
                            <>
                              <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-lime)]/70 mb-1.5">Validated</div>
                              <ul className="space-y-1.5 mb-3">
                                {phase.validation.confirmed.map((v, i) => (
                                  <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                                    <span className="text-[var(--gs-lime)]/60 shrink-0 mt-0.5">&#10003;</span>
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {phase.validation.research && (
                            <>
                              <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-warning)]/70 mb-1.5">Ongoing Research</div>
                              <ul className="space-y-1.5">
                                {phase.validation.research.map((v, i) => (
                                  <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                                    <span className="text-[var(--gs-warning)]/60 shrink-0 mt-0.5">&#9656;</span>
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}

                      {/* GTM */}
                      <div className="p-4 border border-[var(--gs-purple)]/15 bg-[var(--gs-purple)]/[0.03]" style={{ clipPath: CLIP_SM }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-purple)]" />
                          <span className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-purple)]">Go&#8209;To&#8209;Market</span>
                        </div>
                        {phase.gtm.built && (
                          <>
                            <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-lime)]/70 mb-1.5">Built</div>
                            <ul className="space-y-1.5 mb-3">
                              {phase.gtm.built.map((g, i) => (
                                <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                                  <span className="text-[var(--gs-lime)]/60 shrink-0 mt-0.5">&#10003;</span>
                                  {g}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {phase.gtm.inflight && (
                          <>
                            <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-warning)]/70 mb-1.5">In&#8209;Flight</div>
                            <ul className="space-y-1.5 mb-3">
                              {phase.gtm.inflight.map((g, i) => (
                                <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                                  <span className="text-[var(--gs-warning)]/60 shrink-0 mt-0.5">&#9656;</span>
                                  {g}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {(phase.gtm.built || phase.gtm.inflight) && (
                          <div className="font-mono text-[8px] tracking-[1.5px] uppercase text-[var(--gs-purple)]/70 mb-1.5">Planned</div>
                        )}
                        <ul className="space-y-1.5">
                          {phase.gtm.planned.map((g, i) => (
                            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-[var(--gs-gray-4)]">
                              <span className="text-[var(--gs-purple)]/60 shrink-0 mt-0.5">&mdash;</span>
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Outcomes */}
                {activeTab === 'outcomes' && (
                  <div className="space-y-3">
                    {/* Desired Outcomes */}
                    {phase.outcomes && (
                      <div className="p-4 border border-white/[0.08] bg-white/[0.02]" style={{ clipPath: CLIP_SM }}>
                        <div className="font-mono text-[8px] tracking-[2px] uppercase text-[var(--gs-gray-2)] mb-2.5">Desired Outcomes</div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {phase.outcomes.map((o, i) => (
                            <div key={i} className="flex gap-2 items-start p-2 bg-black/20 border border-white/[0.04]">
                              <span className="font-mono text-[9px] text-[var(--gs-lime)]/60 shrink-0 mt-px">{String(i + 1).padStart(2, '0')}</span>
                              <p className="text-[10px] leading-relaxed text-[var(--gs-gray-4)]">{o}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* This Phase Unlocks */}
                    {phase.unlocks && (
                      <div className="p-4 border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.02] border-l-[3px] border-l-[var(--gs-lime)]/40">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[8px] tracking-[2px] uppercase text-[var(--gs-lime)]">This Phase Unlocks</span>
                          <span className="text-[var(--gs-lime)]/40 text-[10px]">&rarr;</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[var(--gs-gray-4)]">{phase.unlocks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScopeBar() {
  const scopes = [
    { label: 'OTG', width: '16.66%', active: true },
    { label: 'GUNZ Ecosystem', width: '33.33%', active: false },
    { label: 'Cross\u2011Chain Gaming', width: '33.33%', active: false },
    { label: 'All Gaming', width: '16.66%', active: false },
  ];

  return (
    <div className="mt-14 md:mt-20">
      <div className="font-mono text-[9px] tracking-[2px] uppercase text-[var(--gs-gray-2)] mb-3">
        Market Scope Expansion
      </div>
      <div className="flex h-8 border border-white/[0.06] overflow-hidden">
        {scopes.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-center font-mono text-[9px] md:text-[10px] tracking-wider uppercase border-r border-white/[0.06] last:border-r-0 ${
              s.active
                ? 'bg-[var(--gs-lime)]/[0.08] text-[var(--gs-lime)] border-t-2 border-t-[var(--gs-lime)]'
                : 'bg-white/[0.02] text-[var(--gs-gray-3)]'
            }`}
            style={{ width: s.width }}
          >
            <span className="truncate px-1">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page — public version (no admin gate)
// ---------------------------------------------------------------------------

export default function BuildGamesRoadmap() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)]">
      <div className="page-bg" />

      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto px-5 md:px-10 h-14 flex items-center justify-between">
          <Link href="/build-games" className="flex items-center gap-3">
            <div className="relative w-[10rem] sm:w-[15rem] overflow-hidden">
              <Logo size="md" variant="full" glitchOnHover />
            </div>
          </Link>
          <Link
            href="/build-games"
            className="font-mono text-[11px] tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            &larr; Overview
          </Link>
        </div>
      </nav>
      <div className="h-14" />

      <main className="flex-1 max-w-[900px] mx-auto px-5 md:px-10 py-16 w-full relative z-[1]">

        {/* Header */}
        <header className="pb-14 border-b border-white/[0.06]">
          <DocBadge />
          <h1 className="font-display font-bold text-[clamp(36px,5vw,56px)] uppercase tracking-tight leading-none mb-4">
            <span className="text-[var(--gs-lime)]">GUNZscope</span><br />
            Strategic Roadmap
          </h1>
          <p className="text-lg font-light text-[var(--gs-gray-4)] max-w-[700px]">
            From portfolio tracker to the{' '}
            <strong className="text-[var(--gs-white)] font-medium">Bloomberg of gaming blockchains</strong>.
            Six phases from single&#8209;game intelligence to cross&#8209;chain gaming terminal.
          </p>
        </header>

        {/* Build velocity */}
        <section className="py-10">
          <BuildVelocityChart />
        </section>

        {/* Vision banner */}
        <div className="my-10 px-8 py-6 bg-[var(--gs-purple)]/[0.04] border border-[var(--gs-purple)]/15 border-l-[3px] border-l-[var(--gs-purple)] flex gap-4 items-start">
          <span className="text-xl shrink-0 mt-0.5 text-[var(--gs-purple)]" aria-hidden="true">&#9670;</span>
          <div>
            <div className="font-display text-sm font-semibold uppercase tracking-[1px] text-[var(--gs-purple)] mb-1.5">
              Build Games 2026 &mdash; Strategic Vision
            </div>
            <p className="text-sm text-[var(--gs-gray-4)] leading-relaxed">
              GUNZscope establishes a portfolio intelligence and proof&#8209;of&#8209;holdings layer for gaming &mdash;
              demonstrating <strong className="text-[var(--gs-white)]">Avalanche&rsquo;s multi&#8209;chain thesis</strong> in
              action. The real architecture is the compounding flywheel. Portfolio intelligence feeds on&#8209;chain identity,
              identity enables trusted markets, markets generate data that compounds back into identity. Each phase is
              sequenced and crafted so that what we build becomes the foundation for what comes next, and every cycle
              makes the system harder to replicate.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <section className="py-14">
          {PHASES.map((phase, i) => (
            <PhaseNode
              key={phase.id}
              phase={phase}
              index={i}
              expanded={expandedPhase === phase.id}
              onToggle={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
            />
          ))}
          <ScopeBar />
        </section>

        {/* Document footer */}
        <div className="pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between font-mono text-[10px] text-[var(--gs-gray-2)] tracking-[1px]">
          <span>GUNZscope &middot; Build Games 2026 &middot; Strategic Roadmap</span>
          <span className="mt-2 sm:mt-0">gunzscope.xyz</span>
        </div>

      </main>
      <Footer variant="minimal" />
    </div>
  );
}
