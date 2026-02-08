'use client';

import Link from 'next/link';

interface FooterProps {
  variant?: 'full' | 'minimal';
}

const FOOTER_COLUMNS = [
  {
    title: 'Social',
    links: [
      { label: 'X', href: 'https://x.com/gunzscope', external: true },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API', href: '#', disabled: true, badge: 'Soon' },
    ],
  },
{
    title: 'Legal',
    links: [
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
] as const;

export default function Footer({ variant = 'full' }: FooterProps) {
  if (variant === 'minimal') {
    return (
      <footer className="relative z-10 py-8 px-6 text-center border-t border-white/[0.06]">
        <p className="font-mono text-caption tracking-wide text-[var(--gs-gray-4)]">
          Built with <span className="text-[var(--gs-lime)]">&hearts;</span> by CRYPTOHAKI for the Gunzilla community. Not affiliated with Gunzilla Games.
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative z-10">
      {/* Top: Column Navigation */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-caption tracking-[1.5px] uppercase text-[var(--gs-gray-4)] mb-5 border-b border-white/[0.06] pb-3">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {'disabled' in link && link.disabled ? (
                      <span className="flex items-center gap-2">
                        <span className="font-body text-sm text-[var(--gs-gray-2)]">{link.label}</span>
                        {'badge' in link && link.badge && (
                          <span className="font-mono text-micro tracking-wider uppercase px-1.5 py-0.5 border border-[var(--gs-purple)]/30 text-[var(--gs-purple)] bg-[var(--gs-purple)]/5">
                            {link.badge}
                          </span>
                        )}
                      </span>
                    ) : 'external' in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="font-body text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Credit + Copyright */}
      <div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex items-center justify-between gap-6">
          {/* Credit */}
          <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)]">
            Built with <span className="text-[var(--gs-lime)]">&hearts;</span> by CRYPTOHAKI for the Gunzilla community. Not affiliated with Gunzilla Games.
          </p>

          {/* Copyright */}
          <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] flex-shrink-0">
            &copy; {new Date().getFullYear()} GUNZscope
          </p>
        </div>
      </div>
    </footer>
  );
}
