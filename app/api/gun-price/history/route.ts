import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GUN_ATH_USD } from '@/lib/pricing/resolveHistoricalGunPrice';

// =============================================================================
// Validation
// =============================================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SOURCES = ['coingecko', 'defillama'] as const;
const VALID_CONFIDENCES = ['exact', 'daily'] as const;

/** Confidence rank — lower is better (more trustworthy). */
const CONFIDENCE_RANK: Record<string, number> = {
  exact: 1,
  daily: 2,
  estimated: 3,
};

// =============================================================================
// GET /api/gun-price/history?date=YYYY-MM-DD
// Public — no auth needed (GUN prices are global data)
// =============================================================================

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');

  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json(
      { found: false, error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 },
    );
  }

  try {
    const entry = await prisma.gunPriceHistory.findUnique({
      where: { date },
    });

    if (!entry) {
      return NextResponse.json(
        { found: false },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        },
      );
    }

    return NextResponse.json(
      {
        found: true,
        priceUsd: entry.priceUsd,
        source: entry.source,
        confidence: entry.confidence,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('Error reading gun price history:', error);
    return NextResponse.json(
      { found: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/gun-price/history
// Public — any client can contribute confirmed prices (heavily validated)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, priceUsd, source, confidence } = body;

    // --- Validate date ---
    if (!date || typeof date !== 'string' || !DATE_RE.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    // --- Validate priceUsd ---
    if (typeof priceUsd !== 'number' || priceUsd <= 0) {
      return NextResponse.json(
        { error: 'priceUsd must be a positive number.' },
        { status: 400 },
      );
    }

    // ATH guard — reject obviously wrong values
    if (priceUsd > GUN_ATH_USD * 1.1) {
      return NextResponse.json(
        { error: `priceUsd exceeds ATH guard ($${(GUN_ATH_USD * 1.1).toFixed(4)}).` },
        { status: 400 },
      );
    }

    // --- Validate source ---
    if (!VALID_SOURCES.includes(source as typeof VALID_SOURCES[number])) {
      return NextResponse.json(
        { error: `source must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 },
      );
    }

    // --- Validate confidence ---
    if (!VALID_CONFIDENCES.includes(confidence as typeof VALID_CONFIDENCES[number])) {
      return NextResponse.json(
        { error: `confidence must be one of: ${VALID_CONFIDENCES.join(', ')}` },
        { status: 400 },
      );
    }

    // --- Confidence-based upgrade logic ---
    const existing = await prisma.gunPriceHistory.findUnique({
      where: { date },
    });

    if (existing) {
      const existingRank = CONFIDENCE_RANK[existing.confidence] ?? 99;
      const newRank = CONFIDENCE_RANK[confidence] ?? 99;

      // Only overwrite if new confidence is equal or better
      if (newRank > existingRank) {
        return NextResponse.json({
          updated: false,
          reason: `Existing entry has better confidence (${existing.confidence} vs ${confidence}).`,
        });
      }
    }

    // --- Upsert ---
    const result = await prisma.gunPriceHistory.upsert({
      where: { date },
      update: { priceUsd, source, confidence },
      create: { date, priceUsd, source, confidence },
    });

    return NextResponse.json({
      updated: true,
      date: result.date,
      priceUsd: result.priceUsd,
      source: result.source,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Error writing gun price history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
