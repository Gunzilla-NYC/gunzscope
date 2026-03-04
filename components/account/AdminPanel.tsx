'use client';

import { useState } from 'react';
import Link from 'next/link';
import ItemOriginsTools from '@/components/account/ItemOriginsTools';
import { UXTestingTools } from './admin/UXTestingTools';
import { HandleTools } from './admin/HandleTools';
import { ShareLeaderboard } from './admin/ShareLeaderboard';
import { WhitelistTools } from './admin/WhitelistTools';
import { WaitlistTools } from './admin/WaitlistTools';
import { OnChainTools } from './admin/OnChainTools';
import { BannedList } from './admin/BannedList';

interface AdminPanelProps {
  adminSecret: string;
}

function ColumnLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3 pb-2 border-b border-white/[0.06]">
      {label}
    </p>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
      {label}
    </p>
  );
}

type AdminTab = 'manage' | 'tools' | 'links' | 'items';

const ADMIN_LINKS: { href: string; label: string; description: string; color: string }[] = [
  { href: '/brand', label: 'Brand Guidelines', description: 'Colors, typography, components, design system', color: 'var(--gs-purple)' },
  { href: '/strategy', label: 'Strategic Roadmap', description: '6-phase product roadmap \u2014 Build Games 2026', color: 'var(--gs-lime)' },
  { href: '/roadmap', label: 'Architecture Doc', description: 'On-chain strategy, deployment plan, system design', color: 'var(--gs-warning)' },
  { href: '/changelog', label: 'Changelog', description: 'Technical release notes (public)', color: 'var(--gs-gray-4)' },
  { href: '/updates', label: 'Updates', description: 'User-facing release notes (public)', color: 'var(--gs-gray-4)' },
];

export default function AdminPanel({ adminSecret }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('manage');

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'manage', label: 'Whitelist / Waitlist / Leaderboard' },
    { key: 'tools', label: 'Tools' },
    { key: 'links', label: 'Links' },
    { key: 'items', label: 'Item Database' },
  ];

  return (
    <section className="bg-[var(--gs-dark-2)] border border-[var(--gs-loss)]/20 overflow-hidden flex flex-col h-full">
      <div className="h-[2px] bg-gradient-to-r from-[var(--gs-loss)] via-[var(--gs-warning)] to-transparent shrink-0" />

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 sm:flex-none px-5 py-3 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === key
                ? 'text-[var(--gs-loss)] bg-[var(--gs-loss)]/[0.06] border-b-2 border-[var(--gs-loss)]'
                : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-gray-4)] hover:bg-white/[0.02]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Manage tab — 3-column layout */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] flex-1 min-h-0">
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Whitelist" />
            <WhitelistTools adminSecret={adminSecret} />
          </div>
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Waitlist" />
            <WaitlistTools adminSecret={adminSecret} />
            <div className="shrink-0 mt-4 pt-3 border-t border-[var(--gs-loss)]/20">
              <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-loss)] mb-2">
                Banned
              </p>
              <BannedList adminSecret={adminSecret} />
            </div>
          </div>
          <div className="p-5 flex flex-col min-h-0">
            <ColumnLabel label="Share Leaderboard" />
            <ShareLeaderboard adminSecret={adminSecret} />
          </div>
        </div>
      )}

      {/* Tools tab — UX Testing + Handle Tools + On-Chain */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] flex-1 min-h-0">
          <div className="p-5">
            <SectionLabel label="UX Testing" />
            <p className="font-mono text-caption text-[var(--gs-gray-2)] mb-4">
              Simulate different user states. Reloads the page after clearing.
            </p>
            <UXTestingTools />
          </div>
          <div className="p-5">
            <SectionLabel label="Handle Tools" />
            <HandleTools adminSecret={adminSecret} />
          </div>
          <div className="p-5">
            <SectionLabel label="On&#8209;Chain" />
            <OnChainTools />
          </div>
        </div>
      )}

      {/* Items tab — item origin database CRUD */}
      {activeTab === 'items' && (
        <ItemOriginsTools adminSecret={adminSecret} />
      )}

      {/* Links tab — admin-only page links */}
      {activeTab === 'links' && (
        <div className="p-5 flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ADMIN_LINKS.map(({ href, label, description, color }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-1 p-4 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-data uppercase tracking-wider text-[var(--gs-white)] group-hover:text-[var(--gs-lime)] transition-colors">
                    {label}
                  </span>
                </div>
                <p className="font-mono text-caption text-[var(--gs-gray-3)] leading-relaxed">
                  {description}
                </p>
                <span className="font-mono text-[9px] text-[var(--gs-gray-2)] mt-1">{href}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
