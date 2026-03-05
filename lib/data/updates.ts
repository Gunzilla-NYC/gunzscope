/**
 * Updates page data — single source of truth for the "What's New" page.
 *
 * Add new entries at the TOP of the array. Mark the latest with `tag: 'current'`.
 * Remove `tag: 'current'` from the previous entry when adding a new one.
 */

export interface UpdateEntry {
  version: string;
  date: string;
  tag?: string;
  title?: string;
  items: string[];
}

export const UPDATES: UpdateEntry[] = [
  {
    version: 'v0.7.1',
    date: 'Mar 5, 2026',
    tag: 'current',
    title: 'The wall is real now',
    items: [
      'The Early Access gate used to be a polite suggestion. A non-whitelisted wallet could connect, get a profile row created, browse around, and generally act like they owned the place. The server would shrug and let it happen. Now every authenticated route checks the whitelist before doing anything \u2014 API routes via JWT, page routes via session cookie. The bouncer finally showed up to work.',
      'Removing someone from the whitelist used to hard-delete the row. Gone. No record it ever existed. Re-adding them created a duplicate. Banning someone quietly erased the evidence they\u2019d been there at all \u2014 which is either a privacy feature or an oversight, depending on how generous you\u2019re feeling. Now removals are soft deletes. The history stays, the audit trail stays, and the data model stops gaslighting you.',
      'Four ghost profiles that snuck in before the gate existed have been cleaned up. One real user who got caught in the sweep was whitelisted properly, because we\u2019re thorough like that.',
    ],
  },
  {
    version: 'v0.7.0',
    date: 'Mar 5, 2026',
    title: 'Your NFTs now know they\u2019re special',
    items: [
      'You can now favorite NFTs directly from the gallery. A heart icon appears on hover \u2014 click it, and the item shows up in your Favorites tab in Account. It\u2019s basically a bookmark, but for JPEGs you paid real money for.',
      'Pinned favorites float to the top of your gallery. Found that one skin you keep scrolling past 200 items to find? Pin it. It\u2019ll be waiting at the top next time. Pins persist across sessions because we\u2019re not animals.',
      'The new Wishlist tab lets you track NFTs you don\u2019t own yet. Add any item from any collection, and we\u2019ll keep an eye on its price. Think of it as window shopping with a spreadsheet.',
      'Your account panel got a cleanup pass. Display names that were showing as "Anonymous" now fall back to your wallet address, which is at least more honest. Duplicate accounts from reconnecting the same wallet got merged quietly in the background.',
    ],
  },
  {
    version: 'v0.6.x',
    date: 'Mar 5, 2026',
    title: 'The versions you didn\u2019t see',
    items: [
      'A few releases shipped without changelog entries \u2014 fixes and infrastructure work that wasn\u2019t worth interrupting you for. v0.6.x covered the auth hardening: the Early Access gate moved from client-side checks to server-side enforcement, the whitelist got a proper database migration with soft deletes and a full audit trail, and the referral flow got a sanity pass. Nothing you\u2019d notice if it was working. You\u2019d only notice if it wasn\u2019t.',
    ],
  },
  {
    version: 'v0.5.4',
    date: 'Mar 4, 2026',
    title: 'We made it to Round 2. The charts got prettier to celebrate.',
    items: [
      'Your portfolio header now has a sparkline that shows how far above or below your cost basis you are over time. Green when you\u2019re winning, orchid purple when you\u2019re not. A dashed line at zero marks where you broke even \u2014 think of it as the emotional support line.',
      'The lollipop chart (yes, that\u2019s really what it\u2019s called) got gradient stems that fade from transparent at the bottom to full color where they meet the dot. Each acquisition venue gets its own color. Hover over a dot and a crosshair line now draws from it back to the Y\u2011axis, so you can actually read the cost without squinting.',
      'The Cost vs Value scatter plot learned some new tricks. Dots near break\u2011even get a white outline so you can spot them. The break\u2011even line label now rotates to follow the diagonal instead of sitting there horizontally like it doesn\u2019t know what angle means. And there\u2019s a dashed horizontal line marking the floor cluster \u2014 all those items trading for pocket change.',
      'Loss colors across the portfolio got a rebrand. Red is out, orchid purple is in. Turns out staring at red numbers all day was bad for morale. Purple feels more like "unrealized potential" and less like "the building is on fire."',
    ],
  },
  {
    version: 'v0.5.3',
    date: 'Mar 4, 2026',
    title: 'Under the hood, everything got faster',
    items: [
      'We ran a 40-item performance audit and parallelized every serial bottleneck we could find. API routes that used to fetch data one thing at a time now fetch in parallel. The leaderboard, price lookups, cron jobs, and on-chain RPC calls all got the same treatment. If it was waiting in line, it\u2019s not anymore.',
      'Six API routes now have Cache-Control headers, which means your browser and Vercel\u2019s CDN will serve cached responses instead of hitting the server every time. Price data refreshes every 30 seconds. NFT P&L data hangs around for a minute. This matters more than it sounds.',
      'The GUN price hook was rewritten to use SWR \u2014 automatic deduplication, background refresh, stale-while-revalidate. If three components ask for the price at the same time, one fetch happens. The other two get the cached result instantly.',
      'Four of the largest files in the codebase were decomposed into focused modules. AdminPanel went from 1,342 lines to 155. The brand page went from 1,682 to 195. The portfolio page now lazy-loads five heavy components so the initial render is just the shell and your data.',
    ],
  },
  {
    version: 'v0.5.2',
    date: 'Mar 2, 2026',
    title: 'Attestations got a face',
    items: [
      'Clicking "View" on an attestation used to dump 1,600 lines of raw JSON in your browser. Now it shows a proper page \u2014 wallet, value, item count, merkle root, the whole thing rendered like it belongs in the app. Because it does.',
      'The login modal was see-through enough that you could read the page behind it instead of the modal itself. Bumped the opacity. You can still tell it\u2019s a modal. You can also read it now.',
      'Text inputs no longer flash solid green when you paste something. Our selection color was set to "lime, full blast." Now it\u2019s a subtle tint.',
      'Public pages (/explore, attestation viewer) now have their own lightweight nav with Home + Onchain ID links instead of showing an empty navbar. Small thing, big difference when you\u2019re not logged in.',
    ],
  },
  {
    version: 'v0.5.1',
    date: 'Mar 2, 2026',
    title: 'Less clutter, more signal',
    items: [
      'Leaderboard, Scarcity, and Market now live under an "Experiments" dropdown instead of cluttering the nav bar. They\u2019re still experimental. The dropdown makes that clear without pretending otherwise.',
      'The "Explore" link is now "Onchain ID." Because that\u2019s what it actually is \u2014 your on\u2011chain identity, verified and attested. Naming things correctly turns out to be important.',
      'Autonomys attestation count in the tooltip was undercounting because newer attestations go through a different URL path. Fixed. Math is hard when your data has two front doors.',
    ],
  },
  {
    version: 'v0.5.0',
    date: 'Mar 2, 2026',
    title: 'The market page stopped hoarding data',
    items: [
      'The market page used to take 4\u20118 seconds on a cold load because it fetched things one at a time like a polite queue at the post office. Now it fetches in parallel. Noticeably faster.',
      'If you visit the market page before your portfolio, your NFTs now get instant floor prices from market data instead of looking up each one individually. Think of it as the market page leaving notes for your portfolio page. They\u2019re finally talking to each other.',
      'Token names are cached for 24 hours. Your second market load skips hundreds of name lookups entirely because \u2014 turns out \u2014 NFT names don\u2019t change after they\u2019re minted. Revolutionary insight.',
      'NFT detail now shows all available reference prices in an expandable list. Best estimate gets the spotlight, everything else lives behind a "show more" toggle. Because one number is a fact, three numbers is context.',
    ],
  },
  {
    version: 'v0.4.9',
    date: 'Mar 2, 2026',
    title: 'Plumbing',
    items: [
      'Backend fixes and internal tooling. Nothing you\u2019d notice. That\u2019s the point.',
    ],
  },
  {
    version: 'v0.4.8',
    date: 'Mar 1, 2026',
    title: 'Your MetaMask is not your gaming wallet',
    items: [
      'You can now attest any wallet you\u2019re tracking \u2014 not just the one paying for gas. Connect MetaMask, pick your in\u2011game wallet, hit attest. The on\u2011chain record shows the right address. Before this, it showed whoever signed the transaction, which was\u2026 not the point.',
      'Also fixed a bug where switching to Avalanche mid\u2011attestation could cause the transaction to fail because the block number came from a different RPC than the one actually sending the tx. The kind of bug that only shows up in production.',
    ],
  },
  {
    version: 'v0.4.7',
    date: 'Mar 1, 2026',
    title: 'Nothing is free, especially on\u2011chain',
    items: [
      'Attestations now cost 0.01\u00a0AVAX. Somebody has to pay for the block space. Your wallet shows the fee before you sign \u2014 no surprises, no hidden charges.',
      'When you look up your attestation on the block explorer, the metadata link now goes to gunzscope.xyz instead of some third\u2011party domain you\u2019ve never heard of. Same permanent storage underneath. Better front door.',
    ],
  },
  {
    version: 'v0.4.6',
    date: 'Mar 1, 2026',
    title: 'The chart was lying by omission',
    items: [
      'Your Cost vs Value chart quietly ignored every NFT that didn\u2019t have market data. No listings, no sales, no dot on the chart. Gone. Those NFTs still had GUN appreciation on their cards, but the chart pretended they didn\u2019t exist. Now they show up as hollow circles \u2014 positioned by how much GUN moved since you bought them.',
      'Filled dot = someone put a price on it. Hollow dot = GUN math only. Both turn green or red. If you own three of something, you get three dots, not one big one.',
      'The insights panel said "14 of 17 items" when it meant 14 of 22. Turns out a \u00d72 grouped card is two NFTs, not one. Counting is hard.',
    ],
  },
  {
    version: 'v0.4.5',
    date: 'Mar 1, 2026',
    title: 'Proof, but make it public',
    items: [
      'New /explore page \u2014 every portfolio attestation that hits C\u2011Chain shows up here. Wallets, GUN totals, timestamps, links to the actual transactions. No login required. Go see who\u2019s actually using this thing.',
      'Your attestation metadata now lives on decentralized storage permanently. The Merkle root sits on Avalanche, the full item list sits on Autonomys. Both verifiable. Both not going anywhere.',
    ],
  },
  {
    version: 'v0.4.4',
    date: 'Mar 1, 2026',
    title: 'Your portfolio just went on\u2011chain',
    items: [
      'On\u2011chain portfolio attestation \u2014 you can now stamp a cryptographic proof of your holdings onto Avalanche C\u2011Chain. It\u2019s in the share menu. Your portfolio, verified on\u2011chain, no trust required.',
      'Fixed a bug where buying multiple NFTs in one OpenSea transaction assigned the total price to every single item. If you bought 4 weapons for 6,590 GUN total, each one said it cost 6,590. Math was never our strong suit.',
    ],
  },
  {
    version: 'v0.4.3',
    date: 'Feb 28, 2026',
    title: 'Trial by referral',
    items: [
      'New trial access window \u2014 72 hours of full portfolio access including your referral link. Get 1 friend to sign up through your link within the trial and you keep access permanently.',
      'Expired trial users get a lower referral threshold than the regular waitlist. Early adopters shouldn\u2019t have to work as hard as everyone else.',
      'One trial per wallet. No infinite retries.',
    ],
  },
  {
    version: 'v0.4.2',
    date: 'Feb 28, 2026',
    title: 'Bad actors, meet the door',
    items: [
      'Banned users now see a clear "ACCESS REVOKED" page instead of silently re\u2011enrolling in the waitlist. If you\u2019re out, you know it.',
      'Fixed a bug where the wallet connection flow could get permanently stuck on "Choose Your Handle" \u2014 the Confirm button showed "..." forever because nobody told it to stop submitting. One\u2011liner fix.',
    ],
  },
  {
    version: 'v0.4.1',
    date: 'Feb 28, 2026',
    title: 'The hero section went to the gym',
    items: [
      'Redesigned the landing page hero \u2014 "YOUR OTG" is now a compact super\u2011label with a glowing purple accent, while the scramble word (Intelligence, Lore, Legacy, Edge) takes center stage at 104px. Bigger type, clearer hierarchy.',
      'New subtitle copy: "The tactical intelligence layer for Off The Grid. Start your legacy, analyze the market, dominate the meta."',
      'Cleaned up the CTA area \u2014 "Early access \u2014 whitelist only" sets expectations before the button.',
    ],
  },
  {
    version: 'v0.4.0',
    date: 'Feb 27, 2026',
    title: 'I could tell you, but then I\u2019d have to double legendary buzzkill you...',
    items: [],
  },
  {
    version: 'v0.3.9',
    date: 'Feb 27, 2026',
    title: 'Email users, meet the waitlist',
    items: [
      'You can now sign up with email \u2014 same waitlist, same referral flow, same 3\u2011friend threshold. Once you\u2019re in, connect a wallet to see your portfolio.',
      'The login button stopped doing the cha\u2011cha. Glitch text on hover no longer resizes the button \u2014 letters scramble, container stays put.',
      'SEO overhaul behind the scenes: every page now has proper metadata, we have a sitemap, and search engines can actually find us. Not that we were hiding.',
    ],
  },
  {
    version: 'v0.3.8',
    date: 'Feb 26, 2026',
    title: 'The waitlist stopped playing hard to get',
    items: [
      'Non\u2011whitelisted wallets now actually reach the waitlist page instead of bouncing back to the home screen. Turns out "join the waitlist" works better when the waitlist lets you in the door.',
      'Wallet address inputs across the site now share the same component \u2014 chain detection badge, validation hints, the works. Paste an EVM address, get a "GunzChain" badge. Paste a Solana address, get a "Solana" badge. Paste gibberish, get a gentle red nudge.',
      'Internal tooling got a layout pass \u2014 inputs, buttons, and address bars now line up properly across the board.',
    ],
  },
  {
    version: 'v0.3.7',
    date: 'Feb 23, 2026',
    title: 'The referral section learned to explain itself',
    items: [
      'Fixed "Failed to load referral data" showing a dead\u2011end error with no useful info. Now logs the actual HTTP status and server message to the console, so when something breaks you can see why instead of staring at a red wall.',
      'New /roadmap page with the on\u2011chain architecture overview. If you\u2019re curious where GUNZscope is headed, it\u2019s all there.',
    ],
  },
  {
    version: 'v0.3.6',
    date: 'Feb 22, 2026',
    title: 'The changelog got an accordion',
    items: [
      'The updates page is now collapsible. Latest version expanded by default, everything else tucked away behind a click. Because scrolling past 25 versions of patch notes to find the one you care about was getting old.',
      'Update entries moved to their own data file. Not something you\u2019ll notice, but it means we can add entries without touching the page layout. Separation of concerns \u2014 thrilling stuff.',
    ],
  },
  {
    version: 'v0.3.5',
    date: 'Feb 22, 2026',
    title: 'The card and the modal had a talk',
    items: [
      'Fixed a bug where the gallery card would cheerfully tell you your NFT lost 72% based on market data, while the modal for the same NFT claimed it had no idea what a market was. They now read from the same source. Progress.',
      'Rarity floor estimates no longer pretend to be market data. If all we have is a statistical guess based on what similar\u2011rarity items trade for, we say "Reference Estimate" instead of "Market Reality" \u2014 because calling a guess a fact was getting awkward.',
      'Gallery cards now only show the MARKET line when we have actual sales data to back it up. No more \u201199.4% MARKET\u201d based on vibes.',
    ],
  },
  {
    version: 'v0.3.4',
    date: 'Feb 22, 2026',
    title: 'Two truths and a portfolio',
    items: [
      'The NFT detail modal got a proper split personality. Track\u00a0A ("Your Deal") tells you how GUN\u2019s price movement treated your purchase \u2014 what you paid, what that GUN is worth today, and the unrealized P&L. Track\u00a0B ("Market Reality") tells you what the market actually thinks your item is worth based on real sales data. Both live in their own cards with big, impossible\u2011to\u2011miss P&L numbers. Because the truth deserves a spotlight, even when it\u2019s ugly.',
      'Cost basis is no longer floating alone above everything. It moved inside Track\u00a0A where it belongs \u2014 right above "Today\u2019s Value", so you read top\u2011to\u2011bottom: what you paid, what it\u2019s worth now, how that math worked out. Novel concept, reading order.',
      'Track\u00a0B now shows exactly how confident you should be in its estimate. A green dot, the tier label ("VIA\u00a0SALES", "FLOOR", etc.), sample count, and whether it\u2019s above or below floor. All the context to decide if the number is a real signal or a educated guess with a nice font.',
      'The "Observed Market Range" section that used to sit below the position card? Gone. It was information duplication dressed up as a feature. Track\u00a0B now handles all market context in a cleaner format.',
      'The /brand page moved behind a gate. Brand guidelines are internal \u2014 if you need them, you know where to find them.',
    ],
  },
  {
    version: 'v0.3.3',
    date: 'Feb 22, 2026',
    title: 'What would you actually get for this thing?',
    items: [
      'Each NFT now gets a Market Exit estimate \u2014 what someone might actually pay you, based on real sales data. It\u2019s the number that matters when you\u2019re thinking about selling.',
      'Six\u2011tier waterfall finds the best comparable price: your exact item \u2192 same name \u2192 same skin \u2192 same weapon \u2192 collection floor. Each tier shows its label so you know if it\u2019s a real signal or an educated guess.',
      'Recent sales weigh more than old ones. Last week counts double what three months ago does. Because 90\u2011day\u2011old crypto prices are basically fossils.',
      'Gallery cards now show the exit estimate below P&L. Small, subtle, honest.',
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
