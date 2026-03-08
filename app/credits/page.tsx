import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Credits',
  description: 'The people and projects that make GUNZscope possible.',
};
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import prisma from '@/lib/db';

interface Contributor {
  name: string;
  role: string;
  xHandle?: string;
  link?: string; // Non-X link (Twitch, etc.)
}

const contributors: Contributor[] = [
  { name: 'Digital Panoply', role: 'UI/UX Feedback & Security Testing', xHandle: 'DigitalPanoply' },
  { name: 'FAT.Toe', role: 'Feedback & Testing', xHandle: 'TropicalMystery' },
  { name: 'hajiiiii', role: 'Feedback & Testing', xHandle: 'Haji_NFT' },
  { name: 'meatport', role: 'Feedback & Testing', xHandle: 'meatportgg' },
  { name: '(DOGZ)Parzival9918', role: 'Feedback & Testing', link: 'https://www.twitch.tv/parzival9918' },
];

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

interface IdeaContributor {
  name: string;
  ideasShipped: number;
  upvotes: number;
  downvotes: number;
  netScore: number;
}

/** Fetch distinct authors whose feature requests were completed with vote stats. */
async function getIdeaContributors(): Promise<IdeaContributor[]> {
  const completed = await prisma.featureRequest.findMany({
    where: { status: 'completed', showAttribution: true },
    select: {
      author: {
        select: {
          displayName: true,
          wallets: {
            where: { isPrimary: true },
            select: { address: true },
            take: 1,
          },
        },
      },
      votes: {
        select: { value: true },
      },
    },
  });

  // Aggregate per author
  const stats = new Map<string, IdeaContributor>();
  for (const r of completed) {
    const name = r.author.displayName
      || (r.author.wallets[0]?.address ? truncateAddress(r.author.wallets[0].address) : 'Anonymous');

    const existing = stats.get(name) || { name, ideasShipped: 0, upvotes: 0, downvotes: 0, netScore: 0 };
    existing.ideasShipped += 1;

    for (const v of r.votes) {
      if (v.value > 0) existing.upvotes += v.value;
      else existing.downvotes += Math.abs(v.value);
    }
    existing.netScore = existing.upvotes - existing.downvotes;

    stats.set(name, existing);
  }

  return Array.from(stats.values())
    .sort((a, b) => b.netScore - a.netScore || b.ideasShipped - a.ideasShipped || a.name.localeCompare(b.name));
}

export const dynamic = 'force-dynamic';
// TODO: Optimization item 18 skipped — DB not available at build time for ISR prerender

export default async function CreditsPage() {
  const ideaContributors = await getIdeaContributors();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)] overflow-x-hidden">
      <div className="grid-bg" />
      <div className="scanlines" />

      <Navbar />

      {/* Content */}
      <main className="flex-1 pt-16 pb-24 px-6 lg:px-10 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-12">
          <p className="font-mono text-caption uppercase tracking-widest text-[var(--gs-purple)] mb-3">
            Community
          </p>
          <h1 className="font-display text-4xl font-bold text-[var(--gs-white)] mb-4">
            Credits
          </h1>
          <p className="font-mono text-sm text-[var(--gs-gray-3)] leading-relaxed max-w-lg">
            GUNZscope is shaped by its community. These people gave their time, feedback, and ideas to make the experience better for everyone.
          </p>
        </div>

        {/* Contributors */}
        <div className="space-y-2">
          <p className="font-mono text-caption uppercase tracking-widest text-[var(--gs-gray-4)] mb-4">
            Contributors
          </p>
          {contributors.map((person) => (
            <div
              key={person.name}
              className="flex items-center justify-between p-4 border border-white/[0.06] bg-[var(--gs-dark-2)] transition-colors hover:border-[var(--gs-purple)]/30"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              <div className="flex items-center gap-2">
                {person.xHandle && (
                  <a
                    href={`https://x.com/${person.xHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors"
                    title={`@${person.xHandle}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {!person.xHandle && person.link && (
                  <a
                    href={person.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--gs-gray-3)] hover:text-[#9146FF] transition-colors"
                    title={person.name}
                  >
                    {/* Twitch icon */}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                    </svg>
                  </a>
                )}
                <span className="font-mono text-base text-[var(--gs-white)]">
                  {person.name}
                </span>
              </div>
              <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">
                {person.role}
              </span>
            </div>
          ))}
        </div>

        {/* Idea Contributors — auto-populated from completed feature requests */}
        {ideaContributors.length > 0 && (
          <div className="mt-12 space-y-2">
            <p className="font-mono text-caption uppercase tracking-widest text-[var(--gs-gray-4)] mb-4">
              Idea Contributors
            </p>
            {ideaContributors.map((person) => (
              <div
                key={person.name}
                className="flex items-center justify-between p-4 border border-white/[0.06] bg-[var(--gs-dark-2)] transition-colors hover:border-[var(--gs-lime)]/30"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                <span className="font-mono text-base text-[var(--gs-white)]">
                  {person.name}
                </span>
                <div className="flex items-center gap-4">
                  {person.netScore !== 0 && (
                    <span className={`font-mono text-caption tabular-nums ${person.netScore > 0 ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-loss)]'}`}>
                      {person.netScore > 0 ? '+' : ''}{person.netScore} votes
                    </span>
                  )}
                  <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">
                    {person.ideasShipped === 1 ? '1 idea shipped' : `${person.ideasShipped} ideas shipped`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA — nudges toward the Feature Requests page */}
        <div className="mt-16 p-6 border border-white/[0.06] bg-[var(--gs-dark-2)]">
          <p className="font-mono text-sm text-[var(--gs-gray-3)] leading-relaxed">
            Want to see your name here? Submit ideas on the{' '}
            <Link href="/feature-requests" className="text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors">
              Feature Requests
            </Link>{' '}
            page. The best feedback shapes what gets built next.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
