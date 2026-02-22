# Git Push to Main — Post-Push Workflow

When pushing to `main`, Claude automatically runs these three steps.

## 1. Update `app/changelog/page.tsx`

Append a technical entry for this push:
- Date + version tag if bumped
- Bullet list of what changed (read the staged/pushed commits)
- Written in `/changelog` voice: terse, dev-focused (see `/docs/notes/voice-and-tone.md`)

## 2. Update `app/updates/page.tsx`

Append a user-facing entry:
- Same dry, sarcastic GUNZscope voice but slightly more polished
- Keep entries 1-3 sentences max per bullet
- Don't oversell fixes as features
- Reference actual user impact, not technical implementation

### Voice Examples

Good:
- "Fixed a bug where the card would cheerfully tell you your NFT lost 98.7% of its value based on vibes instead of actual sales data. The modal, meanwhile, claimed it had no idea what a market was. They now agree — progress."
- "Gallery cards no longer lie about market prices when all they have is a rarity floor guess."
- "One-line fix. You won't notice. That's the point."

Bad (corporate):
- "Enhanced the valuation pipeline with improved data consistency across view layers"
- "Streamlined the market data flow for a more seamless user experience"

### Word Choice
- Use: "fixed", "added", "broke less things than last time", "turns out", "because"
- Avoid: "enhanced", "leveraged", "streamlined", "exciting", "pleased to announce"

## 3. Version Bump Evaluation

| Change Type | Bump | Example |
|------------|------|---------|
| Bug fixes only | patch (0.x.X) | Fixed card/modal data mismatch |
| New feature or significant UX | minor (0.X.0) | Dual-track P&L redesign |
| Breaking / major milestone | major (X.0.0) | Pre-v1.0, unlikely for now |
| Typo / config only | skip | README edit |

Update version in:
- `components/ui/VersionBadge.tsx` (`APP_VERSION` constant)
- `components/Navbar.tsx` (version comment in early access badge, if it exists)

## Trigger

Activates when user says "push to main", "push it", or runs `git push origin main`.
