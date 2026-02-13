import Link from 'next/link';
import StaticPageNav from '@/components/StaticPageNav';
import Footer from '@/components/Footer';
import prisma from '@/lib/db';

interface Contributor {
  name: string;
  role: string;
  xHandle?: string;
}

const contributors: Contributor[] = [
  { name: 'meatport', role: 'Feedback & Testing', xHandle: 'meatportgg' },
];

/** Fetch distinct authors whose feature requests were completed. */
async function getIdeaContributors(): Promise<{ name: string; count: number }[]> {
  const completed = await prisma.featureRequest.findMany({
    where: { status: 'completed' },
    select: {
      author: { select: { displayName: true } },
    },
  });

  // Group by author name and count completed ideas
  const counts = new Map<string, number>();
  for (const r of completed) {
    const name = r.author.displayName || 'Anonymous';
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const dynamic = 'force-dynamic';

export default async function CreditsPage() {
  const ideaContributors = await getIdeaContributors();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gs-black)] text-[var(--gs-white)] overflow-x-hidden">
      <div className="grid-bg" />
      <div className="scanlines" />

      <StaticPageNav />

      {/* Spacer for fixed nav */}
      <div className="h-16" />

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
                <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">
                  {person.count === 1 ? '1 idea shipped' : `${person.count} ideas shipped`}
                </span>
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
