'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeesRevenueTabProps {
  adminSecret: string;
}

interface RevenueData {
  attestationCount: number;
  handleChangeCount: number;
  avaxCollected: number;
  attestationFee: number;
  handleChangeFee: number;
}

// ── Static data ────────────────────────────────────────────────────────

const REVENUE_MODEL = [
  { action: 'Portfolio Attestation', fee: '0.01 AVAX', trigger: 'User clicks "Attest Portfolio"', status: 'LIVE' as const },
  { action: 'Handle Change', fee: '0.005 AVAX', trigger: 'User changes existing handle', status: 'LIVE' as const },
  { action: 'Achievement SBTs', fee: 'TBD', trigger: 'Future', status: 'PLANNED' as const },
  { action: 'Tournament Entry', fee: 'TBD', trigger: 'Future', status: 'PLANNED' as const },
  { action: 'OTC Trade Listings', fee: 'TBD', trigger: 'Future', status: 'PLANNED' as const },
];

const USER_COSTS = [
  { action: 'Browse / View Portfolio', fee: 'FREE', gas: 'None', gasCost: '$0', trigger: 'Always' },
  { action: 'Connect Wallet', fee: 'FREE', gas: 'None', gasCost: '$0', trigger: 'Always' },
  { action: 'NFT Viewing & P&L', fee: 'FREE', gas: 'None', gasCost: '$0', trigger: 'Always' },
  { action: 'Portfolio Attestation', fee: '0.01 AVAX (~$0.35)', gas: '~75\u2011150K', gasCost: '<$0.01', trigger: 'User clicks "Attest"' },
  { action: 'First Handle Claim', fee: 'FREE', gas: '~50K', gasCost: '<$0.01', trigger: 'User claims gsHandle' },
  { action: 'Handle Change', fee: '0.005 AVAX', gas: '~60K', gasCost: '<$0.01', trigger: 'User changes handle' },
  { action: 'Add Wallet', fee: 'No extra fee', gas: '~40K', gasCost: '<$0.01', trigger: 'Bundled with attestation' },
  { action: 'Batch Add Wallets (5)', fee: 'No extra fee', gas: '~120\u2011150K', gasCost: '<$0.01', trigger: 'Bundled with attestation' },
];

const OPERATOR_COSTS = [
  { service: 'Hosting & Serverless', provider: 'Vercel', tier: 'Pro', cost: '$20\u2011300+' },
  { service: 'Database', provider: 'Neon PostgreSQL', tier: 'Freemium', cost: '$0\u2011100+' },
  { service: 'Email (alerts/digests)', provider: 'Resend', tier: 'Pro', cost: '$20\u2011120+' },
  { service: 'Analytics', provider: 'PostHog', tier: 'Free/Pro', cost: '$0\u2011300+' },
  { service: 'Decentralized Storage', provider: 'Autonomys Auto Drive', tier: 'Paid', cost: '$5\u201150+' },
  { service: 'Price Data', provider: 'CoinGecko', tier: 'Free', cost: '$0' },
  { service: 'NFT Listings/Sales', provider: 'OpenSea', tier: 'Free + API Key', cost: '$0' },
  { service: 'NFT Metadata', provider: 'GunzScan (Blockscout)', tier: 'Free', cost: '$0' },
  { service: 'Wallet SDK', provider: 'Dynamic Labs', tier: 'Freemium', cost: '$0\u2011200+' },
  { service: 'RPC (GunzChain)', provider: 'DigitalOcean proxy', tier: 'Free/included', cost: '$0' },
  { service: 'RPC (Solana)', provider: 'Public endpoint', tier: 'Free', cost: '$0' },
];

const CACHE_NOTES = [
  'CoinGecko: 30s price cache + infinite historical cache = ~98% fewer API calls',
  'OpenSea: 4h floor cache, 2h comparable sales cache, 1h rarity floors',
  'GunzScan: module-level name cache (NFT names are immutable), 10-concurrent batching',
];

// ── Sub-components ─────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-white/[0.02] border border-white/[0.06]">
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
        {label}
      </span>
      <span className="font-mono text-[var(--text-data)] text-[var(--gs-white)]">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: 'LIVE' | 'PLANNED' }) {
  const isLive = status === 'LIVE';
  return (
    <span
      className={`inline-block font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${
        isLive
          ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.1] border border-[var(--gs-lime)]/20'
          : 'text-[var(--gs-gray-3)] bg-white/[0.04] border border-white/[0.06]'
      }`}
    >
      {status}
    </span>
  );
}

