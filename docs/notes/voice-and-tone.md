# Voice & Tone Guide — Changelog and Updates Pages

Two pages, two audiences, one personality.

## `/changelog` (Dev Log)

Technical, terse, implementation-focused.

- Bullet points describe WHAT changed at the code level: function names, file paths, algorithms, data structures
- Use Unicode non-breaking hyphens (`\u2011`) and non-breaking spaces (`\u00a0`) to prevent awkward line breaks
- No humor, no titles, no user-facing language. Just facts for developers
- Example: "Generation\u2011guarded enrichment \u2014 startEnrichment increments a generation counter; all state updates check gen === generationRef.current before writing"

## `/updates` (What's New)

User-facing, conversational, self-aware.

Each version gets a catchy `title` that's slightly irreverent (e.g., "Your 2000+ NFTs broke everything", "Turns out USD exists", "Two P&Ls walk into a modal\u2026")

### Voice Principles

- **Direct second-person**: "your NFTs", "you deserve to see", not "users can now"
- **Dry humor / subtle sarcasm**: deadpan observations, not LOL comedy. Self-deprecating about bugs we shipped ("It was broken. Now it's not.")
- **Plain English first**: translate technical concepts for humans ("Recent sales count more than old ones" not "time-weighted median with recency decay coefficients")
- **Short punchy sentences** mixed with longer explanations. Sentence fragments are fine.
- **Honest about limitations**: "Neither number alone tells the truth" is better than "comprehensive valuation system"
- **Conversational asides**: parenthetical remarks, em dashes for interruptions
- **No jargon**: avoid "waterfall", "enrichment pipeline", "cache invalidation" — describe what the user SEES, not how it works
- **Cultural references OK** but don't force them. Reference the game (OTG) naturally

### Anti-Patterns

- Never start with "We're excited to announce" or any corporate phrasing
- Never list features without explaining WHY the user should care
- Never use exclamation marks enthusiastically — sarcastic use only
- Never use emoji
- Don't explain implementation details — if users need to know it's "a six-tier waterfall", just say "we check six different sources"
