# Tiered Valuation Model Spec

## Core Principle
Quality (Common/Rare/Epic) is descriptive, NOT a price determinant.
Scarcity (mint count) drives value. Never group comparables by quality.

## Dual Track Pricing
Both tracks always shown — thin market means neither alone tells the full story.

**Track A — Purchase Power ("The Deal You Got")**
- "Spending 2,111 GUN today would cost $59.69 — you saved $15.81"
- Calculation: costBasisGUN × currentGunPrice vs costBasisGUN × gunPriceAtPurchase
- Always available when cost basis exists

**Track B — Market Exit ("What You'd Walk Away With")**
- "This item trades for ~592 GUN ($16.86). Market P&L: -$27.02"
- Calculation: estimatedSaleGUN × currentGunPrice vs costBasisUSD
- Available when waterfall produces a result

## Waterfall Tiers (narrowest → broadest)
1. **EXACT ITEM** — same tokenId sold before (min: 1 sale, confidence: exact)
2. **SAME ITEM** — same baseName, all mints (min: 2 sales, confidence: high)
3. **SAME SKIN** — same skinDesign, any weapon (min: 2 sales, confidence: medium-high)
4. **SAME WEAPON** — same weapon + type (min: 2 sales, confidence: medium)
5. **SIMILAR SCARCITY** — same scarcityBracket + type (min: 2 sales, confidence: low)
6. **COLLECTION FLOOR** — nuclear fallback (always available)

## Item Name Parsing
Skins follow: `{Skin Design} for the {Weapon}`
- "I'm Fine Skin for the Kestrel" → skinDesign: "I'm Fine Skin", weapon: "Kestrel"
- Parse: `/^(.+?)\s+for\s+the\s+(.+)$/i`

## Scarcity Brackets
- ultra-rare: 1–10 mints
- rare: 11–50 mints
- uncommon: 51–200 mints
- common: 200+ mints
- Supply estimate = MAX(mintNumber) observed per baseName

## Card Labels by Tier
EXACT | VIA SALES | VIA SKIN | VIA WEAPON | SIMILAR | FLOOR

## Time-Weighting Sales
- Last 7 days: 100% weight
- 7–30 days: 75% weight
- 30–90 days: 50% weight
- 90+ days: 25% weight