function SectionCard({
  title,
  gradientColor,
  children,
}: {
  title: string;
  gradientColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${gradientColor}, transparent)` }} />
      <div className="p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-4 pb-2 border-b border-white/[0.06]">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Table helpers ──────────────────────────────────────────────────────

const thClass = 'px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--gs-gray-3)] bg-white/[0.02]';
const tdClass = 'px-3 py-2 font-mono text-[var(--text-caption)] text-[var(--gs-gray-4)]';
const rowEven = 'bg-[var(--gs-dark-3)]';

// ── Main component ─────────────────────────────────────────────────────

export function FeesRevenueTab({ adminSecret }: FeesRevenueTabProps) {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/revenue', {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RevenueData = await res.json();
      setRevenue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const avaxPrice = 35; // TODO: Fetch real AVAX price
  const avaxCollected = revenue?.avaxCollected ?? 0;
  const usdEstimate = avaxCollected * avaxPrice;

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto">

      {/* ── Section A: Revenue Streams ─────────────────────────── */}
      <SectionCard title="Revenue Streams" gradientColor="var(--gs-lime)">
        {/* Dynamic stats row */}
        {loading ? (
          <p className="font-mono text-[var(--text-caption)] text-[var(--gs-gray-3)] animate-pulse">Loading revenue data…</p>
        ) : error ? (
          <p className="font-mono text-[var(--text-caption)] text-[var(--gs-loss)]">{error}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <StatCell label="Total Attestations" value={String(revenue?.attestationCount ?? 0)} />
            <StatCell label="AVAX Collected" value={`${avaxCollected.toFixed(3)} AVAX`} />
            <StatCell label="USD Value (est.)" value={`~$${usdEstimate.toFixed(2)}`} />
            <StatCell label="Handle Changes" value={String(revenue?.handleChangeCount ?? 0)} />
          </div>
        )}

        {/* Revenue model table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-white/[0.06]">
            <thead>
              <tr>
                <th className={thClass}>Action</th>
                <th className={thClass}>Fee</th>
                <th className={thClass}>When Triggered</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_MODEL.map((row, i) => (
                <tr key={row.action} className={i % 2 === 0 ? rowEven : ''}>
                  <td className={tdClass}>{row.action}</td>
                  <td className={tdClass}>{row.fee}</td>
                  <td className={tdClass}>{row.trigger}</td>
                  <td className={tdClass}><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Section B: User-Facing Costs ───────────────────────── */}
      <SectionCard title="User&#8209;Facing Costs" gradientColor="var(--gs-purple)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-white/[0.06]">
            <thead>
              <tr>
                <th className={thClass}>Action</th>
                <th className={thClass}>Platform Fee</th>
                <th className={thClass}>Est. Gas</th>
                <th className={thClass}>Gas Cost (est.)</th>
                <th className={thClass}>Trigger</th>
              </tr>
            </thead>
            <tbody>
              {USER_COSTS.map((row, i) => (
                <tr key={row.action} className={i % 2 === 0 ? rowEven : ''}>
                  <td className={tdClass}>{row.action}</td>
                  <td className={`${tdClass} ${row.fee === 'FREE' ? 'text-[var(--gs-lime)]' : ''}`}>{row.fee}</td>
                  <td className={tdClass}>{row.gas}</td>
                  <td className={tdClass}>{row.gasCost}</td>
                  <td className={tdClass}>{row.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-3 leading-relaxed">
          Gas estimates at ~25 nanoAVAX on Avalanche C&#8209;Chain. Platform fee is the main user cost.
          Browsing, wallet connection, NFT viewing, P&L tracking are completely free.
        </p>
      </SectionCard>

      {/* ── Section C: Operator Costs ──────────────────────────── */}
      <SectionCard title="Operator Costs (Monthly)" gradientColor="var(--gs-warning)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-white/[0.06]">
            <thead>
              <tr>
                <th className={thClass}>Service</th>
                <th className={thClass}>Provider</th>
                <th className={thClass}>Current Tier</th>
                <th className={thClass}>Est. Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {OPERATOR_COSTS.map((row, i) => (
                <tr key={row.service} className={i % 2 === 0 ? rowEven : ''}>
                  <td className={tdClass}>{row.service}</td>
                  <td className={tdClass}>{row.provider}</td>
                  <td className={tdClass}>{row.tier}</td>
                  <td className={`${tdClass} ${row.cost === '$0' ? 'text-[var(--gs-lime)]' : ''}`}>{row.cost}</td>
                </tr>
              ))}
              {/* Summary row */}
              <tr className="bg-white/[0.04] border-t border-white/[0.06]">
                <td colSpan={3} className={`${tdClass} text-[var(--gs-gray-3)] uppercase tracking-wider text-[9px]`}>
                  Estimated Total
                </td>
                <td className={`${tdClass} text-[var(--gs-warning)]`}>
                  ~$65&#8209;770/mo
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost-saving notes */}
        <div className="mt-3 flex flex-col gap-1">
          {CACHE_NOTES.map((note) => (
            <p key={note} className="font-mono text-[9px] text-[var(--gs-gray-3)] leading-relaxed">
              &bull; {note}
            </p>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
