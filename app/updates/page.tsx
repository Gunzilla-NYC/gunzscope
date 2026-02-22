import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// =============================================================================
// Public-facing update log — user-friendly language, no implementation details.
// Internal dev changelog lives at /changelog.
// =============================================================================

interface UpdateEntry {
  version: string;
  date: string;
  tag?: string;
  title?: string;
  items: string[];
}

const UPDATES: UpdateEntry[] = [
  {
    version: 'v0.3.4',
    date: 'Feb 22, 2026',
    tag: 'current',
    title: 'Two truths and a portfolio',
    items: [
      'The NFT detail modal got a proper split personality. Track\u00a0A ("Your Deal") tells you how GUN\u2019s price movement treated your purchase \u2014 what you paid, what that GUN is worth today, and the unrealized P&L. Track\u00a0B ("Market Reality") tells you what the market actually thinks your item is worth based on real sales data. Both live in their own cards with big, impossible\u2011to\u2011miss P&L numbers. Because the truth deserves a spotlight, even when it\u2019s ugly.',
      'Cost basis is no longer floating alone above everything. It moved inside Track\u00a0A where it belongs \u2014 right above "Today\u2019s Value", so you read top\u2011to\u2011bottom: what you paid, what it\u2019s worth now, how that math worked out. Novel concept, reading order.',
      'Track\u00a0B now shows exactly how confident you should be in its estimate. A green dot, the tier label ("VIA\u00a0SALES", "FLOOR", etc.), sample count, and whether it\u2019s above or below floor. All the context to decide if the number is a real signal or a educated guess with a nice font.',
      'The "Observed Market Range" section that used to sit below the position card? Gone. It was information duplication dressed up as a feature. Track\u00a0B now handles all market context in a cleaner format.',
      'The /brand page is now admin\u2011only. If you\u2019re not an admin wallet, you get redirected to the homepage. Nothing personal \u2014 the brand guidelines just aren\u2019t for everyone.',
    ],
  },
  {
    version: 'v0.3.3',
    date: 'Feb 22, 2026',
    title: 'What would you actually get for this thing?',
    items: [
      'Every NFT now has two price stories. Track\u00a0A (the one you already know) tells you how GUN\u2019s price movement affected your purchase. Track\u00a0B is new \u2014 it estimates what someone might actually pay you right now, based on real sales data. Neither number alone tells the truth in a market this thin. Together they\u2019re\u2026 less wrong.',
      'Track\u00a0B uses a six\u2011tier waterfall to find the best comparable price. First it checks if your exact item has sold before. Then similar items. Then items with the same skin. Then same weapon type. Then, if all else fails, collection floor. Each tier shows its source label so you know exactly how confident to be \u2014 "EXACT" means someone literally sold yours before, "FLOOR" means we\u2019re basically guessing.',
      'Recent sales count more than old ones. A sale from last week matters twice as much as one from three months ago. Because a price from 90 days ago in crypto is basically ancient history.',
      'Gallery cards now show the Market Exit estimate below P&L \u2014 something like "~592\u00a0GUN \u00b7 VIA\u00a0SALES". It\u2019s small. It\u2019s subtle. It\u2019s the number that matters when you\u2019re actually thinking about selling.',
      'The NFT detail modal got a fourth stats column: Market Exit. Shows the estimated sale price in both GUN and USD, which waterfall tier produced it, and P&L against your cost basis. All the context you need to decide if that sell button is worth clicking.',
    ],
  },
  {
    version: 'v0.3.2',
    date: 'Feb 21, 2026',
    title: 'Your 2000+ NFTs broke everything',
    items: [
      'Enrichment used to start before all your NFTs were loaded. Every page of 50 kicked off its own pass, and they\u2019d fight over the screen like toddlers with one crayon. Now it waits for the full collection first.',
      'Switching wallets mid\u2011enrichment used to leave ghost data from the old wallet haunting your screen. Now stale enrichments just\u2026 cease to exist. As they should.',
      'Console now dumps a diagnostic report after enrichment. Open DevTools if you dare to see how incomplete your data actually is.',
      'Refresh used to nuke your entire cache from orbit. Now it only clears listing prices. Your purchase history survives.',
    ],
  },
  {
    version: 'v0.3.1',
    date: 'Feb 21, 2026',
    title: 'Your portfolio remembers things now',
    items: [
      'Historical GUN prices are now stored on the server. The first person who loads a date\u2019s price saves it for everyone else. No more every\u2011user\u2011for\u2011themselves CoinGecko race.',
      'Price lookups got a new middle step \u2014 before bugging CoinGecko or DefiLlama, we check if anyone else already looked up that date. If they did, you get the answer instantly. If they didn\u2019t, you still do, and then we save it for the next person.',
      'Your portfolio header now shows when it was last synced from the server. "Synced 2m ago" or "Synced 3d ago" \u2014 so you know if you\u2019re looking at fresh data or last week\u2019s leftovers.',
      'Manual refresh button next to the sync timestamp. Click it to clear your local cache and re\u2011fetch everything from chain. The button spins while enrichment runs, because we\u2019re fancy like that.',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'Feb 21, 2026',
    title: 'Two P&Ls walk into a modal\u2026',
    items: [
      'Your NFT now has two profit stories instead of one confused mess. When we have actual market data (listings, sales, floors), the headline shows what someone might actually pay you. GUN token appreciation gets its own little corner underneath, with a sentence explaining what happened in plain English. You\u2019re welcome.',
      'The Unrealized number in the top stats bar and the P&L in YOUR POSITION now always agree. Previously they were computing two different things and hoping you wouldn\u2019t notice. You noticed.',
      'Every P&L now comes with a label \u2014 VIA LISTING, VIA SALES, VIA FLOOR, or GUN \u0394 \u2014 so you can stop wondering which tea leaves we\u2019re reading.',
      'Gallery cards now have valuation badges: LISTED, SALES, RARITY, FLOOR, COST, or UNLISTED. Think of it as a honesty indicator for how real that number actually is.',
      'Stopped asking CoinGecko for historical prices we already knew. The enrichment pipeline had the answer. The modal was ignoring it and asking again anyway, like a toddler who doesn\u2019t like the first answer.',
    ],
  },
  {
    version: 'v0.2.9',
    date: 'Feb 21, 2026',
    title: 'P&L that actually makes sense now',
    items: [
      'P&L is now based purely on GUN price movement \u2014 what you paid in GUN, times the difference between then-price and now-price. No more mystery waterfall of floor prices, comparable sales, and vibes. Just math.',
      'Removed the "vs listing" / "vs sales" / "vs floor" labels from NFT cards. One number. One truth. Less confusion.',
      'Fixed a fun bug where OpenSea was telling us sale dates were in January 1970. Turns out Unix timestamps in seconds and milliseconds are different things. Who knew. (We do now.)',
      'Your NFT detail modal was quietly overwriting correct price data about one second after opening. It had the right answer, then threw it away and guessed again. Fixed.',
      'Transferred NFTs now show when the original purchase happened, not when your buddy sent it to you at 3am',
      'Gas fees are now visible in the YOUR POSITION section \u2014 because yes, you did pay for that transaction, and you deserve to see exactly how much',
      'Purged a bunch of stale cached prices that were stuck at $0.0776 (the GUN launch price). If your whole portfolio looked suspiciously cheap, it should look correct now',
      'Added a sanity check that rejects any historical GUN price above $0.12. If CoinGecko says your NFT cost $47 in GUN, we politely disagree',
      'MetaMask users on the home page: the connect button actually opens MetaMask now instead of staring at you blankly',
      'wGUN (wrapped GUN) purchases are now properly tracked for cost basis \u2014 OpenSea offer fills no longer show up as free items',
    ],
  },
  {
    version: 'v0.2.8',
    date: 'Feb 19, 2026',
    title: 'Turns out USD exists',
    items: [
      'USD cost basis now actually shows up on all items. Previously the lookup was failing silently, so half your portfolio just shrugged and showed GUN only. Helpful.',
      'Acquisition cards got a facelift \u2014 USD is now the big number, GUN lives underneath. Because most humans think in dollars, not in-game tokens. Revolutionary concept.',
      'Portfolio chart stretches to 14 days now. Seven days felt like checking your portfolio with one eye closed.',
      'Empty wallets no longer stare at you with a blank $0.00 dashboard. You get a search bar and some links instead. At least you can look up someone richer.',
      'Chart tooltip used to be permanently stuck at the bottom of the chart like it was afraid of heights. Now it follows the data point.',
      'Marketplace purchases that cached with no price used to just\u2026 stay wrong forever. Now they get retried. Imagine that.',
      'More items catalogued \u2014 Pioneer Set, Player Zero, Prankster Set and friends now have proper origin badges',
    ],
  },
  {
    version: 'v0.2.7',
    date: 'Feb 18, 2026',
    title: 'We know where your stuff came from',
    items: [
      'Item origins expanded to 35+ releases. Enforcer, Pink Fury, Mr Fuckles, Mad Biker, Hopper Pilot, Trick Treat or Die, Neotokyo \u2014 we\u2019re cataloguing everything like obsessive librarians.',
      'Battle pass items and event rewards that cost basically nothing now say "AIRDROP" instead of "0 GUN". Because "0 GUN" made it look like a bug. It was, but now it\u2019s a feature.',
      'Halloween items got their real event name back \u2014 "Trick, Treat or Die" instead of the very creative "Halloween"',
      'Don DeLulu and Mrs Crackhead Santa were slipping through the name matcher. They\u2019re caught now. Nowhere to hide.',
      'New loading screen quips. We won\u2019t spoil them here.',
    ],
  },
  {
    version: 'v0.2.6',
    date: 'Feb 18, 2026',
    title: 'The search bar got smarter than us',
    items: [
      'The search bar now tells you in real time if your address is GunzChain or Solana, and whether it\u2019s even valid. No more pasting garbage and wondering why nothing loads.',
      'Watch and Portfolio buttons moved to the wallet bar where they make sense. Previously they were floating above the search results like lost tourists.',
      'Started building a database of every Battle Pass, Content Pack, and Event release. Your NFTs now know their own backstory.',
      'Wallet dropdown got a darker background so it stops blending into the abyss behind it',
    ],
  },
  {
    version: 'v0.2.5',
    date: 'Feb 18, 2026',
    title: 'Patience is a virtue we removed',
    items: [
      'Portfolio loads faster \u2014 charts and gallery now load on demand instead of all dumping into the page at once like an overturned filing cabinet',
      'Switching wallets quickly no longer shows you the previous wallet\u2019s data. Turns out people don\u2019t enjoy seeing someone else\u2019s portfolio flash before their eyes.',
      'NFT cards now stagger-animate in when the gallery loads. Purely cosmetic. Entirely necessary.',
      'Chart tabs respond to keyboard navigation. Accessibility: we\u2019re trying.',
    ],
  },
  {
    version: 'v0.2.4',
    date: 'Feb 17, 2026',
    title: 'A line that reminds you that you shouldn\u2019t have crossed it',
    items: [
      'Dashed cost basis line on the portfolio chart. Now you can see how much you actually spent next to how much it\u2019s currently worth. Emotional damage, visualized.',
      'Chart dots fade in as your NFTs load, like little data stars being born. Before this they just appeared all at once. No drama.',
    ],
  },
  {
    version: 'v0.2.3',
    date: 'Feb 17, 2026',
    title: 'Flex on your friends (literally)',
    items: [
      'Portfolio share card redesigned \u2014 tactical HUD style showing GUN balance, NFT count, and cost basis. It looks cool. We\u2019re not sorry.',
      'Download your portfolio card as a PNG. For X, Discord, your refrigerator, wherever.',
      'Shared portfolio links now include cost basis data. Your friends can see what you\u2019re really working with.',
      'Chart zoom fixed \u2014 dots no longer yeet themselves off the visible area when you scroll',
      'Shift+scroll zooms toward your cursor instead of the chart center. Small thing. Big satisfaction.',
      'Gallery scrolls faster with large collections. If you own 200+ skins you deserve a smooth experience.',
      'NFT prices pop in faster during enrichment. The loading bar still takes a minute but the numbers show up sooner.',
    ],
  },
  {
    version: 'v0.2.2',
    date: 'Feb 17, 2026',
    title: 'Math is hard (multi-wallet edition)',
    items: [
      'Smooth crossfade between chart views instead of the content just vanishing and reappearing.',
      'Multi-wallet NFT count was not, in fact, counting all the wallets. It is now. Addition.',
      'Gallery count includes duplicates. If you own 3 of the same skin, that\u2019s 3 versus 1. Joker would be proud.',
      'Holdings breakdown got a cleaner layout. Less visual noise, same data.',
      'Wallet dropdown got spring animations because static dropdowns are for banks.',
    ],
  },
  {
    version: 'v0.2.1',
    date: 'Feb 17, 2026',
    title: 'Everything bounces now',
    items: [
      'Spring-physics animations on every panel, modal, and drawer. The whole UI feels like it has a pulse instead of just snapping into existence.',
      'Custom green arrow cursor across the entire site. You\u2019re in a tactical scope. Act accordingly.',
      'Wallet switcher and share icons stay highlighted while their panels are open. Sounds obvious. Wasn\u2019t happening before.',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'Feb 16, 2026',
    title: 'We see your offers now',
    items: [
      'NFTs bought via OpenSea offers now show their actual purchase price. Previously these showed up as mysterious free acquisitions.',
      'Offer fills display "OpenSea (Offer)" as the source. Transparency is the new flex.',
    ],
  },
  {
    version: 'v0.1.9',
    date: 'Feb 16, 2026',
    title: 'Went on a diet',
    items: [
      'Removed 15 unused libraries. The bundle lost weight. Your load times will thank us.',
      'Charts, modals, and heavy components only load when you actually need them. Lazy loading \u2014 finally, a work ethic that matches our personality.',
      'Images serve in AVIF on supported browsers. Smaller files, same pixels. Science.',
    ],
  },
  {
    version: 'v0.1.8',
    date: 'Feb 16, 2026',
    title: 'Now with an actual marketplace',
    items: [
      'New Market page \u2014 browse every active OpenSea listing for OTG items with search and direct buy links. Window shopping, but for NFTs.',
      'Scarcity page leveled up with quality badges, "Best Deal" sorting, and price range filters. Finding underpriced items just got easier.',
      'Listing coverage tripled to 3,000 items. We\u2019re pulling basically everything OpenSea has.',
      'P&L chart got gradients and smarter axis labels. Charts should be beautiful. We don\u2019t make the rules.',
    ],
  },
  {
    version: 'v0.1.7',
    date: 'Feb 15, 2026',
    title: 'Dots that actually mean something',
    items: [
      'Acquisition Timeline chart with better Y-axis distribution. Dots no longer pile on top of each other like a mosh pit.',
      'Dots appear on the chart in real time as enrichment discovers them. Previously you had to wait for everything to finish before seeing anything. Patience is overrated.',
      'Portfolio sparkline stopped having an existential crisis on page reloads.',
    ],
  },
  {
    version: 'v0.1.6',
    date: 'Feb 14, 2026',
    title: 'Valentine\u2019s Day: share your bags',
    items: [
      'Share your portfolio on X or Discord with a rich preview card. Finally, a socially acceptable way to flex your NFT collection.',
      'Better valuations \u2014 per-item listings, comparable sales, and rarity-tier floors. Three ways to feel good (or bad) about what you paid.',
      'New insight cards: unrealized P&L, most valuable item, biggest loss. The full emotional spectrum in one dashboard.',
      'Acquisition Timeline and P&L Scatter Plot now live on the main portfolio view. More charts. Always more charts.',
    ],
  },
  {
    version: 'v0.1.5',
    date: 'Feb 14, 2026',
    title: 'P&L charts & democracy',
    items: [
      'NFT valuation waterfall: per-item listings, rarity floors, comparable sales \u2014 multiple opinions on what your stuff is worth',
      'Cost basis vs market value, side by side. The "how much did I spend vs how much is it worth" reality check.',
      'Per-item P&L with interactive charts. Click around. Cry a little. It\u2019s fine.',
      'Feature request system is live \u2014 submit ideas, vote on others, attach screenshots. Democracy for a portfolio tracker.',
      'Browse any wallet with ?address= links. No login required. Perfect for stalking.',
      'Multi-wallet portfolio \u2014 combine all your wallets into one summary. For those of us who can\u2019t commit to a single address.',
    ],
  },
  {
    version: 'v0.1.4',
    date: 'Feb 13, 2026',
    title: 'Pretty loading, helpful text',
    items: [
      'New scramble-decode loading animation. Looks like a hacker terminal from a movie. We\u2019re very proud of it.',
      'NFT Holdings sparkline toggle. Tiny charts inside your portfolio. Charts within charts. Chartception.',
      'Wallet address help panel for people who just want to know where to find their address. We get it. It\u2019s confusing.',
    ],
  },
  {
    version: 'v0.1.3',
    date: 'Feb 12, 2026',
    title: 'Colors that mean things',
    items: [
      'NFT sparkline with historical hover counts. Little charts that follow your mouse. Very satisfying.',
      'Grouped NFTs now glow with dynamic rarity accent colors. Epic is purple. Rare is blue. Common is gray. You\u2019ll figure it out.',
      'Fixed decode cost extraction for relayer transactions. If you don\u2019t know what that means, good. It was broken. Now it\u2019s not.',
    ],
  },
  {
    version: 'v0.1.2',
    date: 'Feb 11, 2026',
    title: 'Vibes (the background kind)',
    items: [
      'Ambient portfolio sparkline lives in the background now. Subtle. Atmospheric. Possibly unnecessary. Definitely staying.',
      'Portfolio auto-loads when you connect your wallet. No more clicking "Load" like it\u2019s 2003.',
      'Wallet identity bar got a redesign. Cleaner. More tactical. Less "default Bootstrap."',
      'SEO metadata on all pages. Google can find us now. Whether it wants to is another question.',
    ],
  },
  {
    version: 'v0.1.1',
    date: 'Feb 10, 2026',
    title: 'We added a chaos toggle',
    items: [
      'Insanity Mode. Toggle it. Cards go angular. Vibes go unhinged. You either love it or you don\u2019t.',
      'Email authentication. For people who prefer passwords over seed phrases. We respect that.',
      'Scarcity page improvements. More data. Better sorting. Still no guarantees your items are worth anything.',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Feb 9, 2026',
    title: 'Tell us what you want',
    items: [
      'Feature request system. Submit ideas, vote on others. We actually read these.',
      'Leaderboard page \u2014 see who\u2019s holding the most OTG items. Comparison is the thief of joy, but here we are.',
      'Wallet connect flow got styled. It no longer looks like a placeholder from a hackathon.',
    ],
  },
  {
    version: 'v0.0.3',
    date: 'Feb 5\u20138, 2026',
    title: 'The boring but important one',
    items: [
      'Multi-wallet architecture \u2014 portfolio context, hooks, the whole plumbing. Not glamorous. Very necessary.',
      'Marketplace price enrichment pipeline. We ask OpenSea what you paid. Sometimes it even answers correctly.',
      'WaffleChart for portfolio composition. Because pie charts are for measuring pies and figuring out how much pizza is left. Never use pie charts. Just don\u2019t.',
    ],
  },
  {
    version: 'v0.0.2',
    date: 'Jan 31 \u2013 Feb 1, 2026',
    title: 'Now with actual numbers',
    items: [
      'NFT P&L tracking with historical prices. See what your items were worth when you bought them vs now. Sorry in advance.',
      'Rarity filter pills in the gallery. Click a pill, see only that rarity. Simple. Effective. Satisfying.',
      'YOUR POSITION section in the NFT detail view. A dedicated space for confronting your financial decisions.',
      'Floor price enrichment and caching. Prices update in the background and stick around between visits.',
    ],
  },
  {
    version: 'v0.0.1',
    date: 'Jan 19\u201322, 2026',
    tag: 'initial',
    title: 'Day zero',
    items: [
      'GUNZscope exists. Multi-chain portfolio tracker for Off The Grid. It\u2019s real. It works. Mostly.',
      'NFT Armory with weapon compatibility checking. Find out if your attachments actually fit before you embarrass yourself in-game.',
      'Acquisition tracking from raw blockchain data. We read every transaction so you don\u2019t have to.',
      'OpenSea and in-game marketplace integration. Two marketplaces. One dashboard. Zero excuses.',
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

function UpdateBlock({ entry, isFirst }: { entry: UpdateEntry; isFirst: boolean }) {
  const isInitial = entry.tag === 'initial';
  const isCurrent = entry.tag === 'current';

  return (
    <section className="relative">
      {/* Version header */}
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-display font-bold text-lg uppercase text-[var(--gs-white)]">
          {entry.version}
        </h2>
        {isCurrent && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06]">
            Latest
          </span>
        )}
        {isInitial && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
            Genesis
          </span>
        )}
      </div>
      {entry.title && (
        <p className="font-body text-sm text-[var(--gs-white)]/80 mb-2">{entry.title}</p>
      )}
      <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-4">
        {entry.date}
      </p>

      {/* Items */}
      <ul className="space-y-2">
        {entry.items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[var(--gs-gray-4)] leading-relaxed font-body">
            <span
              className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isFirst ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpdatesContent() {
  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <h1 className="font-display font-bold text-3xl uppercase mb-2">What&rsquo;s New</h1>
        <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mb-2">
          Early Access &middot; Updated regularly
        </p>
        <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed mb-12">
          GUNZscope ships updates frequently. Here&rsquo;s what&rsquo;s changed.
          Got an idea?{' '}
          <a href="/feature-requests" className="text-[var(--gs-purple)] hover:text-[var(--gs-lime)] transition-colors underline underline-offset-2">
            Request a feature
          </a>.
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent"
            aria-hidden="true"
          />

          <div className="space-y-10 pl-6">
            {UPDATES.map((entry, i) => (
              <UpdateBlock key={entry.version} entry={entry} isFirst={i === 0} />
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--gs-gray-2)]">
            Built for the Off The Grid community &middot; Not affiliated with GUNZILLA Games
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function UpdatesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <UpdatesContent />
    </Suspense>
  );
}
